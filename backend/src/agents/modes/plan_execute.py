"""Plan-and-Execute Agent Mode - 先计划后执行."""
from __future__ import annotations

import logging
from typing import Any, Optional

from ..config_models import AgentConfig, AgentModeConfig
from ..nodes import LLMNode

logger = logging.getLogger(__name__)


class PlanStep:
    """计划步骤."""

    def __init__(self, id: int, description: str, status: str = "pending"):
        self.id = id
        self.description = description
        self.status = status  # pending / executing / completed / failed
        self.result: Any = None

    def __repr__(self):
        return f"<PlanStep {self.id}: {self.description} [{self.status}]>"


class PlanExecuteAgent:
    """
    Plan-and-Execute Agent.

    执行流程:
    1. 计划阶段: 将复杂目标分解为多个步骤
    2. 执行阶段: 依次执行每个步骤，收集结果
    3. 报告阶段: 汇总所有结果生成最终回答

    特点:
    - 先规划再执行，适合多步骤复杂任务
    - 支持执行中途重规划
    - 步骤级错误处理，不因单步失败整体崩溃
    """

    name = "plan_and_execute"
    description = "Plan-Execute模式: 先将目标分解为步骤计划，再依次执行，适合多步骤复杂任务"

    def __init__(self, config: AgentConfig):
        self.config = config
        self.mode_config: AgentModeConfig = config.mode
        self.prompt_config = config.prompt
        self.llm_config = config.llm

        self.max_iterations = self.mode_config.max_iterations
        self.early_stopping = self.mode_config.early_stopping

        self._tools: dict[str, Any] = {}

    def register_tool(self, name: str, tool: Any):
        self._tools[name] = tool

    async def run(self, user_input: str, context: Optional[dict] = None) -> dict:
        """
        执行 Plan-and-Execute 流程.

        Args:
            user_input: 用户目标描述
            context: 额外上下文

        Returns:
            包含 response, plan, steps, results 等字段的字典
        """
        context = context or {}

        # ---- Phase 1: Planning ----
        plan = await self._planning_phase(user_input, context)
        if not plan:
            return {
                "response": "无法生成有效的执行计划。",
                "plan": [],
                "steps": [],
                "results": [],
            }

        # ---- Phase 2: Execution ----
        results = await self._execution_phase(plan, user_input, context)

        # ---- Phase 3: Reporting ----
        final_response = await self._reporting_phase(user_input, plan, results, context)

        return {
            "response": final_response,
            "plan": [{"id": s.id, "description": s.description, "status": s.status} for s in plan],
            "steps": [
                {
                    "id": s.id,
                    "description": s.description,
                    "status": s.status,
                    "result": s.result,
                }
                for s in plan
            ],
            "results": results,
        }

    async def _planning_phase(self, objective: str, context: dict) -> list[PlanStep]:
        """计划阶段: LLM 分解目标为步骤."""
        system_prompt = self._build_planning_prompt()

        planning_messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"目标: {objective}"},
        ]

        llm_node = LLMNode(
            model=self.llm_config.model,
            prompt_template=system_prompt,
            temperature=0.3,  # 规划时用低温
            max_tokens=2048,
        )

        llm_messages = llm_node._build_messages(system_prompt, context, planning_messages[1:])
        raw_response = await llm_node._call_llm(llm_messages)

        # 解析步骤
        steps = self._parse_steps(raw_response)
        logger.info(f"Plan generated with {len(steps)} steps")
        return steps

    def _build_planning_prompt(self) -> str:
        """构建规划提示."""
        parts = []

        if self.prompt_config.system:
            parts.append(self.prompt_config.system)

        parts.append("\n\n你是任务规划专家。")
        parts.append("请将用户目标分解为具体的执行步骤。")
        parts.append("步骤应该清晰、可执行、有序。")

        if self._tools:
            tool_list = ", ".join(f"'{name}'" for name in self._tools.keys())
            parts.append(f"\n可用工具: {tool_list}")

        parts.append("\n\n请按以下格式输出步骤（每行一个步骤）：")
        parts.append("1. 第一步的描述")
        parts.append("2. 第二步的描述")
        parts.append("...")

        return "\n".join(parts)

    def _parse_steps(self, text: str) -> list[PlanStep]:
        """从 LLM 输出解析计划步骤."""
        steps = []
        lines = text.strip().split("\n")

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # 匹配 "1. xxx" 或 "1.xxx" 格式
            import re
            match = re.match(r"^\d+[.、)]\s*(.+)", line)
            if match:
                description = match.group(1).strip()
                steps.append(PlanStep(id=len(steps) + 1, description=description))

        return steps

    async def _execution_phase(
        self, plan: list[PlanStep], objective: str, context: dict
    ) -> list[Any]:
        """执行阶段: 依次执行每个步骤."""
        results = []

        for step in plan:
            if step.status == "completed":
                continue

            step.status = "executing"
            logger.info(f"Executing step {step.id}: {step.description}")

            try:
                result = await self._execute_step(step, objective, context)
                step.result = result
                step.status = "completed"
                results.append(result)
            except Exception as e:
                logger.exception(f"Step {step.id} failed: {e}")
                step.status = "failed"
                step.result = f"执行失败: {str(e)}"
                results.append(step.result)

                if self.early_stopping:
                    logger.info("Early stopping due to step failure")
                    break

        return results

    async def _execute_step(self, step: PlanStep, objective: str, context: dict) -> str:
        """执行单个步骤."""
        # 构建执行提示
        exec_prompt = f"""你正在执行以下任务步骤:

目标: {objective}

当前步骤: {step.description}

请执行这个步骤并给出结果。如果需要使用工具，请调用相应工具。"""

        if self._tools:
            tool_list = ", ".join(f"'{name}'" for name in self._tools.keys())
            exec_prompt += f"\n\n可用工具: {tool_list}"
            exec_prompt += "\n\n请给出该步骤的执行结果或调用工具。"

        messages = [
            {"role": "system", "content": exec_prompt},
            {"role": "user", "content": f"执行步骤: {step.description}"},
        ]

        llm_node = LLMNode(
            model=self.llm_config.model,
            prompt_template=exec_prompt,
            temperature=self.llm_config.temperature,
            max_tokens=self.llm_config.max_tokens,
        )

        llm_messages = llm_node._build_messages(exec_prompt, {}, messages[1:])
        response = await llm_node._call_llm(llm_messages)
        return response

    async def _reporting_phase(
        self, objective: str, plan: list[PlanStep], results: list[Any], context: dict
    ) -> str:
        """报告阶段: 汇总结果生成最终回答."""
        # 构建汇总上下文
        steps_summary = []
        for step, result in zip(plan, results):
            steps_summary.append(f"步骤{step.id} ({step.description}): {result}")

        summary_text = "\n".join(steps_summary)

        report_prompt = f"""基于以下执行结果，请给出最终回答。

目标: {objective}

执行结果汇总:
{summary_text}

请综合以上结果，给出完整、连贯的最终回答。"""

        messages = [
            {"role": "system", "content": report_prompt},
            {"role": "user", "content": "请基于上述执行结果给出最终回答。"},
        ]

        llm_node = LLMNode(
            model=self.llm_config.model,
            prompt_template=report_prompt,
            temperature=self.llm_config.temperature,
            max_tokens=self.llm_config.max_tokens,
        )

        llm_messages = llm_node._build_messages(report_prompt, {}, messages[1:])
        final_response = await llm_node._call_llm(llm_messages)
        return final_response

"""AutoGPT Agent Mode - 自主决策+工具调用循环."""
from __future__ import annotations

import logging
import json
import re
from typing import Any, Optional

from ..config_models import AgentConfig, AgentModeConfig
from ..nodes import LLMNode

logger = logging.getLogger(__name__)


class AutoGPTAction:
    """AutoGPT 行动单元."""

    def __init__(self, name: str, args: dict, reasoning: str = ""):
        self.name = name
        self.args = args
        self.reasoning = reasoning
        self.result: Any = None

    def __repr__(self):
        return f"<AutoGPTAction {self.name}({self.args})>"


class AutoGPTAgent:
    """
    AutoGPT Agent.

    执行流程 (自主循环):
    1. 接收反馈/上下文
    2. 重新评估目标优先级
    3. 生成下一个行动计划
    4. 执行行动并获取反馈
    5. 评估执行结果
    6. 循环直到目标完成或达到最大迭代

    特点:
    - 高度自主，不需要人工干预
    - 持续自我反思和重规划
    - 适合端到端自主任务
    """

    name = "auto_gpt"
    description = "AutoGPT模式: 高度自主的决策循环，适合端到端自主任务执行"

    def __init__(self, config: AgentConfig):
        self.config = config
        self.mode_config: AgentModeConfig = config.mode
        self.prompt_config = config.prompt
        self.llm_config = config.llm

        self.max_iterations = self.mode_config.max_iterations

        self._tools: dict[str, Any] = {}
        self._memory: list[str] = []  # 简单记忆存储

    def register_tool(self, name: str, tool: Any):
        self._tools[name] = tool

    async def run(self, objective: str, context: Optional[dict] = None) -> dict:
        """
        执行 AutoGPT 自主循环.

        Args:
            objective: 目标描述
            context: 初始上下文

        Returns:
            包含 response, actions, feedback 等字段的字典
        """
        context = context or {}
        actions_log = []
        feedback_history = []
        iteration = 0

        current_plan = objective
        is_complete = False

        while iteration < self.max_iterations and not is_complete:
            iteration += 1
            logger.info(f"[AutoGPT] Iteration {iteration}: {current_plan[:50]}...")

            # ---- Phase 1: 自我反思和重新评估 ----
            reflection = await self._self_reflect(current_plan, context, feedback_history)
            actions_log.append({
                "iteration": iteration,
                "phase": "reflection",
                "content": reflection,
            })

            # ---- Phase 2: 决定下一步行动 ----
            action = await self._decide_next_action(
                current_plan, reflection, context, iteration
            )

            if action is None:
                # 没有更多行动，尝试直接回答
                is_complete = True
                break

            actions_log.append({
                "iteration": iteration,
                "phase": "action",
                "action": action.name,
                "args": action.args,
                "reasoning": action.reasoning,
            })

            # ---- Phase 3: 执行行动 ----
            result = await self._execute_action(action, context)
            action.result = result

            # ---- Phase 4: 获取反馈 ----
            feedback = await self._get_feedback(
                action, result, current_plan, context
            )
            feedback_history.append({
                "iteration": iteration,
                "action": action.name,
                "result": str(result)[:300],
                "feedback": feedback,
            })

            # 将反馈加入记忆
            self._memory.append(f"[Iter {iteration}] {action.name}: {feedback}")

            # ---- Phase 5: 检查是否完成 ----
            is_complete = self._check_completion(feedback, iteration)

            logger.info(f"[AutoGPT] Iteration {iteration} complete. Complete={is_complete}")

        # ---- 最终回答 ----
        final_response = await self._generate_final_response(
            objective, actions_log, feedback_history, context
        )

        return {
            "response": final_response,
            "objective": objective,
            "actions": [
                {
                    "iteration": a["iteration"],
                    "phase": a["phase"],
                    "action": a.get("action"),
                    "args": a.get("args"),
                    "result": a.get("content") if a["phase"] == "reflection" else None,
                }
                for a in actions_log
            ],
            "feedback_history": feedback_history,
            "iterations": iteration,
            "is_complete": is_complete,
        }

    async def _self_reflect(
        self, current_plan: str, context: dict, feedback_history: list[dict]
    ) -> str:
        """自我反思: 分析当前状态和反馈."""
        feedback_summary = "\n".join(
            f"- {f['iteration']}: {f['feedback']}" for f in feedback_history[-3:]
        ) or "暂无反馈"

        reflection_prompt = f"""你是 AutoGPT，需要进行自我反思。

当前目标: {current_plan}

近期反馈历史:
{feedback_summary}

请进行反思:
1. 当前进展如何？
2. 已取得哪些成果？
3. 面临哪些挑战？
4. 下一步应该怎么做？

请给出你的思考分析。"""

        messages = [{"role": "user", "content": reflection_prompt}]

        llm_node = LLMNode(
            model=self.llm_config.model,
            prompt_template=reflection_prompt,
            temperature=0.7,
            max_tokens=1024,
        )

        llm_messages = llm_node._build_messages(reflection_prompt, context, messages)
        response = await llm_node._call_llm(llm_messages)
        return response

    async def _decide_next_action(
        self, plan: str, reflection: str, context: dict, iteration: int
    ) -> Optional[AutoGPTAction]:
        """决定下一步行动."""
        # 构建可用工具描述
        tools_desc = "无可用工具。" if not self._tools else "\n可用工具:\n" + "\n".join(
            f"- {name}: {getattr(tool, 'description', 'no description')}"
            for name, tool in self._tools.items()
        )

        # 近期记忆
        recent_memory = "\n".join(self._memory[-5:]) or "暂无历史记忆"

        decision_prompt = f"""你是 AutoGPT，需要决定下一步行动。

当前目标: {plan}

自我反思:
{reflection}

历史记忆:
{recent_memory}

{tools_desc}

请决定下一步行动。

格式1（需要工具）:
{{"reasoning": "我选择执行xxx，因为...", "action": "tool_name", "args": {{"param": "value"}}}}

格式2（无需工具，直接回答）:
{{"reasoning": "目标已完成，直接给出最终回答。", "action": null, "args": {{}}}}

请选择最佳行动:"""

        messages = [{"role": "user", "content": decision_prompt}]

        llm_node = LLMNode(
            model=self.llm_config.model,
            prompt_template=decision_prompt,
            temperature=0.8,
            max_tokens=512,
        )

        llm_messages = llm_node._build_messages(decision_prompt, context, messages)
        response = await llm_node._call_llm(llm_messages)

        return self._parse_action(response)

    def _parse_action(self, text: str) -> Optional[AutoGPTAction]:
        """解析 LLM 输出为 AutoGPTAction."""
        import json
        import re

        # 尝试 JSON 解析
        match = re.search(r'\{[^{}]*"reasoning"[^{}]*\}', text, re.DOTALL)
        if match:
            try:
                obj = json.loads(match.group())
                reasoning = obj.get("reasoning", "")
                action_name = obj.get("action")
                args = obj.get("args", {})

                if action_name is None:
                    # 表示不需要工具
                    return None

                return AutoGPTAction(
                    name=action_name,
                    args=args,
                    reasoning=reasoning,
                )
            except (json.JSONDecodeError, ValueError):
                pass

        return None

    async def _execute_action(self, action: AutoGPTAction, context: dict) -> str:
        """执行工具行动."""
        if action.name not in self._tools:
            return f"错误: 工具 '{action.name}' 不存在"

        tool = self._tools[action.name]
        try:
            result = await tool.execute(action.args, context)
            return str(result)
        except Exception as e:
            logger.exception(f"Tool {action.name} execution failed")
            return f"工具执行错误: {str(e)}"

    async def _get_feedback(
        self, action: AutoGPTAction, result: str, current_plan: str, context: dict
    ) -> str:
        """获取行动反馈，评估是否接近目标."""
        feedback_prompt = f"""评估以下行动结果:

目标: {current_plan}
行动: {action.name}
参数: {action.args}
结果: {result}

这个结果是否有助于推进目标？
- 如果是，说明如何继续
- 如果否，说明问题所在和调整方向

请给出简短反馈 (1-2句话):"""

        messages = [{"role": "user", "content": feedback_prompt}]

        llm_node = LLMNode(
            model=self.llm_config.model,
            prompt_template=feedback_prompt,
            temperature=0.3,
            max_tokens=256,
        )

        llm_messages = llm_node._build_messages(feedback_prompt, context, messages)
        response = await llm_node._call_llm(llm_messages)
        return response

    def _check_completion(self, feedback: str, iteration: int) -> bool:
        """检查是否完成目标."""
        if iteration >= self.max_iterations:
            return True

        # 正面反馈关键词
        positive_keywords = [
            "完成", "达成", "目标已实现", "任务完成", "目标完成",
            "finished", "completed", "done", "achieved",
        ]

        for kw in positive_keywords:
            if kw.lower() in feedback.lower():
                return True

        # 负面关键词
        negative_keywords = [
            "无法完成", "无法达成", "失败", "无法实现",
            "cannot achieve", "impossible", "failed",
        ]

        for kw in negative_keywords:
            if kw.lower() in feedback.lower():
                return True

        return False

    async def _generate_final_response(
        self,
        objective: str,
        actions_log: list[dict],
        feedback_history: list[dict],
        context: dict,
    ) -> str:
        """生成最终回答."""
        actions_summary = "\n".join(
            f"- [{a['iteration']}] {a.get('action', '思考')}: {a.get('reasoning', '')[:100]}"
            for a in actions_log if a["phase"] == "action"
        )

        feedback_summary = "\n".join(
            f"- [{f['iteration']}] {f['feedback']}"
            for f in feedback_history[-5:]
        )

        final_prompt = f"""你是 AutoGPT，需要给出最终回答。

原始目标: {objective}

执行摘要:
{actions_summary or "无行动执行"}

反馈摘要:
{feedback_summary or "无反馈"}

请基于以上所有执行过程和反馈，给出最终的完整回答。"""

        messages = [{"role": "user", "content": "请给出最终回答。"}]

        llm_node = LLMNode(
            model=self.llm_config.model,
            prompt_template=final_prompt,
            temperature=self.llm_config.temperature,
            max_tokens=self.llm_config.max_tokens,
        )

        llm_messages = llm_node._build_messages(final_prompt, context, messages)
        response = await llm_node._call_llm(llm_messages)
        return response

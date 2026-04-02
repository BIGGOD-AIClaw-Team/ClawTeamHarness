"""BabyAGI Agent Mode - 目标分解+执行循环."""
from __future__ import annotations

import logging
import asyncio
from typing import Any, Optional
from dataclasses import dataclass, field
from datetime import datetime

from ..config_models import AgentConfig, AgentModeConfig
from ..nodes import LLMNode

logger = logging.getLogger(__name__)


@dataclass
class Task:
    """BabyAGI 任务单元."""
    id: int
    description: str
    status: str = "pending"  # pending / running / completed / failed
    result: Any = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    priority: int = 0  # 优先级，数字越大优先级越高


class BabyAGIAgent:
    """
    BabyAGI Agent.

    执行流程:
    1. 接收目标(objective)
    2. 从任务列表取出一个任务
    3. 执行任务，存储结果到记忆
    4. 从结果中提取新的子任务
    5. 对任务列表进行优先级排序
    6. 循环直到任务列表为空

    特点:
    - 目标驱动的自主任务分解
    - 任务队列管理
    - 持续优化任务列表
    """

    name = "baby_agi"
    description = "BabyAGI模式: 目标驱动+自主任务分解，适合开放性目标任务"

    def __init__(self, config: AgentConfig):
        self.config = config
        self.mode_config: AgentModeConfig = config.mode
        self.prompt_config = config.prompt
        self.llm_config = config.llm

        self.max_iterations = self.mode_config.max_iterations
        self.max_tasks = 20  # 最大任务队列长度

        # 任务队列
        self._task_queue: list[Task] = []
        self._task_counter = 0

        # 结果存储（模拟记忆）
        self._results: list[dict] = []

    async def run(self, objective: str, context: Optional[dict] = None) -> dict:
        """
        执行 BabyAGI 主循环.

        Args:
            objective: 最终目标
            context: 额外上下文

        Returns:
            包含 response, tasks, results 等字段的字典
        """
        context = context or {}
        self._task_queue = []
        self._task_counter = 0
        self._results = []

        # Step 1: 初始化任务列表（从目标创建首个任务）
        initial_task = Task(
            id=self._next_task_id(),
            description=objective,
            priority=10,
        )
        self._task_queue.append(initial_task)

        completed_count = 0

        while self._task_queue and completed_count < self.max_iterations:
            completed_count += 1

            # 按优先级排序
            self._task_queue.sort(key=lambda t: t.priority, reverse=True)

            # 取出下一个任务
            current_task = self._task_queue.pop(0)
            current_task.status = "running"

            logger.info(f"[BabyAGI] Running task {current_task.id}: {current_task.description[:50]}...")

            # 执行任务
            result = await self._execute_task(current_task, context)
            current_task.result = result
            current_task.status = "completed"

            # 存储结果
            self._results.append({
                "task_id": current_task.id,
                "task_description": current_task.description,
                "result": result,
            })

            # 从结果中提取新任务
            new_tasks = await self._extract_tasks(result, objective, context)
            for new_task in new_tasks:
                if len(self._task_queue) < self.max_tasks:
                    self._task_queue.append(new_task)

            logger.info(f"[BabyAGI] Task {current_task.id} done. Queue size: {len(self._task_queue)}")

        # 最终综合
        final_response = await self._synthesize(objective, self._results, context)

        return {
            "response": final_response,
            "objective": objective,
            "tasks": [
                {
                    "id": t.id,
                    "description": t.description,
                    "status": t.status,
                    "result": t.result,
                    "priority": t.priority,
                }
                for t in self._results
            ],
            "results": self._results,
            "completed_count": completed_count,
        }

    def _next_task_id(self) -> int:
        self._task_counter += 1
        return self._task_counter

    async def _execute_task(self, task: Task, context: dict) -> str:
        """执行单个任务."""
        system_prompt = self._build_task_prompt()

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"任务: {task.description}\n\n请执行这个任务并给出结果。"},
        ]

        llm_node = LLMNode(
            model=self.llm_config.model,
            prompt_template=system_prompt,
            temperature=self.llm_config.temperature,
            max_tokens=self.llm_config.max_tokens,
        )

        llm_messages = llm_node._build_messages(system_prompt, context, messages[1:])
        result = await llm_node._call_llm(llm_messages)
        return result

    def _build_task_prompt(self) -> str:
        """构建任务执行提示."""
        parts = []

        if self.prompt_config.system:
            parts.append(self.prompt_config.system)

        parts.append("\n\n你是一个任务执行专家(BabyAGI)。")
        parts.append("你的职责:")
        parts.append("1. 仔细分析并执行给定任务")
        parts.append("2. 给出清晰、具体的执行结果")
        parts.append("3. 如果任务完成，明确说明")

        parts.append("\n\n注意：专注于当前任务，不要做与任务无关的事情。")

        return "\n".join(parts)

    async def _extract_tasks(self, result: str, objective: str, context: dict) -> list[Task]:
        """从执行结果中提取新的子任务."""
        # 已有结果摘要
        previous_results = "\n".join(
            f"[Task {r['task_id']}] {r['result'][:200]}" for r in self._results[-3:]
        )

        extraction_prompt = f"""你是任务分解专家(BabyAGI)。

最终目标: {objective}

当前任务结果:
{result[:500]}

之前的结果摘要:
{previous_results}

基于以上信息，请分析:
1. 当前任务是否已经完全达成目标？
2. 是否有新的子任务需要执行？

请以JSON格式输出新任务列表（如果没有新任务则输出空数组）:
{{"new_tasks": [
    {{"description": "任务描述", "priority": 1-10}}
]}}

priority: 1=最低, 10=最高（与目标最相关的任务优先）"""

        messages = [{"role": "user", "content": extraction_prompt}]

        llm_node = LLMNode(
            model=self.llm_config.model,
            prompt_template=extraction_prompt,
            temperature=0.3,
            max_tokens=1024,
        )

        llm_messages = llm_node._build_messages(extraction_prompt, context, messages)
        response = await llm_node._call_llm(llm_messages)

        # 解析新任务
        return self._parse_new_tasks(response)

    def _parse_new_tasks(self, text: str) -> list[Task]:
        """从 LLM 输出解析新任务."""
        import json
        import re

        tasks = []

        # 尝试提取 JSON
        match = re.search(r'\{[^{}]*"new_tasks"[^{}]*\}', text, re.DOTALL)
        if match:
            try:
                obj = json.loads(match.group())
                for t in obj.get("new_tasks", []):
                    tasks.append(Task(
                        id=self._next_task_id(),
                        description=t.get("description", ""),
                        priority=t.get("priority", 5),
                    ))
            except (json.JSONDecodeError, ValueError):
                pass

        return tasks

    async def _synthesize(self, objective: str, results: list[dict], context: dict) -> str:
        """综合所有结果，生成最终回答."""
        if not results:
            return "未能完成任务。"

        results_summary = "\n\n".join(
            f"=== 任务{i+1}: {r['task_description']} ===\n{r['result']}"
            for i, r in enumerate(results)
        )

        synthesis_prompt = f"""你是最终回答综合专家。

最终目标: {objective}

执行结果汇总:
{results_summary}

请综合以上所有执行结果，给出一个完整、连贯、面向最终目标的回答。
如果目标尚未完全达成，请说明当前进展和剩余工作。"""

        messages = [{"role": "user", "content": "请给出最终回答。"}]

        llm_node = LLMNode(
            model=self.llm_config.model,
            prompt_template=synthesis_prompt,
            temperature=self.llm_config.temperature,
            max_tokens=self.llm_config.max_tokens,
        )

        llm_messages = llm_node._build_messages(synthesis_prompt, context, messages)
        final_response = await llm_node._call_llm(llm_messages)
        return final_response

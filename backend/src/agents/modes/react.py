"""ReAct Agent Mode - Think → Action → Observe循环."""
from __future__ import annotations

import logging
import json
import re
from typing import Any, Optional

from ..config_models import AgentConfig, AgentModeConfig
from ..nodes import LLMNode

logger = logging.getLogger(__name__)


class ReActAgent:
    """
    ReAct (Reasoning + Acting) Agent.

    执行循环: Think → Action → Observe → Think → ...

    特点:
    - 每次迭代生成思考(thought)和行动(action)
    - 工具调用后观察结果，再进入下一轮思考
    - 支持早期停止(max_iterations, early_stopping)
    """

    name = "react"
    description = "ReAct模式: 思考→行动→观察循环，适合需要工具调用的复杂推理"

    def __init__(self, config: AgentConfig):
        """
        初始化 ReAct Agent.

        Args:
            config: Agent 配置对象
        """
        self.config = config
        self.mode_config: AgentModeConfig = config.mode
        self.prompt_config = config.prompt
        self.llm_config = config.llm

        self.max_iterations = self.mode_config.max_iterations
        self.early_stopping = self.mode_config.early_stopping

        # 工具注册表 {tool_name: tool_instance}
        self._tools: dict[str, Any] = {}

    def register_tool(self, name: str, tool: Any):
        """注册一个工具."""
        self._tools[name] = tool

    async def run(self, user_input: str, context: Optional[dict] = None) -> dict:
        """
        执行 ReAct 循环.

        Args:
            user_input: 用户输入
            context: 额外上下文

        Returns:
            包含 response, messages, steps, tool_calls 等字段的字典
        """
        context = context or {}
        messages = [{"role": "user", "content": user_input}]
        steps = []
        tool_calls = []
        iteration = 0

        # 构建系统提示
        system_prompt = self._build_system_prompt()

        while iteration < self.max_iterations:
            iteration += 1
            step = {"iteration": iteration, "phase": "think"}

            # ---- Phase 1: Think (生成思考和行动) ----
            thought_text = await self._think(system_prompt, messages, context)
            step["thought"] = thought_text

            # 解析 action
            action_result = self._parse_action(thought_text)
            if action_result is None:
                # 没有工具调用，生成最终回复
                step["phase"] = "finish"
                steps.append(step)
                final_response = thought_text
                messages.append({"role": "assistant", "content": final_response})
                break

            # ---- Phase 2: Action (执行工具) ----
            action_name, action_params = action_result
            step["phase"] = "action"
            step["action"] = action_name
            step["action_params"] = action_params

            tool_result = await self._execute_tool(action_name, action_params, context)
            step["observe"] = tool_result
            tool_calls.append({
                "tool": action_name,
                "params": action_params,
                "result": str(tool_result)[:500],  # 截断避免太长
            })

            # ---- Phase 3: Observe (将结果加入消息) ----
            observe_msg = f"观察结果: {tool_result}"
            messages.append({"role": "user", "content": observe_msg})

            steps.append(step)

            # 检查是否提前停止
            if self.early_stopping and self._should_stop(tool_result, iteration):
                logger.info(f"ReAct early stopping at iteration {iteration}")
                break

        else:
            # 达到最大迭代次数
            final_response = f"已达到最大迭代次数 ({self.max_iterations})。"
            messages.append({"role": "assistant", "content": final_response})

        return {
            "response": final_response,
            "messages": messages,
            "steps": steps,
            "tool_calls": tool_calls,
            "iterations": iteration,
        }

    def _build_system_prompt(self) -> str:
        """构建系统提示，包含工具列表和使用说明."""
        prompt_parts = []

        if self.prompt_config.system:
            prompt_parts.append(self.prompt_config.system)

        prompt_parts.append("\n\n你是一个 ReAct Agent。")
        prompt_parts.append("在每个步骤中，你需要:")
        prompt_parts.append("1. 思考(Thought): 分析当前情况")
        prompt_parts.append("2. 行动(Action): 如果需要工具，写成JSON格式")
        prompt_parts.append("3. 等待观察结果后继续思考")

        # 如果没有可用工具，说明这是纯推理模式
        if self._tools:
            tool_list = ", ".join(f"'{name}'" for name in self._tools.keys())
            prompt_parts.append(f"\n可用工具: {tool_list}")
            prompt_parts.append("\n行动格式 (无工具时直接输出回答):")
            prompt_parts.append('  无需工具: 直接给出回答')
            prompt_parts.append('  需要工具: {"action": "tool_name", "params": {"key": "value"}}')
        else:
            prompt_parts.append("\n当前无可用工具，请直接回答问题。")

        return "\n".join(prompt_parts)

    async def _think(self, system_prompt: str, messages: list, context: dict) -> str:
        """调用 LLM 生成思考."""
        # 构建完整消息
        full_messages = [{"role": "system", "content": system_prompt}] + list(messages)

        llm_node = LLMNode(
            model=self.llm_config.model,
            prompt_template=system_prompt,
            temperature=self.llm_config.temperature,
            max_tokens=self.llm_config.max_tokens,
            top_p=self.llm_config.top_p,
        )

        # 直接调用 LLM (复用 _call_llm)
        llm_messages = llm_node._build_messages(system_prompt, context, messages)
        response = await llm_node._call_llm(llm_messages)
        return response

    def _parse_action(self, text: str) -> Optional[tuple[str, dict]]:
        """
        从文本中解析 action.

        尝试匹配 JSON 格式: {"action": "xxx", "params": {...}}
        如果不匹配，返回 None（表示无工具调用）。

        Returns:
            (action_name, params_dict) 或 None
        """
        # 尝试 JSON 解析
        patterns = [
            r'\{[^{}]*"action"[^{}]*"params"[^{}]*\}',  # 简单非递归匹配
        ]

        for pattern in patterns:
            matches = re.findall(pattern, text, re.DOTALL)
            for match in matches:
                try:
                    obj = json.loads(match)
                    if "action" in obj:
                        return obj["action"], obj.get("params", {})
                except json.JSONDecodeError:
                    continue

        # 尝试直接 JSON 解析整段
        text_stripped = text.strip()
        if text_stripped.startswith("{") and text_stripped.endswith("}"):
            try:
                obj = json.loads(text_stripped)
                if "action" in obj:
                    return obj["action"], obj.get("params", {})
            except json.JSONDecodeError:
                pass

        return None

    async def _execute_tool(self, tool_name: str, params: dict, context: dict) -> str:
        """执行工具调用."""
        if tool_name not in self._tools:
            return f"错误: 工具 '{tool_name}' 不存在"

        tool = self._tools[tool_name]
        try:
            result = await tool.execute(params, context)
            return str(result)
        except Exception as e:
            logger.exception(f"Tool {tool_name} execution failed")
            return f"工具执行错误: {str(e)}"

    def _should_stop(self, tool_result: str, iteration: int) -> bool:
        """判断是否应该提前停止."""
        if iteration >= self.max_iterations:
            return True

        # 简单启发式：如果结果中包含特定关键词，认为已完成
        stop_keywords = ["完成", "finished", "done", "结论是", "最终答案", "final answer"]
        for kw in stop_keywords:
            if kw in tool_result:
                return True

        return False

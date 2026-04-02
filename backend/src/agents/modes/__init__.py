"""Agent Mode Implementations.

5种Agent模式:
- ReAct: 思考→行动→观察循环
- Plan-Execute: 先计划后执行
- Chat: 纯对话，无工具调用
- BabyAGI: 目标分解+执行循环
- AutoGPT: 自主决策+工具调用
"""
from .react import ReActAgent
from .plan_execute import PlanExecuteAgent
from .chat import ChatAgent
from .baby_agi import BabyAGIAgent
from .auto_gpt import AutoGPTAgent

__all__ = [
    "ReActAgent",
    "PlanExecuteAgent",
    "ChatAgent",
    "BabyAGIAgent",
    "AutoGPTAgent",
]

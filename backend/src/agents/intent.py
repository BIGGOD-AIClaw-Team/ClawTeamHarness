"""Intent classifier for user input."""
from typing import Optional


class IntentClassifier:
    """Classifies user intent from natural language input."""

    INTENTS = {
        "greeting": ["你好", "hello", "hi", "早上好", "晚上好", "嗨", "嗨你好"],
        "query": ["查询", "搜索", "查找", "what", "how", "why", "请问", "问一下", "谁知道"],
        "action": ["执行", "运行", "做", "do", "run", "execute", "开始", "启动"],
        "help": ["帮助", "help", "怎么", "如何", "使用", "教程", "教我"],
    }

    def classify(self, text: str) -> tuple[str, float]:
        """
        Classify user intent from input text.

        Args:
            text: Raw user input string.

        Returns:
            Tuple of (intent_name, confidence_score).
        """
        text_lower = text.lower()

        for intent, keywords in self.INTENTS.items():
            for kw in keywords:
                if kw in text_lower:
                    return intent, 0.9

        return "unknown", 0.5

    def get_suggestions(self, intent: str) -> list[str]:
        """
        Get suggested actions for a given intent.

        Args:
            intent: The classified intent name.

        Returns:
            List of suggested action strings.
        """
        suggestions = {
            "greeting": ["问候语", "介绍自己"],
            "query": ["提供查询接口", "展示搜索结果"],
            "action": ["执行对应任务", "返回执行结果"],
            "help": ["显示帮助信息", "列出可用命令"],
        }
        return suggestions.get(intent, [])

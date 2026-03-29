"""Unit tests for IntentClassifier."""
import pytest
from backend.src.agents.intent import IntentClassifier


class TestIntentClassifier:
    def setup_method(self):
        self.classifier = IntentClassifier()

    def test_classify_greeting_chinese(self):
        intent, confidence = self.classifier.classify("你好")
        assert intent == "greeting"
        assert confidence == 0.9

    def test_classify_greeting_english(self):
        intent, confidence = self.classifier.classify("hello")
        assert intent == "greeting"
        assert confidence == 0.9

    def test_classify_query(self):
        intent, confidence = self.classifier.classify("查询一下天气")
        assert intent == "query"
        assert confidence == 0.9

    def test_classify_action(self):
        intent, confidence = self.classifier.classify("执行任务")
        assert intent == "action"
        assert confidence == 0.9

    def test_classify_help(self):
        intent, confidence = self.classifier.classify("如何使用")
        assert intent == "help"
        assert confidence == 0.9

    def test_classify_unknown(self):
        intent, confidence = self.classifier.classify("asdfgh jklmno")
        assert intent == "unknown"
        assert confidence == 0.5

    def test_get_suggestions_greeting(self):
        suggestions = self.classifier.get_suggestions("greeting")
        assert "问候语" in suggestions

    def test_get_suggestions_query(self):
        suggestions = self.classifier.get_suggestions("query")
        assert "提供查询接口" in suggestions

    def test_get_suggestions_unknown(self):
        suggestions = self.classifier.get_suggestions("nonexistent")
        assert suggestions == []

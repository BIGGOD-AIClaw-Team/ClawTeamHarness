"""Unit tests for CancellationToken and interruptible execution."""
import pytest
import asyncio
from backend.src.agents.engine import CancellationToken, AgentEngine


class TestCancellationToken:
    def test_default_not_cancelled(self):
        """Token should not be cancelled by default."""
        token = CancellationToken()
        assert token.is_cancelled() is False

    def test_cancel_sets_flag(self):
        """Calling cancel() should set the cancelled flag."""
        token = CancellationToken()
        token.cancel()
        assert token.is_cancelled() is True

    def test_check_raises_when_cancelled(self):
        """check() should raise CancelledError when cancelled."""
        token = CancellationToken()
        token.cancel()
        with pytest.raises(asyncio.CancelledError, match="Execution cancelled"):
            token.check()

    def test_check_does_not_raise_when_not_cancelled(self):
        """check() should not raise when not cancelled."""
        token = CancellationToken()
        token.check()  # Should not raise


class TestAgentEngineCancellation:
    def test_engine_init_with_empty_graph(self):
        """Engine should accept empty graph without error."""
        engine = AgentEngine(graph_def={})
        assert engine.graph is None

    def test_engine_validate_empty_graph(self):
        """Validation should report empty graph error."""
        engine = AgentEngine(graph_def={})
        errors = engine.validate_graph()
        assert "Graph has no nodes" in errors

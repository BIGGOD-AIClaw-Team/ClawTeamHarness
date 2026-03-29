"""Unit tests for CheckpointManager."""
import pytest
import tempfile
import shutil
from pathlib import Path
from backend.src.agents.checkpoint import CheckpointManager


@pytest.fixture
def temp_checkpoint_dir():
    """Create a temporary checkpoint directory."""
    path = tempfile.mkdtemp()
    yield path
    shutil.rmtree(path, ignore_errors=True)


class TestCheckpointManager:
    def test_save_and_get_checkpoint(self, temp_checkpoint_dir):
        """Should save and retrieve a checkpoint."""
        mgr = CheckpointManager(checkpoint_dir=temp_checkpoint_dir)
        thread_id = "test_thread"
        state = {"current_node": "node1", "result": {"data": 42}}

        cp_id = mgr.save_checkpoint(thread_id, state)
        assert cp_id == 0

        retrieved = mgr.get_checkpoint(thread_id, cp_id)
        assert retrieved is not None
        assert retrieved["data"] == state

    def test_list_checkpoints(self, temp_checkpoint_dir):
        """Should list all checkpoints for a thread."""
        mgr = CheckpointManager(checkpoint_dir=temp_checkpoint_dir)
        thread_id = "test_thread"

        mgr.save_checkpoint(thread_id, {"step": 1})
        mgr.save_checkpoint(thread_id, {"step": 2})
        mgr.save_checkpoint(thread_id, {"step": 3})

        checkpoints = mgr.list_checkpoints(thread_id)
        assert len(checkpoints) == 3
        assert [cp["data"]["step"] for cp in checkpoints] == [1, 2, 3]

    def test_resume_from_checkpoint(self, temp_checkpoint_dir):
        """Should resume execution from a saved checkpoint."""
        mgr = CheckpointManager(checkpoint_dir=temp_checkpoint_dir)
        thread_id = "test_thread"
        saved_state = {"current_node": "node2", "context": {"count": 5}}

        mgr.save_checkpoint(thread_id, {"step": 1})
        cp_id = mgr.save_checkpoint(thread_id, saved_state)

        resumed = mgr.resume_from_checkpoint(thread_id, cp_id)
        assert resumed == saved_state

    def test_resume_from_checkpoint_not_found(self, temp_checkpoint_dir):
        """Should raise ValueError for missing checkpoint."""
        mgr = CheckpointManager(checkpoint_dir=temp_checkpoint_dir)
        with pytest.raises(ValueError, match="not found"):
            mgr.resume_from_checkpoint("nonexistent_thread", 0)

    def test_delete_checkpoints(self, temp_checkpoint_dir):
        """Should delete all checkpoints for a thread."""
        mgr = CheckpointManager(checkpoint_dir=temp_checkpoint_dir)
        thread_id = "test_thread"

        mgr.save_checkpoint(thread_id, {"step": 1})
        mgr.save_checkpoint(thread_id, {"step": 2})

        count = mgr.delete_checkpoints(thread_id)
        assert count == 2
        assert mgr.list_checkpoints(thread_id) == []

    def test_persistence_across_reinstantiation(self, temp_checkpoint_dir):
        """Checkpoints should persist across manager re-instantiation."""
        thread_id = "test_thread"
        state = {"persistent": True}

        mgr1 = CheckpointManager(checkpoint_dir=temp_checkpoint_dir)
        mgr1.save_checkpoint(thread_id, state)

        mgr2 = CheckpointManager(checkpoint_dir=temp_checkpoint_dir)
        checkpoints = mgr2.list_checkpoints(thread_id)

        assert len(checkpoints) == 1
        assert checkpoints[0]["data"] == state

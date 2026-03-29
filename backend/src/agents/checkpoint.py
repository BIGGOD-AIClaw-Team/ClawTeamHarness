"""Checkpoint management for agent state persistence and resumable execution."""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class CheckpointManager:
    """
    Checkpoint manager for saving, listing, and resuming agent execution state.

    Supports per-thread checkpointing with JSON persistence.
    """

    def __init__(self, checkpoint_dir: str = "./data/checkpoints"):
        """
        Initialize the CheckpointManager.

        Args:
            checkpoint_dir: Directory to store checkpoint JSON files.
        """
        self.checkpoint_dir = Path(checkpoint_dir)
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)
        self._checkpoints: dict[str, list[dict]] = {}

    def save_checkpoint(self, thread_id: str, checkpoint_data: dict) -> int:
        """
        Save a checkpoint for the given thread.

        Args:
            thread_id: Unique identifier for the execution thread.
            checkpoint_data: State dict to save.

        Returns:
            The checkpoint ID (index) that was assigned.
        """
        if thread_id not in self._checkpoints:
            self._checkpoints[thread_id] = []
            # Try loading existing checkpoints from disk
            self.load(thread_id)

        checkpoint_id = len(self._checkpoints[thread_id])
        self._checkpoints[thread_id].append({
            "id": checkpoint_id,
            "data": checkpoint_data,
        })
        self._persist(thread_id)
        logger.info(f"Saved checkpoint {checkpoint_id} for thread '{thread_id}'")
        return checkpoint_id

    def list_checkpoints(self, thread_id: str) -> list[dict]:
        """
        List all checkpoints for a thread.

        Args:
            thread_id: The thread identifier.

        Returns:
            List of checkpoint records with 'id' and 'data' keys.
        """
        if thread_id not in self._checkpoints:
            self.load(thread_id)
        return self._checkpoints.get(thread_id, [])

    def get_checkpoint(self, thread_id: str, checkpoint_id: int) -> Optional[dict]:
        """
        Get a specific checkpoint by ID.

        Args:
            thread_id: The thread identifier.
            checkpoint_id: The checkpoint index.

        Returns:
            The checkpoint record dict, or None if not found.
        """
        checkpoints = self._checkpoints.get(thread_id)
        if checkpoints is None:
            self.load(thread_id)
            checkpoints = self._checkpoints.get(thread_id, [])

        for cp in checkpoints:
            if cp["id"] == checkpoint_id:
                return cp
        return None

    def resume_from_checkpoint(self, thread_id: str, checkpoint_id: int) -> dict:
        """
        Resume execution from a saved checkpoint.

        Args:
            thread_id: The thread identifier.
            checkpoint_id: The checkpoint index to resume from.

        Returns:
            The saved state dict.

        Raises:
            ValueError: If the checkpoint does not exist.
        """
        cp = self.get_checkpoint(thread_id, checkpoint_id)
        if cp is None:
            raise ValueError(f"Checkpoint {checkpoint_id} not found for thread '{thread_id}'")
        logger.info(f"Resuming from checkpoint {checkpoint_id} for thread '{thread_id}'")
        return cp["data"]

    def delete_checkpoints(self, thread_id: str) -> int:
        """
        Delete all checkpoints for a thread.

        Args:
            thread_id: The thread identifier.

        Returns:
            Number of checkpoints deleted.
        """
        if thread_id in self._checkpoints:
            count = len(self._checkpoints[thread_id])
            del self._checkpoints[thread_id]
            path = self.checkpoint_dir / f"{thread_id}.json"
            if path.exists():
                path.unlink()
            logger.info(f"Deleted {count} checkpoints for thread '{thread_id}'")
            return count
        return 0

    def _persist(self, thread_id: str):
        """Write checkpoints to disk as JSON."""
        path = self.checkpoint_dir / f"{thread_id}.json"
        checkpoints = self._checkpoints.get(thread_id, [])
        try:
            with open(path, "w") as f:
                json.dump(checkpoints, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Failed to persist checkpoints for thread '{thread_id}': {e}")

    def load(self, thread_id: str):
        """Load checkpoints from disk into memory."""
        path = self.checkpoint_dir / f"{thread_id}.json"
        if path.exists():
            try:
                with open(path) as f:
                    self._checkpoints[thread_id] = json.load(f)
                logger.debug(f"Loaded checkpoints for thread '{thread_id}' from disk")
            except Exception as e:
                logger.error(f"Failed to load checkpoints for thread '{thread_id}': {e}")
                self._checkpoints[thread_id] = []


# Global singleton instance
checkpoint_manager = CheckpointManager()

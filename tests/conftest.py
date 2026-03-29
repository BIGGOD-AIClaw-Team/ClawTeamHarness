import pytest
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))


@pytest.fixture
def mock_config():
    """Mock configuration for testing"""
    # Note: When backend/src/config.py exists, import from src.config
    # For now, this is a placeholder that returns a dict
    return {
        "debug": True,
        "log_level": "DEBUG",
        "db_path": ":memory:",
    }


@pytest.fixture
def project_root():
    """Return the project root directory"""
    return Path(__file__).parent.parent

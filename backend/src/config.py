"""Configuration management - No secrets here!"""
import os
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class AppConfig:
    """Unified application configuration.

    All paths and server settings can be overridden via environment variables.
    """

    # Paths
    data_dir: str = field(default_factory=lambda: os.getenv("DATA_DIR", "./data"))
    skills_dir: str = field(default_factory=lambda: os.getenv("SKILLS_DIR", "./skills"))
    memory_dir: str = field(default_factory=lambda: os.getenv("MEMORY_DIR", "./data/memory"))
    checkpoint_dir: str = field(default_factory=lambda: os.getenv("CHECKPOINT_DIR", "./data/checkpoints"))

    # Server
    host: str = field(default_factory=lambda: os.getenv("HOST", "0.0.0.0"))
    port: int = field(default_factory=lambda: int(os.getenv("PORT", "8000")))

    # CORS
    cors_allowed_origins: list = field(
        default_factory=lambda: os.getenv("CORS_ORIGINS", "*").split(",")
    )

    # Skills
    skill_default_timeout_ms: int = field(
        default_factory=lambda: int(os.getenv("SKILL_TIMEOUT_MS", "30000"))
    )

    # Debug & Logging
    debug: bool = field(default_factory=lambda: os.getenv("DEBUG", "false").lower() == "true")
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"))

    # Database
    db_path: str = field(default_factory=lambda: os.getenv("DB_PATH", "./data/harness.db"))

    # LLM (configure via environment variables at runtime)
    llm_provider: str = field(default_factory=lambda: os.getenv("LLM_PROVIDER", "openai"))
    llm_model: str = field(default_factory=lambda: os.getenv("LLM_MODEL", "gpt-4"))

    @classmethod
    def from_env(cls) -> "AppConfig":
        """Load config from environment variables."""
        return cls()


@dataclass
class LLMConfig:
    """LLM configuration - all sensitive values read from environment variables."""

    provider: str = "openai"
    model: str = "gpt-4"
    api_key: str = ""  # Read from env, never hardcode
    temperature: float = 0.7
    max_tokens: int = 2048
    top_p: float = 1.0
    timeout: int = 60

    @classmethod
    def from_env(cls) -> "LLMConfig":
        return cls(
            provider=os.getenv("LLM_PROVIDER", "openai"),
            model=os.getenv("LLM_MODEL", "gpt-4"),
            api_key=os.getenv("LLM_API_KEY", ""),
            temperature=float(os.getenv("LLM_TEMPERATURE", "0.7")),
            max_tokens=int(os.getenv("LLM_MAX_TOKENS", "2048")),
            top_p=float(os.getenv("LLM_TOP_P", "1.0")),
            timeout=int(os.getenv("LLM_TIMEOUT", "60")),
        )


# Default config instances
config = AppConfig.from_env()
llm_config = LLMConfig.from_env()

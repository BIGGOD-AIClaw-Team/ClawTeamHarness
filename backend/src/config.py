"""Configuration management - No secrets here!"""
import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class AppConfig:
    """Application configuration"""
    debug: bool = False
    log_level: str = "INFO"

    # Paths
    data_dir: str = "./data"
    skills_dir: str = "./skills"
    memory_dir: str = "./memory"

    # Database
    db_path: str = "./data/harness.db"

    # LLM (configure via environment variables at runtime)
    llm_provider: str = "openai"
    llm_model: str = "gpt-4"

    @classmethod
    def from_env(cls) -> "AppConfig":
        """Load config from environment variables"""
        return cls(
            debug=os.getenv("DEBUG", "false").lower() == "true",
            log_level=os.getenv("LOG_LEVEL", "INFO"),
            llm_provider=os.getenv("LLM_PROVIDER", "openai"),
            llm_model=os.getenv("LLM_MODEL", "gpt-4"),
        )


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

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
    # NOTE: API keys MUST be set via environment variables, never hardcoded!
    
    @classmethod
    def from_env(cls) -> "AppConfig":
        """Load config from environment variables"""
        return cls(
            debug=os.getenv("DEBUG", "false").lower() == "true",
            log_level=os.getenv("LOG_LEVEL", "INFO"),
            llm_provider=os.getenv("LLM_PROVIDER", "openai"),
            llm_model=os.getenv("LLM_MODEL", "gpt-4"),
        )

# Default config instance
config = AppConfig.from_env()

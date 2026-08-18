"""Application configuration via environment variables (pydantic-settings).

All settings can be overridden through ``.env`` or process environment.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Fraud Command"
    app_version: str = "2.0.0"
    environment: str = "development"  # development | staging | production

    cors_origins: list[str] = ["*"]

    log_level: str = "INFO"
    log_format: str = "json"  # json | text

    frontend_dist: str = str(PROJECT_ROOT / "frontend" / "dist")

    default_n_estimators: int = 200
    default_alert_threshold: float = 0.5
    default_test_size: float = 0.2
    default_cv_folds: int = 5

    max_generate_rows: int = 2_000_000
    max_upload_bytes: int = 500 * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

"""Structured logging setup (JSON output for production).

Provides a module-level logger factory and request logging helpers.
In JSON mode each record is emitted as a single-line JSON object,
making it ingestible by log aggregators (CloudWatch, Loki, Datadog…).
"""

from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any

from app.config import settings


class JsonFormatter(logging.Formatter):
    """Format log records as single-line JSON."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        extra = getattr(record, "extra_fields", None)
        if extra:
            payload.update(extra)
        return json.dumps(payload, default=str)


def setup_logging() -> logging.Logger:
    root = logging.getLogger()
    root.setLevel(settings.log_level.upper())

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        JsonFormatter() if settings.log_format == "json" else logging.Formatter(
            "%(asctime)s %(levelname)-7s %(name)s — %(message)s"
        )
    )

    root.handlers.clear()
    root.addHandler(handler)

    # Quiet noisy third-party loggers
    for name in ("uvicorn.access", "matplotlib", "numba"):
        logging.getLogger(name).setLevel(logging.WARNING)

    return logging.getLogger("app")


log = setup_logging()

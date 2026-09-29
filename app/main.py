"""Fraud Detection System — FastAPI application factory.

Wires configuration, structured logging, middleware (CORS, request
metrics, access logging), API routers, and static frontend serving.
"""

from __future__ import annotations

import time
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from prometheus_fastapi_instrumentator import Instrumentator

from app.api import api_router
from app.api.auth import COOKIE_NAME, read_session
from app.config import settings
from app.logging import log

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Real-time fraud detection for financial transactions. "
        "Hybrid Random Forest + Isolation Forest scoring engine with "
        "alert triage, model benchmarking, and a monitoring console."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials="*" not in settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

PUBLIC_API_PATHS = {
    "/api/health",
    "/api/ready",
    "/api/app-info",
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/session",
}


@app.middleware("http")
async def require_console_session(request: Request, call_next):
    """Require a valid analyst session for non-public API operations."""
    path = request.url.path
    if path.startswith("/api/") and path not in PUBLIC_API_PATHS:
        if read_session(request.cookies.get(COOKIE_NAME)) is None:
            return JSONResponse(status_code=401, content={"detail": "Authentication required."})
    return await call_next(request)


@app.middleware("http")
async def access_log(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    log.info(
        "request",
        extra={
            "extra_fields": {
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": round(elapsed_ms, 2),
            }
        },
    )
    return response


# ---------------------------------------------------------------------------
# Prometheus metrics
# ---------------------------------------------------------------------------

Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(api_router)

# ---------------------------------------------------------------------------
# Static frontend serving (production: serve built assets if present)
# ---------------------------------------------------------------------------

FRONTEND_DIST = Path(settings.frontend_dist)

if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/", include_in_schema=False)
    def index():
        return FileResponse(FRONTEND_DIST / "index.html")

    @app.get("/{path:path}", include_in_schema=False)
    def spa_fallback(path: str):
        candidate = FRONTEND_DIST / path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")

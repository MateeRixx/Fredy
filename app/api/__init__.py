"""API router aggregation."""

from __future__ import annotations

from fastapi import APIRouter

from app.api import alerts, benchmark, data, health, model, scoring

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(data.router)
api_router.include_router(model.router)
api_router.include_router(scoring.router)
api_router.include_router(scoring.scored_router)
api_router.include_router(alerts.router)
api_router.include_router(benchmark.router)
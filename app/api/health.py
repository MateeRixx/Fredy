"""Health + readiness + app-info endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import get_state
from app.config import settings

router = APIRouter(tags=["health"])


@router.get("/api/health")
def health():
    state = get_state()
    return {
        "status": "ok",
        "dataset_loaded": state.dataset is not None,
        "model_trained": state.has_model(),
        "dataset_type": state.dataset_type,
        "source": state.source_name,
    }


@router.get("/api/ready")
def ready():
    state = get_state()
    # Service is "ready" once it can serve requests; a trained model is
    # preferred but not required for a healthy instance.
    return {"status": "ready", "model_trained": state.has_model()}


@router.get("/api/app-info")
def app_info():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "status": "operational",
    }
"""Model training + status endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.api.deps import get_state, require_dataset
from app.schemas import TrainRequest
from app.services.training import run_training_pipeline

router = APIRouter(prefix="/api/model", tags=["model"])


@router.post("/train")
def train_model(req: TrainRequest):
    state = get_state()
    df = require_dataset(state)
    try:
        result = run_training_pipeline(df, req, is_ulb=state.is_ulb)
    except Exception as exc:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Training failed: {exc}")

    state.set_processed_state(
        model=result["model"],
        preprocessor=result["preprocessor"] if not state.is_ulb else None,
        ulb_preprocessor=result["preprocessor"] if state.is_ulb else None,
        engineer=result["engineer"],
        detector=result["detector"],
        alert_system=result["alert_system"],
        metrics=result["metrics"],
        feature_columns=result["feature_columns"],
    )
    state.set_scored(result["scored"])

    return {
        "metrics": result["metrics"],
        "alerts_generated": result["alerts_generated"],
        "feature_count": len(result["feature_columns"]),
        "is_ulb": state.is_ulb,
    }


@router.get("/status")
def model_status():
    state = get_state()
    if not state.has_model():
        return {"trained": False}
    return {
        "trained": True,
        "metrics": state.metrics,
        "feature_count": len(state.feature_columns),
        "is_ulb": state.is_ulb,
        "alerts_total": state.alert_system.total_alerts if state.alert_system else 0,
    }
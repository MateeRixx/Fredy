"""Real-time scoring endpoints."""

from __future__ import annotations

import pandas as pd
from fastapi import APIRouter, HTTPException

from app.api.deps import get_state, require_model
from app.schemas import ScoreBatchRequest, ScoreTransactionRequest

router = APIRouter(prefix="/api/score", tags=["scoring"])


@router.post("/transaction")
def score_transaction(req: ScoreTransactionRequest):
    state = get_state()
    require_model(state)
    try:
        result = state.detector.score_transaction(req.transaction)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Scoring failed: {exc}")
    return result.to_dict()


@router.post("/batch")
def score_batch(req: ScoreBatchRequest):
    state = get_state()
    require_model(state)
    df = pd.DataFrame(req.transactions)
    try:
        results = state.detector.score_batch(df)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Scoring failed: {exc}")
    return [r.to_dict() for r in results]


@router.get("/statistics")
def score_statistics():
    state = get_state()
    if state.detector is None:
        return {"total": 0}
    return state.detector.get_statistics()


scored_router = APIRouter(tags=["scoring"])


@scored_router.get("/api/scored")
def get_scored(
    limit: int = 200,
    risk: str | None = None,
    sort: str = "hybrid_score",
    order: str = "desc",
):
    state = get_state()
    df = state.scored
    if df is None or df.empty:
        return {"rows": [], "total": 0}
    df = df.copy()
    if risk and risk in df.columns:
        df = df[df["risk_level"] == risk]
    if sort in df.columns:
        df = df.sort_values(sort, ascending=(order == "asc"))
    records = df.head(limit).to_dict(orient="records")
    return {"rows": records, "total": len(df)}
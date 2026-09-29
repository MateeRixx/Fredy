"""Real-time scoring endpoints."""

from __future__ import annotations

from uuid import uuid4

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from app.api.deps import get_state, require_model
from app.schemas import ScoreBatchRequest, ScoreTransactionRequest

router = APIRouter(prefix="/api/score", tags=["scoring"])


@router.post("/transaction")
def score_transaction(req: ScoreTransactionRequest):
    state = get_state()
    transaction = dict(req.transaction)
    transaction.setdefault("transaction_id", f"LIVE-{uuid4().hex[:12].upper()}")
    with state.lock():
        require_model(state)
        try:
            result = state.detector.score_transaction(transaction)
        except (KeyError, TypeError, ValueError) as exc:
            raise HTTPException(status_code=400, detail=f"Invalid transaction: {exc}")
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Scoring failed: {exc}")
        payload = result.to_dict()
        alerts = state.alert_system.process_results([result])
        if alerts:
            payload["alert_id"] = alerts[0].alert_id
        state.append_scored(pd.DataFrame([transaction]), [payload])
        return payload


@router.post("/batch")
def score_batch(req: ScoreBatchRequest):
    state = get_state()
    transactions = [dict(row) for row in req.transactions]
    for row in transactions:
        row.setdefault("transaction_id", f"LIVE-{uuid4().hex[:12].upper()}")
    df = pd.DataFrame(transactions)
    with state.lock():
        require_model(state)
        try:
            results = state.detector.score_batch(df)
        except (KeyError, TypeError, ValueError) as exc:
            raise HTTPException(status_code=400, detail=f"Invalid transaction batch: {exc}")
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Scoring failed: {exc}")
        alerts = state.alert_system.process_results(results)
        alert_by_txn = {alert.transaction_id: alert.alert_id for alert in alerts}
        payloads = []
        for result in results:
            payload = result.to_dict()
            if result.transaction_id in alert_by_txn:
                payload["alert_id"] = alert_by_txn[result.transaction_id]
            payloads.append(payload)
        state.append_scored(df, payloads)
        return payloads


@router.get("/statistics")
def score_statistics():
    state = get_state()
    with state.lock():
        if state.detector is None:
            return {"total": 0}
        return state.detector.get_statistics()


scored_router = APIRouter(tags=["scoring"])


@scored_router.get("/api/scored")
def get_scored(
    limit: int = Query(200, ge=1, le=1000),
    risk: str | None = None,
    sort: str = "hybrid_score",
    order: str = "desc",
):
    state = get_state()
    with state.lock():
        df = state.scored
        if df is None or df.empty:
            return {"rows": [], "total": 0}
        df = df.copy()
    if risk and "risk_level" in df.columns:
        df = df[df["risk_level"] == risk]
    if sort in df.columns:
        df = df.sort_values(sort, ascending=(order == "asc"))
    page = df.head(limit).astype(object).where(pd.notnull(df.head(limit)), None)
    records = page.to_dict(orient="records")
    return {"rows": records, "total": len(df)}

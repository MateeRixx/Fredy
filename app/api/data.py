"""Dataset ingestion endpoints."""

from __future__ import annotations

import io

import pandas as pd
from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from app.api.deps import get_state, require_dataset
from app.config import settings
from app.core.data_loader import generate_ulb_format_synthetic
from app.schemas import GenerateRequest, ULBGenerateRequest

router = APIRouter(prefix="/api/data", tags=["data"])


@router.post("/generate")
def generate_data(req: GenerateRequest):
    state = get_state()
    try:
        from data.generate_dataset import generate_transactions

        df = generate_transactions(
            n_rows=req.rows,
            fraud_rate=req.fraud_rate,
            n_customers=req.n_customers,
            seed=req.seed,
            start_date=req.start_date,
            end_date=req.end_date,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Generation failed: {exc}")

    with state.lock():
        state.reset_pipeline()
        state.set_dataset(
            df,
            dataset_type="synthetic_original",
            source_name=f"Synthetic · {req.rows:,} rows · {req.fraud_rate:.2%} fraud",
            is_ulb=False,
        )
        return state.dataset_summary()


@router.post("/generate-ulb")
def generate_ulb(req: ULBGenerateRequest):
    state = get_state()
    try:
        df = generate_ulb_format_synthetic(n_rows=req.rows, fraud_rate=req.fraud_rate, seed=req.seed)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Generation failed: {exc}")

    with state.lock():
        state.reset_pipeline()
        state.set_dataset(
            df,
            dataset_type="ulb_credit_card",
            source_name=f"ULB-format synthetic · {req.rows:,} rows · {req.fraud_rate:.3%} fraud",
            is_ulb=True,
        )
        return state.dataset_summary()


@router.post("/upload")
async def upload_data(file: UploadFile = File(...)):
    state = get_state()
    content = bytearray()
    while chunk := await file.read(1024 * 1024):
        content.extend(chunk)
        if len(content) > settings.max_upload_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"Upload exceeds the {settings.max_upload_bytes // (1024 * 1024)} MB limit.",
            )
    try:
        df = pd.read_csv(io.BytesIO(bytes(content)))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {exc}")

    if df.empty:
        raise HTTPException(status_code=400, detail="Uploaded file contains no rows.")

    dtype = _quick_detect(df)
    is_ulb = dtype == "ulb_credit_card"
    if dtype == "unknown":
        raise HTTPException(
            status_code=400,
            detail="Unrecognized schema. Expected ULB (Time, V1-V28, Amount, Class) or synthetic (customer_id, amount, timestamp, is_fraud).",
        )

    _validate_schema(df, dtype)
    with state.lock():
        state.reset_pipeline()
        state.set_dataset(
            df,
            dataset_type=dtype,
            source_name=f"Upload · {file.filename}",
            is_ulb=is_ulb,
        )
        return state.dataset_summary()


@router.get("/status")
def data_status():
    state = get_state()
    with state.lock():
        if state.dataset is None:
            return {"loaded": False}
        summary = dict(state.dataset_summary() or {})
        summary["loaded"] = True
        summary["dataset_type"] = state.dataset_type
        summary["source"] = state.source_name
        return summary


@router.get("/preview")
def data_preview(limit: int = Query(50, ge=1, le=500)):
    state = get_state()
    with state.lock():
        loaded = require_dataset(state)
        df = loaded.head(limit).copy()
        dataset_type = state.dataset_type
        total = len(loaded)
    records = df.astype(object).where(pd.notnull(df), None)
    return {
        "columns": list(df.columns),
        "rows": records.to_dict(orient="records"),
        "total": total,
        "dataset_type": dataset_type,
    }


def _quick_detect(df: pd.DataFrame) -> str:
    ulb_columns = {"Time", "Amount", "Class", *[f"V{i}" for i in range(1, 29)]}
    if ulb_columns.issubset(df.columns):
        return "ulb_credit_card"
    if {"is_fraud", "customer_id", "amount", "timestamp"}.issubset(df.columns):
        return "synthetic_original"
    return "unknown"


def _validate_schema(df: pd.DataFrame, dtype: str) -> None:
    target = "Class" if dtype == "ulb_credit_card" else "is_fraud"
    labels = set(pd.Series(df[target]).dropna().unique())
    if not labels.issubset({0, 1, False, True}):
        raise HTTPException(status_code=400, detail=f"{target} must contain only 0 and 1.")

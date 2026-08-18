"""Pydantic request/response models for the API."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    rows: int = Field(10000, ge=100, le=2_000_000)
    fraud_rate: float = Field(0.02, ge=0.0, le=1.0)
    n_customers: int = Field(500, ge=10, le=100_000)
    seed: int = 42
    start_date: str = "2024-01-01"
    end_date: str = "2024-12-31"


class ULBGenerateRequest(BaseModel):
    rows: int = Field(284807, ge=100, le=5_000_000)
    fraud_rate: float = Field(0.00172, ge=0.0, le=1.0)
    seed: int = 42


class TrainRequest(BaseModel):
    n_estimators: int = Field(200, ge=10, le=1000)
    use_smote: bool = False
    temporal_split: bool = False
    test_size: float = Field(0.2, gt=0.0, lt=1.0)
    cv_folds: int = Field(5, ge=2, le=20)
    alert_threshold: float = Field(0.5, ge=0.0, le=1.0)


class ScoreTransactionRequest(BaseModel):
    transaction: dict


class ScoreBatchRequest(BaseModel):
    transactions: list[dict]


class UpdateAlertRequest(BaseModel):
    status: str
    notes: Optional[str] = None


class BenchmarkRequest(BaseModel):
    rows: int = Field(50000, ge=100, le=5_000_000)
    use_smote: bool = True
    n_estimators: int = Field(200, ge=10, le=1000)
    force_synthetic: bool = True

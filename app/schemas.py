"""Pydantic request/response models for the API."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field, model_validator


class GenerateRequest(BaseModel):
    rows: int = Field(10000, ge=100, le=500_000)
    fraud_rate: float = Field(0.02, gt=0.0, lt=1.0)
    n_customers: int = Field(500, ge=10, le=100_000)
    seed: int = 42
    start_date: str = "2024-01-01"
    end_date: str = "2024-12-31"

    @model_validator(mode="after")
    def validate_date_range(self):
        from datetime import date

        try:
            start = date.fromisoformat(self.start_date)
            end = date.fromisoformat(self.end_date)
        except ValueError as exc:
            raise ValueError("start_date and end_date must use YYYY-MM-DD format") from exc
        if start >= end:
            raise ValueError("end_date must be later than start_date")
        return self


class ULBGenerateRequest(BaseModel):
    rows: int = Field(284807, ge=100, le=500_000)
    fraud_rate: float = Field(0.00172, gt=0.0, lt=1.0)
    seed: int = 42


class TrainRequest(BaseModel):
    n_estimators: int = Field(200, ge=10, le=1000)
    use_smote: bool = False
    temporal_split: bool = False
    test_size: float = Field(0.2, gt=0.0, lt=1.0)
    cv_folds: int = Field(5, ge=2, le=20)
    alert_threshold: float = Field(0.5, ge=0.0, le=1.0)


class ScoreTransactionRequest(BaseModel):
    transaction: dict = Field(min_length=1)


class ScoreBatchRequest(BaseModel):
    transactions: list[dict] = Field(min_length=1, max_length=10_000)


class UpdateAlertRequest(BaseModel):
    status: str
    notes: Optional[str] = None


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=256)


class BenchmarkRequest(BaseModel):
    rows: int = Field(50000, ge=5_000, le=250_000)
    use_smote: bool = True
    n_estimators: int = Field(200, ge=10, le=1000)
    force_synthetic: bool = True

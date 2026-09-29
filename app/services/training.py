"""Training orchestration service.

Encapsulates the full train pipeline (preprocess → engineer → train →
score → alert) so API routes stay thin and the logic is testable in
isolation from the HTTP layer.
"""

from __future__ import annotations

import time

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

from app.api.deps import metrics_to_dict
from app.core.alert_system import AlertSystem
from app.core.detector import FraudDetector
from app.core.feature_engineer import FeatureEngineer
from app.core.model import FraudModel
from app.core.preprocessor import TransactionPreprocessor
from app.core.ulb_preprocessor import ULBPreprocessor
from app.schemas import TrainRequest


def run_training_pipeline(df: pd.DataFrame, req: TrainRequest, *, is_ulb: bool) -> dict:
    """Train both models, score the dataset, and wire the alert system.

    The raw dataset is split before fitting any scaler, encoder, or feature
    statistic.  This keeps evaluation data out of the fitted pipeline.
    """
    df = df.copy().reset_index(drop=True)
    target = "Class" if is_ulb else "is_fraud"
    _validate_target(df, target)

    if "transaction_id" not in df.columns:
        prefix = "ULB" if is_ulb else "TXN"
        df.insert(0, "transaction_id", [f"{prefix}-{i:07d}" for i in range(len(df))])

    train_raw, test_raw, split_method = _split_raw_data(
        df,
        target=target,
        temporal=req.temporal_split,
        test_size=req.test_size,
    )

    if is_ulb:
        preprocessor = ULBPreprocessor()
        train_processed = preprocessor.fit_transform(train_raw)
        test_processed = preprocessor.transform(test_raw)
        feature_cols = preprocessor.get_feature_columns()
        engineer = None
    else:
        preprocessor = TransactionPreprocessor()
        train_processed = preprocessor.fit_transform(train_raw)
        test_processed = preprocessor.transform(test_raw)
        engineer = FeatureEngineer()
        train_processed = engineer.fit_transform(train_processed)
        test_processed = engineer.transform(test_processed)
        feature_cols = [
            c
            for c in (
                preprocessor.get_feature_columns()
                + engineer.get_feature_columns()
            )
            if c in train_processed.columns and c in test_processed.columns
        ]

    fraud_rate = float(df[target].mean())
    model = FraudModel(
        n_estimators=req.n_estimators,
        contamination=fraud_rate,
        use_smote=req.use_smote,
        test_size=req.test_size,
        cv_folds=req.cv_folds,
    )

    t0 = time.perf_counter()
    metrics = model.train_pre_split(
        train_processed,
        test_processed,
        feature_cols,
        target_column=target,
        split_method=split_method,
        cross_validate=not req.temporal_split,
        decision_threshold=req.alert_threshold,
    )
    train_elapsed = time.perf_counter() - t0

    detector = FraudDetector(model, preprocessor, engineer)
    alert_system = AlertSystem(alert_threshold=req.alert_threshold)

    all_results = detector.score_batch(df)
    alerts = alert_system.process_results(all_results)

    result_rows = pd.DataFrame([r.to_dict() for r in all_results])
    raw_rows = df.reset_index(drop=True)
    # Preserve useful transaction context in the scored table without
    # duplicating the identifier supplied by ScoringResult.
    raw_rows = raw_rows.drop(columns=["transaction_id"], errors="ignore")
    scored = pd.concat([result_rows, raw_rows], axis=1)
    if target == "Class":
        scored["is_fraud"] = scored["Class"].astype(int)

    metrics_dict = metrics_to_dict(metrics)
    metrics_dict["train_elapsed_s"] = round(train_elapsed, 3)

    return {
        "model": model,
        "preprocessor": preprocessor,
        "engineer": engineer,
        "detector": detector,
        "alert_system": alert_system,
        "metrics": metrics_dict,
        "feature_columns": model.feature_columns,
        "scored": scored,
        "alerts_generated": len(alerts),
    }


def _validate_target(df: pd.DataFrame, target: str) -> None:
    if target not in df.columns:
        raise ValueError(f"Missing target column: {target}")
    values = set(pd.Series(df[target]).dropna().astype(int).unique())
    if not values.issubset({0, 1}) or values != {0, 1}:
        raise ValueError(
            f"{target} must be binary and contain both legitimate (0) and fraud (1) rows."
        )


def _split_raw_data(
    df: pd.DataFrame,
    *,
    target: str,
    temporal: bool,
    test_size: float,
) -> tuple[pd.DataFrame, pd.DataFrame, str]:
    if temporal:
        time_column = "Time" if "Time" in df.columns else "timestamp"
        if time_column not in df.columns:
            raise ValueError("Temporal splitting requires a Time or timestamp column.")
        ordered = df.copy()
        if time_column == "timestamp":
            parsed_time = pd.to_datetime(ordered[time_column], errors="coerce")
            if parsed_time.isna().any():
                raise ValueError("Temporal splitting requires valid timestamp values.")
            ordered["__split_time"] = parsed_time
            ordered = ordered.sort_values("__split_time").drop(columns="__split_time")
        else:
            ordered = ordered.sort_values(time_column)
        ordered = ordered.reset_index(drop=True)
        split_idx = int(len(ordered) * (1 - test_size))
        train_raw = ordered.iloc[:split_idx].copy()
        test_raw = ordered.iloc[split_idx:].copy()
        split_method = "temporal"
    else:
        train_raw, test_raw = train_test_split(
            df,
            test_size=test_size,
            random_state=42,
            stratify=df[target],
        )
        train_raw = train_raw.reset_index(drop=True)
        test_raw = test_raw.reset_index(drop=True)
        split_method = "random_stratified"

    for name, part in (("training", train_raw), ("test", test_raw)):
        if len(np.unique(part[target].astype(int))) < 2:
            raise ValueError(
                f"The {name} partition contains only one class. Add more fraud rows "
                "or choose a random stratified split."
            )
    return train_raw, test_raw, split_method

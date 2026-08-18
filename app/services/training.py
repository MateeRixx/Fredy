"""Training orchestration service.

Encapsulates the full train pipeline (preprocess → engineer → train →
score → alert) so API routes stay thin and the logic is testable in
isolation from the HTTP layer.
"""

from __future__ import annotations

import time

import pandas as pd

from app.api.deps import metrics_to_dict
from app.core.alert_system import AlertSystem
from app.core.detector import FraudDetector
from app.core.feature_engineer import FeatureEngineer
from app.core.model import FraudModel
from app.core.preprocessor import TransactionPreprocessor
from app.core.ulb_preprocessor import ULBPreprocessor
from app.schemas import TrainRequest


def run_training_pipeline(df: pd.DataFrame, req: TrainRequest, *, is_ulb: bool) -> dict:
    """Train both models, score the dataset, and wire the alert system."""
    if is_ulb:
        preprocessor = ULBPreprocessor()
        df_processed = preprocessor.fit_transform(df)
        feature_cols = preprocessor.get_feature_columns()
        target = "Class"
        engineer = None
    else:
        preprocessor = TransactionPreprocessor()
        df_processed = preprocessor.fit_transform(df)
        engineer = FeatureEngineer()
        df_processed = engineer.fit_transform(df_processed)
        feature_cols = [
            c
            for c in (
                preprocessor.get_feature_columns()
                + engineer.get_feature_columns()
            )
            if c in df_processed.columns
        ]
        target = "is_fraud"

    fraud_rate = float(df[target].mean())
    model = FraudModel(
        n_estimators=req.n_estimators,
        contamination=fraud_rate,
        use_smote=req.use_smote,
        test_size=req.test_size,
        cv_folds=req.cv_folds,
    )

    t0 = time.perf_counter()
    metrics = model.train(
        df_processed,
        feature_cols,
        target_column=target,
        temporal_split=req.temporal_split,
        time_column="Time" if is_ulb else None,
    )
    train_elapsed = time.perf_counter() - t0

    detector = FraudDetector(model, preprocessor, engineer)
    alert_system = AlertSystem(alert_threshold=req.alert_threshold)

    all_results = detector.score_batch(df)
    alerts = alert_system.process_results(all_results)

    scored = pd.DataFrame([r.to_dict() for r in all_results])
    if not is_ulb and "is_fraud" in df.columns:
        scored["is_fraud"] = df["is_fraud"].values
    if is_ulb and "Class" in df.columns:
        scored["is_fraud"] = df["Class"].values

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
"""Shared API dependencies: session access + serialization helpers."""

from __future__ import annotations

import numpy as np
import pandas as pd
from fastapi import HTTPException

from app.state import state


def get_state():
    return state


def require_dataset(state) -> pd.DataFrame:
    if state.dataset is None:
        raise HTTPException(
            status_code=400,
            detail="No dataset loaded. Generate or upload data first.",
        )
    return state.dataset


def require_model(state) -> None:
    if not state.has_model():
        raise HTTPException(
            status_code=400,
            detail="No trained model available. Train a model first.",
        )


def metrics_to_dict(metrics) -> dict:
    if metrics is None:
        return None
    cm = metrics.confusion_matrix
    return {
        "accuracy": metrics.accuracy,
        "precision": metrics.precision,
        "recall": metrics.recall,
        "f1": metrics.f1,
        "roc_auc": metrics.roc_auc,
        "pr_auc": metrics.pr_auc,
        "split_method": metrics.split_method,
        "cv_mean": float(np.mean(metrics.cv_scores)) if metrics.cv_scores else None,
        "cv_std": float(np.std(metrics.cv_scores)) if metrics.cv_scores else None,
        "confusion_matrix": cm.tolist() if cm is not None else None,
        "feature_importances": metrics.feature_importances,
        "classification_report": metrics.classification_report,
        "precision_curve": (
            metrics.precision_curve.tolist() if metrics.precision_curve is not None else None
        ),
        "recall_curve": (
            metrics.recall_curve.tolist() if metrics.recall_curve is not None else None
        ),
        "roc_fpr": (
            metrics.roc_fpr.tolist() if metrics.roc_fpr is not None else None
        ),
        "roc_tpr": (
            metrics.roc_tpr.tolist() if metrics.roc_tpr is not None else None
        ),
    }

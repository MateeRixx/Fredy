"""In-memory session state for the fraud detection API server.

Holds the fitted preprocessors, trained model, live detector, and
alert management so the UI can operate across multiple requests.
"""

from __future__ import annotations

import threading

import pandas as pd

from app.core.alert_system import AlertSystem
from app.core.detector import FraudDetector
from app.core.feature_engineer import FeatureEngineer
from app.core.model import FraudModel
from app.core.preprocessor import TransactionPreprocessor
from app.core.ulb_preprocessor import ULBPreprocessor


class SessionState:
    """Thread-safe container for pipeline artifacts shared across requests."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._preprocessor: TransactionPreprocessor | None = None
        self._ulb_preprocessor: ULBPreprocessor | None = None
        self._engineer: FeatureEngineer | None = None
        self._model: FraudModel | None = None
        self._detector: FraudDetector | None = None
        self._alert_system: AlertSystem | None = None
        self._metrics: dict | None = None
        self._dataset: pd.DataFrame | None = None
        self._dataset_meta: dict | None = None
        self._dataset_type: str | None = None
        self._source_name: str | None = None
        self._is_ulb: bool = False
        self._feature_columns: list[str] = []
        self._scored: pd.DataFrame | None = None

    @property
    def preprocessor(self) -> TransactionPreprocessor | None:
        return self._preprocessor

    @property
    def ulb_preprocessor(self) -> ULBPreprocessor | None:
        return self._ulb_preprocessor

    @property
    def engineer(self) -> FeatureEngineer | None:
        return self._engineer

    @property
    def model(self) -> FraudModel | None:
        return self._model

    @property
    def detector(self) -> FraudDetector | None:
        return self._detector

    @property
    def alert_system(self) -> AlertSystem | None:
        return self._alert_system

    @property
    def metrics(self) -> dict | None:
        return self._metrics

    @property
    def dataset(self) -> pd.DataFrame | None:
        return self._dataset

    @property
    def dataset_type(self) -> str | None:
        return self._dataset_type

    @property
    def source_name(self) -> str | None:
        return self._source_name

    @property
    def is_ulb(self) -> bool:
        return self._is_ulb

    @property
    def feature_columns(self) -> list[str]:
        return list(self._feature_columns)

    @property
    def scored(self) -> pd.DataFrame | None:
        return self._scored

    def has_model(self) -> bool:
        return self._model is not None and getattr(self._model, "_trained", False)

    def lock(self):
        return self._lock

    # ------------------------------------------------------------------
    # Dataset management
    # ------------------------------------------------------------------

    def set_dataset(
        self,
        df: pd.DataFrame,
        *,
        dataset_type: str,
        source_name: str,
        is_ulb: bool,
    ) -> None:
        self._dataset = df
        self._dataset_type = dataset_type
        self._source_name = source_name
        self._is_ulb = is_ulb
        self._dataset_meta = _summarize_dataset(df, is_ulb=is_ulb)

    def dataset_summary(self) -> dict | None:
        return self._dataset_meta

    # ------------------------------------------------------------------
    # Pipeline reset / teardown
    # ------------------------------------------------------------------

    def reset_pipeline(self) -> None:
        self._preprocessor = None
        self._ulb_preprocessor = None
        self._engineer = None
        self._model = None
        self._detector = None
        self._alert_system = None
        self._metrics = None
        self._feature_columns = []
        self._scored = None

    def set_processed_state(
        self,
        *,
        model: FraudModel,
        preprocessor: TransactionPreprocessor | None,
        ulb_preprocessor: ULBPreprocessor | None,
        engineer: FeatureEngineer | None,
        detector: FraudDetector,
        alert_system: AlertSystem,
        metrics: dict,
        feature_columns: list[str],
    ) -> None:
        self._model = model
        self._preprocessor = preprocessor
        self._ulb_preprocessor = ulb_preprocessor
        self._engineer = engineer
        self._detector = detector
        self._alert_system = alert_system
        self._metrics = metrics
        self._feature_columns = list(feature_columns)

    def set_scored(self, df: pd.DataFrame) -> None:
        self._scored = df


def _summarize_dataset(df: pd.DataFrame, *, is_ulb: bool) -> dict:
    n = len(df)
    if is_ulb:
        fraud = int(df["Class"].sum())
        label = "Class"
    else:
        fraud = int(df.get("is_fraud", pd.Series(0, index=df.index)).sum())
        label = "is_fraud"
    return {
        "total": n,
        "fraud": fraud,
        "legit": n - fraud,
        "fraud_rate": fraud / n if n else 0.0,
        "label_column": label,
        "columns": list(df.columns),
    }


state = SessionState()

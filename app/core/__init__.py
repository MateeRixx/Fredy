"""
Fraud Detection System
=====================

An ML-based financial fraud detection pipeline combining Random Forest
classification with Isolation Forest anomaly detection.

Designed at the intersection of cybersecurity and finance.

Supports both synthetic data and real-world datasets including the
ULB Credit Card Fraud dataset from Kaggle.
"""

__version__ = "2.0.0"

from app.core.preprocessor import TransactionPreprocessor
from app.core.feature_engineer import FeatureEngineer
from app.core.model import FraudModel
from app.core.detector import FraudDetector
from app.core.alert_system import AlertSystem
from app.core.visualizer import FraudVisualizer
from app.core.data_loader import load_dataset, load_ulb_credit_card
from app.core.ulb_preprocessor import ULBPreprocessor

__all__ = [
    "TransactionPreprocessor",
    "FeatureEngineer",
    "FraudModel",
    "FraudDetector",
    "AlertSystem",
    "FraudVisualizer",
    "ULBPreprocessor",
    "load_dataset",
    "load_ulb_credit_card",
]

"""
Benchmark runner for the fraud detection system.

Runs the full pipeline on the ULB Credit Card Fraud dataset (or
ULB-format synthetic fallback) and reports honest metrics with
proper temporal train/test splitting.

Usage:
    python -m benchmarks.run_benchmark
    python -m benchmarks.run_benchmark --data data/raw/creditcard.csv
    python -m benchmarks.run_benchmark --synthetic
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import (
    average_precision_score,
    f1_score,
    precision_score,
    precision_recall_curve,
    recall_score,
    roc_auc_score,
)

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.data_loader import load_dataset, generate_ulb_format_synthetic
from app.core.model import FraudModel
from app.core.ulb_preprocessor import ULBPreprocessor


def run_benchmark(
    data_path: str = "data/raw/creditcard.csv",
    force_synthetic: bool = False,
    use_smote: bool = True,
    n_estimators: int = 200,
    synthetic_rows: int = 50000,
    output_dir: str = "benchmarks/results",
) -> dict:
    """Run the full benchmark pipeline.

    Args:
        data_path: Path to ULB Credit Card dataset CSV.
        force_synthetic: If True, always use synthetic data.
        use_smote: Whether to apply SMOTE on training set.
        n_estimators: Number of trees for Random Forest.
        output_dir: Directory for benchmark outputs.

    Returns:
        Dictionary of benchmark results.
    """
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("  Fraud Detection System — Benchmark Runner")
    print("=" * 70)

    # ------------------------------------------------------------------
    # 1. Load data
    # ------------------------------------------------------------------
    print("\n[1/5] Loading dataset...")
    start_time = time.time()

    if force_synthetic:
        df = generate_ulb_format_synthetic(n_rows=synthetic_rows)
        data_source = f"ULB-format synthetic ({synthetic_rows:,} rows)"
    else:
        df = load_dataset(
            data_path,
            fallback_synthetic=True,
            synthetic_n=synthetic_rows,
        )
        real_path = Path(data_path)
        data_source = (
            "ULB Credit Card (real)"
            if real_path.exists()
            else f"ULB-format synthetic ({synthetic_rows:,} rows)"
        )

    n_total = len(df)
    n_fraud = int(df["Class"].sum())
    n_legit = n_total - n_fraud
    fraud_rate = n_fraud / n_total

    print(f"  Source: {data_source}")
    print(f"  Transactions: {n_total:,}")
    print(f"  Fraud: {n_fraud:,} ({fraud_rate:.3%})")
    print(f"  Legitimate: {n_legit:,}")

    # ------------------------------------------------------------------
    # 2. Temporal split (before preprocessing to prevent leakage)
    # ------------------------------------------------------------------
    print("\n[2/5] Temporal train/test split...")
    ordered = df.sort_values("Time").reset_index(drop=True)
    split_idx = int(len(ordered) * 0.8)
    train_raw = ordered.iloc[:split_idx].copy()
    test_raw = ordered.iloc[split_idx:].copy()

    # ------------------------------------------------------------------
    # 3. Preprocess (fit on training partition only)
    # ------------------------------------------------------------------
    print("\n[3/5] Preprocessing...")
    preprocessor = ULBPreprocessor()
    df_train = preprocessor.fit_transform(train_raw)
    df_test = preprocessor.transform(test_raw)
    feature_cols = preprocessor.get_feature_columns()
    print(f"  Features: {len(feature_cols)}")

    print(f"  Training set: {len(df_train):,} ({df_train['Class'].sum():,.0f} fraud)")
    print(f"  Test set:     {len(df_test):,} ({df_test['Class'].sum():,.0f} fraud)")

    # ------------------------------------------------------------------
    # 4. Train models
    # ------------------------------------------------------------------
    print("\n[4/5] Training models...")

    results = {}

    # --- Random Forest ---
    print("\n  --- Random Forest (class_weight='balanced') ---")
    rf_model = FraudModel(
        n_estimators=n_estimators,
        contamination=fraud_rate,
        rf_class_weight="balanced",
        use_smote=use_smote,
    )
    rf_model.train_pre_split(
        df_train,
        df_test,
        feature_cols,
        target_column="Class",
        split_method="temporal",
    )

    # --- Isolation Forest (standalone) ---
    print("\n  --- Isolation Forest (unsupervised) ---")
    X_train = df_train[feature_cols].values.astype(np.float64)
    X_test = df_test[feature_cols].values.astype(np.float64)
    y_train = df_train["Class"].values.astype(int)
    y_test = df_test["Class"].values.astype(int)
    X_train = np.nan_to_num(X_train, nan=0.0, posinf=0.0, neginf=0.0)
    X_test = np.nan_to_num(X_test, nan=0.0, posinf=0.0, neginf=0.0)

    rf_scores = rf_model.predict_proba(X_test)
    rf_predictions = rf_scores >= 0.5
    results["random_forest"] = {
        "roc_auc": float(roc_auc_score(y_test, rf_scores)),
        "pr_auc": float(average_precision_score(y_test, rf_scores)),
        "f1": float(f1_score(y_test, rf_predictions)),
        "precision": float(precision_score(y_test, rf_predictions, zero_division=0)),
        "recall": float(recall_score(y_test, rf_predictions, zero_division=0)),
    }
    print(f"    ROC AUC:   {results['random_forest']['roc_auc']:.4f}")
    print(f"    PR AUC:    {results['random_forest']['pr_auc']:.4f}")
    print(f"    F1:        {results['random_forest']['f1']:.4f}")
    print(f"    Precision: {results['random_forest']['precision']:.4f}")
    print(f"    Recall:    {results['random_forest']['recall']:.4f}")

    iso_model = FraudModel(
        n_estimators=n_estimators,
        contamination=fraud_rate,
    )
    # Train using the same temporal split
    iso_model.train_pre_split(
        df_train,
        df_test,
        feature_cols,
        target_column="Class",
        split_method="temporal",
    )
    # Get anomaly scores on test set
    iso_scores = iso_model.anomaly_scores(X_test)
    iso_roc_auc = float(roc_auc_score(y_test, iso_scores))
    iso_pr_auc = float(average_precision_score(y_test, iso_scores))

    results["isolation_forest"] = {
        "roc_auc": iso_roc_auc,
        "pr_auc": iso_pr_auc,
    }
    print(f"    ROC AUC: {iso_roc_auc:.4f}")
    print(f"    PR AUC:  {iso_pr_auc:.4f}")

    # --- Hybrid ---
    print("\n  --- Hybrid (RF 0.7 + IF 0.3) ---")
    hybrid_scores = rf_model.hybrid_score(X_test)
    hybrid_roc_auc = float(roc_auc_score(y_test, hybrid_scores))
    hybrid_pr_auc = float(average_precision_score(y_test, hybrid_scores))

    # Select the threshold on training data, then report F1 once on the
    # untouched test set.  Selecting a threshold on test labels inflates the
    # reported result.
    train_hybrid_scores = rf_model.hybrid_score(X_train)
    precisions, recalls, thresholds = precision_recall_curve(
        y_train, train_hybrid_scores
    )
    f1_scores = 2 * (precisions * recalls) / (precisions + recalls + 1e-10)
    best_idx = np.argmax(f1_scores)
    best_threshold = float(thresholds[best_idx]) if best_idx < len(thresholds) else 0.5
    best_f1 = float(f1_score(y_test, hybrid_scores >= best_threshold))

    results["hybrid"] = {
        "roc_auc": hybrid_roc_auc,
        "pr_auc": hybrid_pr_auc,
        "best_f1": best_f1,
        "best_threshold": best_threshold,
    }
    print(f"    ROC AUC:        {hybrid_roc_auc:.4f}")
    print(f"    PR AUC:         {hybrid_pr_auc:.4f}")
    print(f"    Best F1:        {best_f1:.4f} (threshold={best_threshold:.4f})")

    # ------------------------------------------------------------------
    # 5. Summary table
    # ------------------------------------------------------------------
    elapsed = time.time() - start_time
    print("\n[5/5] Benchmark Summary")
    print("=" * 70)
    print(f"  Data source: {data_source}")
    print(f"  SMOTE: {'enabled' if use_smote else 'disabled'}")
    print(f"  Split: temporal (80/20)")
    print(f"  Elapsed: {elapsed:.1f}s")
    print()
    print(f"  {'Model':<25} {'ROC AUC':>10} {'PR AUC':>10} {'F1':>10}")
    print(f"  {'-'*25} {'-'*10} {'-'*10} {'-'*10}")
    print(
        f"  {'Random Forest':<25} "
        f"{results['random_forest']['roc_auc']:>10.4f} "
        f"{results['random_forest']['pr_auc']:>10.4f} "
        f"{results['random_forest']['f1']:>10.4f}"
    )
    print(
        f"  {'Isolation Forest':<25} "
        f"{results['isolation_forest']['roc_auc']:>10.4f} "
        f"{results['isolation_forest']['pr_auc']:>10.4f} "
        f"{'N/A':>10}"
    )
    print(
        f"  {'Hybrid (RF+IF)':<25} "
        f"{results['hybrid']['roc_auc']:>10.4f} "
        f"{results['hybrid']['pr_auc']:>10.4f} "
        f"{results['hybrid']['best_f1']:>10.4f}"
    )
    print("=" * 70)

    # Save results
    results_df = pd.DataFrame([
        {
            "model": "Random Forest",
            "roc_auc": results["random_forest"]["roc_auc"],
            "pr_auc": results["random_forest"]["pr_auc"],
            "f1": results["random_forest"]["f1"],
            "precision": results["random_forest"]["precision"],
            "recall": results["random_forest"]["recall"],
        },
        {
            "model": "Isolation Forest",
            "roc_auc": results["isolation_forest"]["roc_auc"],
            "pr_auc": results["isolation_forest"]["pr_auc"],
            "f1": None,
            "precision": None,
            "recall": None,
        },
        {
            "model": "Hybrid (RF+IF)",
            "roc_auc": results["hybrid"]["roc_auc"],
            "pr_auc": results["hybrid"]["pr_auc"],
            "f1": results["hybrid"]["best_f1"],
            "precision": None,
            "recall": None,
        },
    ])
    results_df.to_csv(output / "benchmark_results.csv", index=False)
    print(f"\n  Results saved to {output}/benchmark_results.csv")

    return results


def _extract_metrics(metrics) -> dict:
    """Extract key metrics into a flat dictionary."""
    return {
        "accuracy": metrics.accuracy,
        "precision": metrics.precision,
        "recall": metrics.recall,
        "f1": metrics.f1,
        "roc_auc": metrics.roc_auc,
        "pr_auc": metrics.pr_auc,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run fraud detection benchmarks"
    )
    parser.add_argument(
        "--data",
        type=str,
        default="data/raw/creditcard.csv",
        help="Path to ULB Credit Card dataset CSV",
    )
    parser.add_argument(
        "--synthetic",
        action="store_true",
        help="Force use of synthetic data",
    )
    parser.add_argument(
        "--no-smote",
        action="store_true",
        help="Disable SMOTE oversampling",
    )
    parser.add_argument(
        "--estimators",
        type=int,
        default=200,
        help="Number of trees (default: 200)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="benchmarks/results",
        help="Output directory for results",
    )

    args = parser.parse_args()

    try:
        run_benchmark(
            data_path=args.data,
            force_synthetic=args.synthetic,
            use_smote=not args.no_smote,
            n_estimators=args.estimators,
            output_dir=args.output,
        )
    except Exception as exc:
        print(f"\nBenchmark failed: {exc}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())

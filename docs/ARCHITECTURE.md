# Architecture

## Overview

Fraud Command is a layered web application: a React single-page app talks to a
FastAPI backend over a JSON REST API; the backend drives a scikit-learn ML
engine that scores transactions and maintains an alert queue.

```
Browser ──▶ React (frontend/)
              │  JSON / REST
              ▼
         FastAPI (app/)
         │  ├─ api/      routers (data, model, scoring, alerts…)
         │  ├─ services/ training pipeline orchestration
         │  └─ core/     ML engine
         ▼
   in-memory state (app/state.py)   ── model, preprocessors, scored rows, alerts
```

## Request lifecycle

1. **Data load** — a dataset is generated or uploaded (`/api/data/*`). The
   pipeline state is reset and the raw frame held in `SessionState`.
2. **Training** (`/api/model/train`) — `app/services/training.py` runs the full
   pipeline: preprocess → feature-engineer → train RF + IF → evaluate →
   score the dataset → build the alert queue. Results (metrics, feature
   importance, ROC curves) are stored in state.
3. **Scoring** (`/api/score/*`) — a live `FraudDetector` scores one or many
   transactions using the fitted preprocessors + models, producing
   `fraud_probability`, `anomaly_score`, `hybrid_score`, `risk_level`, and
   `contributing_factors`.
4. **Triage** (`/api/alerts/*`) — analysts confirm/dismiss alerts, feeding
   back into a false-positive rate metric.

## ML engine (app/core)

| Module | Responsibility |
|--------|----------------|
| `preprocessor.py` | Transaction cleaning, missing values, encoding, time features |
| `feature_engineer.py` | Velocity, amount-pattern, geo-anomaly, time-of-day features |
| `ulb_preprocessor.py` | ULB Credit Card schema (Time, V1–V28, Amount, Class) |
| `model.py` | Random Forest + Isolation Forest training, metrics (incl. PR-AUC, ROC curves, temporal split, CV) |
| `detector.py` | Real-time scoring: fuses RF probability + IF anomaly score into `hybrid_score`; risk bucketing; contributing factors |
| `alert_system.py` | Alert records, status lifecycle, false-positive tracking |
| `visualizer.py` | Plot generation (ROCs, PR curves, distributions) |

### Risk scoring

```
hybrid_score = α · fraud_probability + (1 − α) · (1 − anomaly_score)
```

Risk levels: `critical ≥ 0.70`, `high ≥ 0.50`, `medium ≥ 0.30`, else `low`.

Isolation Forest scores are calibrated against percentiles learned from the
training partition. This makes a transaction's score stable whether it is
submitted alone or as part of a batch.

## State management

State lives in a single thread-safe `SessionState` singleton (`app/state.py`),
holding the fitted artifacts in memory. This is appropriate for a single-node
demo/analyst console; for horizontal scale the artifacts would move to model
storage (S3/Redis) behind a retraining service.

## Observability

- **`/api/health`** — liveness + dataset/model presence
- **`/api/ready`** — readiness probe (used by container healthchecks)
- **`/metrics`** — Prometheus request counters/durations (per route)
- **Structured logging** — JSON lines to stdout (`LOG_FORMAT=json`), one line
  per request with method, path, status, and duration

## Static frontend

In production the backend serves the built `frontend/dist` assets: `/assets/*`
from disk and an SPA fallback for all other routes. Docker also offers an
nginx frontend image that proxies `/api/` to the backend.

# Fraud Command — Real-Time Fraud Detection System

An end-to-end fraud detection platform for financial transactions: a hybrid
**Random Forest + Isolation Forest** scoring engine, an analyst alert-triage
workflow, a monitoring console, and full observability — packaged for
production with Docker and CI.

```
Raw Transactions → Preprocess → Feature Engineering → Model Training
                                                         │
                   Alert Triage ← Scoring Engine ← Hybrid RF + IF
                   (analyst feedback loop)
```

## Highlights

- **Hybrid model** — Random Forest (supervised) + Isolation Forest (unsupervised)
  fused into a single risk score. Catches fraud patterns neither approach
  catches alone.
- **Two pipeline modes** — rich transaction features for synthetic data, and a
  specialized ULB Credit Card Fraud pipeline (PCA features, 0.17% fraud).
- **Honest evaluation** — PR-AUC over ROC-AUC for imbalanced classes; optional
  **temporal train/test splits** to prevent data leakage.
- **Analyst workflow** — alerts with risk levels, contributing factors, and a
  confirmed / false-positive feedback loop that tracks false-positive rate.
- **Real-time scoring API** — single-transaction and batch endpoints returning
  probability, anomaly score, and hybrid risk in milliseconds.
- **Production ready** — FastAPI + React UI, Docker Compose, Prometheus
  metrics, structured JSON logging, health/readiness probes, CI pipeline.

## Architecture

| Layer       | Tech                                    |
|-------------|------------------------------------------|
| API         | FastAPI, Pydantic v2, Uvicorn            |
| ML Engine   | scikit-learn (RF, IF), imbalanced-learn  |
| Frontend    | React 18 + Vite + Tailwind (dark console)|
| Observability| Prometheus `/metrics`, JSON logs        |
| Deployment  | Docker Compose, Nginx, health checks     |

```
app/               # Backend package
├── main.py        # FastAPI app factory (middleware, static serving)
├── config.py      # pydantic-settings (.env / env vars)
├── logging.py     # structured JSON logging
├── state.py       # in-memory session state (model, alerts)
├── schemas.py     # request/response models
├── api/           # routers: health, data, model, scoring, alerts, benchmark
├── services/      # business logic (training pipeline)
└── core/          # ML engine: preprocessors, feature engineering, models
frontend/          # React console (Vite + Tailwind)
tests/             # 79 unit + API integration tests
benchmarks/        # honest benchmarking (temporal splits, ULB)
docs/              # architecture, deployment, API reference
docker/            # Dockerfiles + nginx config
```

## Quick Start (local)

```bash
# 1. Backend
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt   # Windows
.venv/bin/python -m pip install -r requirements.txt        # macOS/Linux

# 2. Frontend
cd frontend && npm install && npm run build && cd ..

# 3. Run
.venv/Scripts/python run_server.py     # → http://127.0.0.1:8000
```

Open http://127.0.0.1:8000 — the console shows the pipeline status dashboard.
API docs at http://127.0.0.1:8000/docs, metrics at `/metrics`.

## Quick Start (Docker)

```bash
cp .env.example .env
docker compose up -d --build
# Backend:  http://localhost:8000
# Frontend: http://localhost
```

## CLI

The original CLI is preserved in `main.py`:

```bash
.venv/Scripts/python main.py --generate --train --evaluate
```

## Tests

```bash
.venv/Scripts/python -m pytest -q        # 79 tests
```

## Benchmark Results

| Dataset  | Model  | ROC-AUC | PR-AUC | F1  | Split |
|----------|--------|---------|--------|-----|-------|
| Synthetic| Hybrid | 0.9998  | —      | —   | random |
| ULB      | Hybrid | 0.9984  | 0.9081 | 0.62| temporal |

Run fresh benchmarks with:

```bash
.venv/Scripts/python benchmarks/run_benchmark.py
```

## Project Roadmap

- [x] Hybrid RF + IF scoring engine
- [x] Real-time scoring API + analyst alert workflow
- [x] Web console (React)
- [x] Docker + CI + observability
- [ ] Model persistence / retraining scheduler
- [ ] Role-based access control (RBAC)
- [ ] Online model evaluation (drift detection)

## License

This project is released for demonstration and educational purposes.
The ULB Credit Card Fraud dataset is available under the Open Database
License (ODbL) v1.0.
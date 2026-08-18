# Deployment

## Prerequisites

- Docker + Docker Compose v2
- Node 18+ (only for local frontend builds)
- Python 3.10+ (only for local backend)

## Production via Docker Compose

```bash
cp .env.example .env          # adjust ENVIRONMENT, LOG_LEVEL, CORS_ORIGINS
docker compose up -d --build
```

- Backend: `http://localhost:8000`
- Frontend (nginx): `http://localhost`
- API docs: `http://localhost:8000/docs`
- Prometheus metrics: `http://localhost:8000/metrics`

Compose runs two services with a healthcheck on the backend; the frontend only
starts once the backend is healthy.

## Configuration

All settings are environment variables (see `app/config.py` and `.env.example`):

| Variable | Default | Purpose |
|----------|---------|---------|
| `ENVIRONMENT` | `development` | App environment label |
| `LOG_FORMAT` | `json` | `json` or `text` logging |
| `LOG_LEVEL` | `INFO` | Log verbosity |
| `CORS_ORIGINS` | `["*"]` | Allowed origins (JSON list) |
| `FRONTEND_DIST` | `frontend/dist` | Built assets path |

## Manual deploy (no Docker)

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
cd frontend && npm ci && npm run build && cd ..
.venv/Scripts/python run_server.py            # or uvicorn app.main:app
```

For production, run behind a reverse proxy (nginx) and consider:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
```

> Note: in-memory state means multiple workers hold independent models.
> Keep `--workers 1` or move artifacts to shared storage before scaling.

## Cloud deployment

The image is cloud-agnostic:

- **AWS** — ECS/Fargate with ALB; logs to CloudWatch; metrics scraped by
  Prometheus or CloudWatch agent.
- **GCP** — Cloud Run (works with minimal change: it's a stateless HTTP app);
  logs to Cloud Logging.
- **Azure** — Container Apps with App Insights ingestion of JSON logs.

Health/readiness probes (`/api/health`, `/api/ready`) map directly onto
platform load-balancer checks.

## Health checks

| Endpoint | Use |
|----------|-----|
| `/api/health` | Liveness + status of dataset/model |
| `/api/ready` | Readiness — 200 when the instance can serve traffic |
| `/metrics` | Prometheus scrape target |
# API Reference

Base URL: `http://127.0.0.1:8000`
Interactive docs: `/docs` (Swagger) and `/redoc`.

## Data ingestion

### `POST /api/data/generate`

Generate a synthetic transaction dataset.

```json
{ "rows": 10000, "fraud_rate": 0.02, "n_customers": 500, "seed": 42,
  "start_date": "2024-01-01", "end_date": "2024-12-31" }
```

### `POST /api/data/generate-ulb`

Generate a ULB Credit Card schema dataset (Time, V1–V28, Amount, Class).

### `POST /api/data/upload`

Upload a CSV (`multipart/form-data`, field `file`). Auto-detects ULB vs
synthetic schema.

### `GET /api/data/status`

Returns whether a dataset is loaded plus its summary.

### `GET /api/data/preview?limit=50`

Returns the first rows and column list.

## Model

### `POST /api/model/train`

Train the hybrid model on the loaded dataset.

```json
{ "n_estimators": 200, "use_smote": false, "temporal_split": false,
  "test_size": 0.2, "cv_folds": 5, "alert_threshold": 0.5 }
```

Response includes `metrics` (accuracy, precision, recall, f1, roc_auc,
pr_auc, confusion_matrix, feature_importances, precision/recall curves,
roc_fpr/roc_tpr, cv_mean/cv_std, split_method, train_elapsed_s),
`alerts_generated`, `feature_count`, `is_ulb`.

### `GET /api/model/status`

Whether a model is trained plus its metrics.

## Scoring

### `POST /api/score/transaction`

Score a single transaction.

```json
{ "transaction": { "amount": 1200.0, "timestamp": "2024-06-01T12:00:00",
  "merchant_category": "travel", "transaction_type": "purchase",
  "channel": "online", "location": "CA" } }
```

Response: `fraud_probability`, `anomaly_score`, `hybrid_score`,
`risk_level`, `contributing_factors`.

### `POST /api/score/batch`

Score many transactions (list of transaction dicts).

### `GET /api/score/statistics`

Aggregate stats over all scored rows: total, mean/max score, risk distribution.

### `GET /api/scored?limit=200&risk=high&sort=hybrid_score&order=desc`

Paginated scored rows with optional risk filter and sort.

## Alerts

### `GET /api/alerts?limit=200&status=open&risk=high`

List alerts with counts (open, investigating, confirmed, false_positive,
dismissed, false_positive_rate).

### `POST /api/alerts/{alert_id}/update`

```json
{ "status": "confirmed_fraud", "notes": "matched customer history" }
```

Statuses: `open`, `investigating`, `confirmed_fraud`, `false_positive`,
`dismissed`.

## Benchmark

### `POST /api/benchmark/run`

Run the benchmark suite (temporal splits on ULB).

```json
{ "rows": 50000, "use_smote": true, "n_estimators": 200, "force_synthetic": true }
```

## Observability

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Liveness + dataset/model status |
| `GET /api/ready` | Readiness probe |
| `GET /api/app-info` | App name, version, environment |
| `GET /metrics` | Prometheus metrics |

## Error format

Errors use standard HTTP codes with a `{"detail": "message"}` body:
`400` invalid request / missing prerequisite, `404` not found, `500` failure.
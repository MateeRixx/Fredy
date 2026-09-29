# Testing and demonstration guide

## 1. Install and verify

From the repository root on Windows PowerShell:

```powershell
py -3.11 -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-dev.txt
npm.cmd --prefix frontend ci

.venv\Scripts\python.exe -m pytest -q
npm.cmd --prefix frontend run build
```

The regression suite includes checks that:

- a transaction's Isolation Forest score is unchanged when it is scored alone
  or included in a batch;
- feature engineering preserves transaction order;
- live scores are persisted;
- risk filtering returns only the requested risk level;
- live scores crossing the alert threshold create an alert.

## 2. Start the application

```powershell
.venv\Scripts\python.exe run_server.py
```

Open <http://127.0.0.1:8000>. API documentation is available at
<http://127.0.0.1:8000/docs>.

## 3. Main demonstration flow

1. On **Command**, generate 10,000 synthetic transactions at a 2% fraud rate.
2. Open **Model**, choose 80 trees, random stratified split, and an alert
   threshold of 0.30. Train the model.
3. Point out that ROC AUC, PR AUC, F1, precision, recall, and the confusion
   matrix now evaluate the same hybrid score used by the alert engine.
4. Open **Transactions**. Customer and amount context should be present, and
   the risk tabs should genuinely filter the table.
5. In **Live Score**, submit a suspicious transaction such as a large travel
   transfer at 02:00 from a foreign location.
6. The result appears immediately in the scored table. If it crosses the
   configured threshold, the response contains an alert ID and the alert is
   visible under **Alerts**.
7. Select the alert, add an analyst note, and mark it confirmed or false
   positive. The dashboard false-positive rate updates from resolved alerts.

## 4. ULB workflow

1. Generate a 50,000-row ULB-format dataset from **Command**.
2. Train with temporal splitting enabled.
3. Open **Transactions**. The live form switches to `Time`, `Amount`, and
   `V1`–`V28`, matching the trained model schema.
4. Run **Benchmarks** with 20,000 rows to demonstrate that the requested row
   count is honored and that preprocessing is fitted on the training period
   only.

## 5. Production-image smoke test

```powershell
docker compose up --build
```

Then verify:

```powershell
Invoke-RestMethod http://localhost:8000/api/health
Invoke-RestMethod http://localhost:8000/api/ready
```

The single-service production Dockerfile now includes the `data` and
`benchmarks` packages, so synthetic generation and benchmark routes are
available in Render/Railway-style deployments.

## Current boundary

This remains a single-node demonstration. Before using real financial data,
add authenticated roles, a durable transaction/alert database, encrypted
secrets, model registry/versioning, scheduled retraining, and drift monitoring.

# Fraud Command testing data

This folder contains deterministic, non-sensitive data for manual and API
testing. None of the records represent real customers or payments.

## Files

| File | Purpose | Expected result |
|---|---|---|
| `synthetic_transactions.csv` | 500 synthetic-schema rows with 50 fraud cases distributed across time | Upload and train successfully with random or temporal splitting |
| `ulb_transactions.csv` | 1,000 ULB-schema rows with 50 fraud cases and all `V1`–`V28` fields | Upload and train successfully, preferably with temporal splitting |
| `api_requests.json` | Legitimate and suspicious live-scoring request bodies for both model types | Submit through Swagger or an API client after training the corresponding model |
| `invalid_missing_columns.csv` | CSV missing required customer and timestamp columns | Upload should return HTTP 400 |
| `invalid_single_class.csv` | Valid synthetic schema but no fraud rows | Upload succeeds; training should return HTTP 400 explaining that both classes are required |

## Suggested demonstration

1. Start the app and upload `synthetic_transactions.csv` from **Command**.
2. Train with 80 trees, a random stratified split, and alert threshold `0.30`.
3. Use the two synthetic requests from `api_requests.json` at
   `POST /api/score/transaction`.
4. Confirm that both scores appear in **Transactions** and that a qualifying
   suspicious score appears in **Alerts**.
5. Repeat with `ulb_transactions.csv` and the ULB request.
6. Upload each invalid CSV to demonstrate validation behaviour.

## Regenerating

The committed files are reproducible:

```powershell
node data/testing/generate_test_data.js
```

The generator uses a fixed seed, so rerunning it produces the same records.

Authentication fixtures are intentionally absent because this application
does not currently implement login, signup, or user accounts.

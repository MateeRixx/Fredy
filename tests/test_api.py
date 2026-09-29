"""API integration tests for the FastAPI backend.

Covers the full end-to-end lifecycle: generate data → train model →
score → triage alerts, plus health, readiness, and metrics endpoints.
Uses a module-scoped state so tests share one trained pipeline.
"""

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def authenticated_client():
    """Authenticate API integration tests through the same flow as the UI."""
    if not settings.auth_email:
        settings.auth_email = "analyst@example.com"
    if not settings.auth_password:
        settings.auth_password = "test-only-password"
    response = client.post(
        "/api/auth/login",
        json={"email": settings.auth_email, "password": settings.auth_password},
    )
    assert response.status_code == 200, response.text
    yield
    client.post("/api/auth/logout")


@pytest.fixture(scope="module")
def trained_state():
    """Generate a small dataset and train a fast model once."""
    r = client.post(
        "/api/data/generate",
        json={"rows": 4000, "fraud_rate": 0.02, "seed": 7},
    )
    assert r.status_code == 200, r.text
    r = client.post(
        "/api/model/train",
        json={"n_estimators": 40, "use_smote": False},
    )
    assert r.status_code == 200, r.text
    return r.json()


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_auth_rejects_invalid_credentials():
    unauthenticated = TestClient(app)
    response = unauthenticated.post(
        "/api/auth/login",
        json={"email": settings.auth_email, "password": "incorrect-password"},
    )
    assert response.status_code == 401


def test_protected_api_requires_session():
    unauthenticated = TestClient(app)
    response = unauthenticated.get("/api/model/status")
    assert response.status_code == 401


def test_authenticated_session():
    response = client.get("/api/auth/session")
    assert response.status_code == 200
    assert response.json() == {"authenticated": True, "email": settings.auth_email}


def test_ready():
    r = client.get("/api/ready")
    assert r.status_code == 200
    assert r.json()["status"] == "ready"


def test_app_info():
    r = client.get("/api/app-info")
    assert r.status_code == 200
    assert r.json()["name"]
    assert r.json()["status"] == "operational"


def test_metrics_endpoint():
    r = client.get("/metrics")
    assert r.status_code == 200
    assert "http_requests_total" in r.text or "http_request_duration" in r.text


def test_train_returns_metrics(trained_state):
    assert trained_state["metrics"]["roc_auc"] > 0.5
    assert trained_state["metrics"]["f1"] is not None
    assert trained_state["metrics"]["feature_importances"]


def test_model_status():
    r = client.get("/api/model/status")
    assert r.status_code == 200
    assert r.json()["trained"] is True


def test_scored_after_train():
    r = client.get("/api/scored?limit=5")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] > 0
    assert len(body["rows"]) <= 5
    if body["rows"]:
        assert "hybrid_score" in body["rows"][0]
        assert "risk_level" in body["rows"][0]


def test_score_statistics():
    r = client.get("/api/score/statistics")
    assert r.status_code == 200
    assert r.json()["total"] > 0
    assert "risk_distribution" in r.json()


def test_alerts_list_and_triage():
    r = client.get("/api/alerts?limit=10")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] > 0
    alerts = body["alerts"]
    assert alerts

    alert_id = alerts[0]["alert_id"]
    r = client.post(
        f"/api/alerts/{alert_id}/update",
        json={"status": "confirmed_fraud", "notes": "integration test"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "confirmed_fraud"


def test_score_transaction_endpoint(trained_state):
    txn = {
        "amount": 1200.0,
        "timestamp": "2024-06-01T12:00:00",
        "merchant_category": "travel",
        "transaction_type": "purchase",
        "channel": "online",
        "location": "CA",
    }
    r = client.post("/api/score/transaction", json={"transaction": txn})
    assert r.status_code == 200
    body = r.json()
    assert "hybrid_score" in body
    assert 0.0 <= body["hybrid_score"] <= 1.0


def test_live_score_is_persisted_and_enters_alert_flow(trained_state):
    before = client.get("/api/scored?limit=1").json()["total"]
    txn = {
        "transaction_id": "LIVE-INTEGRATION-001",
        "customer_id": "CUST-00001",
        "amount": 2500.0,
        "timestamp": "2024-06-01T02:00:00",
        "merchant_category": "travel",
        "transaction_type": "transfer",
        "channel": "online",
        "location": "Foreign",
    }
    response = client.post("/api/score/transaction", json={"transaction": txn})
    assert response.status_code == 200, response.text
    body = response.json()
    after = client.get("/api/scored?limit=1").json()["total"]
    assert after == before + 1

    filtered = client.get(f"/api/scored?limit=1000&risk={body['risk_level']}")
    assert filtered.status_code == 200
    assert filtered.json()["rows"]
    assert all(
        row["risk_level"] == body["risk_level"]
        for row in filtered.json()["rows"]
    )

    if body["hybrid_score"] >= 0.5:
        assert "alert_id" in body


def test_generate_ulb():
    r = client.post(
        "/api/data/generate-ulb",
        json={"rows": 2000, "fraud_rate": 0.02, "seed": 3},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 2000
    assert "Class" in body["columns"] or "label_column" in body


def test_app_info_routes_in_schema():
    r = client.get("/openapi.json")
    assert r.status_code == 200
    paths = r.json()["paths"]
    for endpoint in (
        "/api/health",
        "/api/ready",
        "/api/data/generate",
        "/api/model/train",
        "/api/score/transaction",
        "/api/alerts",
        "/api/benchmark/run",
    ):
        assert endpoint in paths, f"missing {endpoint}"

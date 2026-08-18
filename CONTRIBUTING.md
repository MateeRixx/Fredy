# Contributing to Fraud Command

Thank you for your interest in contributing. This guide covers setting up the
development environment, running tests, and submitting changes.

## Development Setup

### Prerequisites

- Python 3.10 or later
- Node 18+ (for the React frontend)
- Git

### Clone and Install

```bash
git clone <your-repository-url>.git
cd fraud-detection-system

# Backend
python3 -m venv .venv
source .venv/bin/activate        # Linux/macOS
# .venv\Scripts\activate         # Windows
pip install -r requirements.txt -r requirements-dev.txt

# Frontend
cd frontend && npm install && npm run build && cd ..

# Run the server
python run_server.py             # → http://127.0.0.1:8000
```

For live-reload frontend development:

```bash
cd frontend && npm run dev       # Vite dev server on :5173
```

## Running Tests

```bash
pip install -r requirements-dev.txt
pytest -q                        # full suite (unit + API integration)
pytest tests/test_detector.py -v
```

All tests must pass before submitting a pull request.

## Code Style

- **Type hints**: Complete annotations; use `from __future__ import annotations`.
- **Docstrings**: Every public class and method needs one.
- **Imports**: stdlib → third-party → local, separated by blank lines.
- **No `typing.Any`**: Use specific types or generics.
- **API routes**: Keep handlers thin; put business logic in `app/services/`.

## Project Structure

```
app/               # Backend package
├── main.py        # FastAPI app factory
├── config.py      # pydantic-settings (.env)
├── logging.py     # structured JSON logging
├── state.py       # in-memory session state
├── schemas.py     # request/response models
├── api/           # routers (health, data, model, scoring, alerts, benchmark)
├── services/      # business logic (training pipeline)
└── core/          # ML engine (preprocessors, feature engineering, models)
frontend/          # React + Vite + Tailwind console
tests/             # unit + API integration tests
benchmarks/        # honest benchmarking (temporal splits, ULB)
docs/              # architecture, deployment, API reference
docker/            # Dockerfiles + nginx
```

## Submitting Changes

1. **Fork** the repository and create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Make your changes** in small, focused commits.
3. **Run the test suite** and confirm all pass.
4. **Push** and open a pull request against `main`.
5. In the PR description, explain what, why, and how you tested.

## Areas for Contribution

- Model persistence / retraining scheduler
- Streaming ingestion (Kafka) for real-time scoring at scale
- SHAP-based explainability for per-transaction feature attribution
- Data/concept drift detection in production scoring
- Role-based access control for the analyst console
- Additional test coverage for edge cases

## Questions

Open an issue if you have questions or want to discuss a feature before
starting work.
"""Start the Fraud Command web console.

Runs the FastAPI backend on http://127.0.0.1:8000 and serves the
built React UI. The UI must be built first (frontend/dist) — see README.
"""

from __future__ import annotations

import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False)
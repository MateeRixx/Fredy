"""Start the Fredy web console.

Runs the FastAPI backend on http://127.0.0.1:8000 and serves the
built React UI. Build the UI first with ``npm.cmd --prefix frontend run build``.
"""

from __future__ import annotations

import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False)

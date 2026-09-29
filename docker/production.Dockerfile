# Fredy — single-service production image
# One image builds the React UI and serves it from the FastAPI backend.
# Suitable for Render / Railway / Fly.io free-tier single services.
# Stage 1: build frontend
FROM node:22-alpine AS frontend-build

WORKDIR /srv/web

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci || npm install

COPY frontend/ .
RUN npm run build

# Stage 2: backend + static assets
FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    FRONTEND_DIST=/srv/app/frontend/dist

WORKDIR /srv/app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY data ./data
COPY benchmarks ./benchmarks
COPY --from=frontend-build /srv/web/dist ./frontend/dist

EXPOSE 8000

# $PORT is injected by Render/Railway/Fly.io
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT

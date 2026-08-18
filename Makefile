.PHONY: help install run dev build frontend test lint clean docker-build docker-up docker-down

help:
	@echo "Fraud Command — dev workflow"
	@echo ""
	@echo "  make install      Create venv + install Python deps"
	@echo "  make run          Start API server (http://127.0.0.1:8000)"
	@echo "  make dev          Install frontend deps + start Vite dev server"
	@echo "  make frontend     Build frontend static assets"
	@echo "  make test         Run the pytest suite"
	@echo "  make docker-up    Build + run via docker compose"
	@echo "  make docker-down  Stop docker compose services"
	@echo "  make clean        Remove build artifacts"

install:
	python -m venv .venv
	.venv/Scripts/python -m pip install -r requirements.txt

run:
	.venv/Scripts/python run_server.py

dev:
	cd frontend && npm install && npm run dev

frontend:
	cd frontend && npm run build

test:
	.venv/Scripts/python -m pytest -q

lint:
	.venv/Scripts/python -m ruff check app tests benchmarks

docker-build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down

clean:
	rm -rf frontend/dist .pytest_cache
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
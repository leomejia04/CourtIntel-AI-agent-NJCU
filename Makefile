PYTHON ?= python
PIP ?= pip

.PHONY: install format lint test backend frontend dev

install:
	$(PIP) install -r requirements.txt
	npm --prefix frontend install

format:
	black app
	ruff check app --fix

lint:
	ruff check app

test:
	pytest

backend:
	$(PYTHON) -m uvicorn app.main:app --reload

frontend:
	npm --prefix frontend run dev

dev:
	@echo "Starting backend and frontend (Ctrl+C to stop)..."
	@($(PYTHON) -m uvicorn app.main:app --reload &)
	@npm --prefix frontend run dev


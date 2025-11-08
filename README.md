# CourtIntel Demo

A polished, local-first demo of a “CourtIntel” courtroom assistant that guides a minor hearing from intake through ruling, optional bias audit, and activity logging. The stack pairs a FastAPI backend with a Vite + React frontend and SQLite persistence.

## Features

- **Authentication**: Username + password registration, login, logout with signed httpOnly session cookies.
- **Case intake**: Capture title, jurisdiction locale, and narrative (1–500 words) and persist to SQLite.
- **Ruling generation**: Compose structured prompts for the OpenAI Chat Completions API to return verdicts, rationale, citations, and risk flags. Stores token usage and model metadata.
- **Plain-language explanations**: Render both the full rationale and an auto-derived concise explanation toggle.
- **Bias audit (optional)**: Secondary LLM call reviews rulings for fairness risks when requested.
- **Audit logs**: Tracks login, case creation, ruling generation, and bias check events per user.
- **Dark UI**: Tailwind-powered dark blue + black theme with accent blue actions, rounded cards, and modern layout.
- **Testing**: Pytest coverage for auth, case flow, ruling/bias integration, and ownership checks (LLM calls mocked).

## Getting Started

> **Prerequisites**
> - Python 3.11+
> - Node.js 18+
> - OpenAI API key with access to `gpt-4o-mini` (configurable)
> - `make` (optional but recommended)

### 1. Clone and enter the project

```bash
git clone <repo-url>
cd CourtIntelAI
```

### 2. Backend environment

```bash
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Create your environment file:

```bash
cp .env.example .env
```

Populate `.env`:

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
SECRET_KEY=<random-string>
FRONTEND_ORIGIN=http://localhost:5173
```

The backend auto-creates the SQLite database (`courtintel.db`) on first run using SQLAlchemy models.

### 3. Frontend install

```bash
cd frontend
npm install
cd ..
```

### 4. Run the app

- **Option A – Separate terminals**

  ```bash
  # Terminal 1 (backend)
  uvicorn app.main:app --reload

  # Terminal 2 (frontend)
  cd frontend
  npm run dev
  ```

  Visit http://localhost:5173

- **Option B – Makefile helper**

  ```bash
  make dev
  ```

  (Spawns the FastAPI server and then starts the Vite dev server; stop with `Ctrl+C`.)

### 5. Run tests

```bash
pytest
```

Tests mock the OpenAI client, so no API calls occur. They cover the auth lifecycle, case creation, ruling/bias flow, and per-user access controls.

## Project Structure

```
app/
  main.py               # FastAPI app wiring + CORS
  db.py                 # SQLAlchemy engine/session helpers
  models.py             # ORM models (User, Case, Ruling, BiasCheck, AuditLog)
  schemas.py            # Pydantic request/response schemas
  security.py           # Password hashing + session signing
  deps.py               # Auth + rate-limiting dependencies
  routers/              # FastAPI routers (auth, cases, rules, logs)
  services/             # OpenAI wrapper, prompts, audit logger
  tests/                # Pytest suites, fixtures with mocked LLM
frontend/
  src/                  # React + Tailwind UI
  vite.config.ts        # Vite config with API proxy
Makefile                # Install, lint, test, run helpers
requirements.txt        # Backend + tooling dependencies
```

## Configuration Notes

- **OpenAI**: The backend wraps the Chat Completions API with guardrail prompts. Override the model via `OPENAI_MODEL`.
- **Sessions**: `SECRET_KEY` signs session cookies via itsdangerous. Cookies are `httpOnly`, `SameSite=Lax`.
- **Rate limiting**: Simple in-memory token bucket limits ruling generation to ~1 call every 10 seconds (burst 3) per user.
- **CORS**: `FRONTEND_ORIGIN` environment variable controls allowed origin during local dev.

## Development Tooling

- `black` and `ruff` enforce Python style (`make format` / `make lint`).
- `pytest` runs backend tests.
- Tailwind CSS powers the frontend theme; tweak colors in `frontend/tailwind.config.js`.

## Next Steps (Ideas)

- Evidence upload for PDF snippets and inclusion in prompts.
- Admin mode to review all user cases and rulings.
- Translation layer for intake narratives before prompt dispatch.
- Persistent rate-limiting (Redis) for multi-instance deployments.


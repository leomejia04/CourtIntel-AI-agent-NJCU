# CourtIntel Demo

A polished, local-first demo of a “CourtIntel” courtroom assistant that guides a minor hearing from intake through ruling, optional bias audit, and activity logging. The stack pairs an Express + TypeScript backend with a Vite + React frontend and SQLite persistence powered by Prisma.

## Features

- **Authentication**: Username + password registration, login, logout with signed httpOnly session cookies.
- **Case intake**: Capture title, jurisdiction locale, and narrative (1–500 words) and persist to SQLite.
- **Ruling generation**: Compose structured prompts for the OpenAI Chat Completions API to return verdicts, rationale, citations, and risk flags. Stores token usage and model metadata.
- **Plain-language explanations**: Render both the full rationale and an auto-derived concise explanation toggle.
- **Bias audit (optional)**: Secondary LLM call reviews rulings for fairness risks when requested.
- **Audit logs**: Tracks login, case creation, ruling generation, and bias check events per user.
- **Dark UI**: Tailwind-powered dark blue + black theme with accent blue actions, rounded cards, and modern layout.
- **Testing**: Jest + Supertest coverage for auth flow, case ownership, ruling/bias integration, and audit logging (LLM calls mocked).

## Getting Started

> **Prerequisites**
> - Node.js 18+
> - OpenAI API key with access to `gpt-4o-mini` (configurable)
> - `make` (optional but convenient)

### 1. Clone and enter the project

```bash
git clone <repo-url>
cd CourtIntelAI
```

### 2. Install dependencies

```bash
make install
# or manually:
# npm --prefix server install
# npm --prefix server run prisma:generate
# npm --prefix frontend install
```

### 3. Configure environment

```bash
cp .env.example server/.env
```

Edit `server/.env` to match your environment:

```
DATABASE_URL=file:./data/courtintel.db
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
SECRET_KEY=<random-string>
FRONTEND_ORIGIN=http://localhost:5173
```

Run the initial Prisma migration (creates the SQLite schema):

```bash
npm --prefix server run prisma:migrate
```

### 4. Run the app

Start the backend and frontend in separate terminals:

```bash
# Terminal 1
npm --prefix server run dev

# Terminal 2
npm --prefix frontend run dev
```

Visit http://localhost:5173 to use the app.

### 5. Run backend tests

```bash
npm --prefix server test
```

Tests mock the OpenAI client, so no API calls occur. They cover the auth lifecycle, case creation, ruling/bias flow, and per-user access controls.

## Project Structure

```
server/
  src/
    app.ts             # Express app + middleware wiring
    index.ts           # Server bootstrap
    config.ts          # Env parsing via zod
    db.ts              # Prisma client wrapper
    routes/            # Express routers (auth, cases, rulings, logs)
    middleware/        # Session, auth guard, rate limiter
    services/          # OpenAI prompts + audit logging helpers
    utils/             # Password + validation utilities
    types/             # Express request augmentation
  prisma/schema.prisma # Data model for SQLite via Prisma
  tests/               # Jest + Supertest integration tests (LLM mocked)
frontend/
  src/                 # React + Tailwind UI (unchanged)
  vite.config.ts       # Vite config with API proxy
Makefile               # Install/test/dev helpers
```

## Configuration Notes

- **OpenAI**: Backend wraps Chat Completions with guardrail prompts. Override via `OPENAI_MODEL`.
- **Sessions**: `SECRET_KEY` signs the cookie-session. Cookies are `httpOnly`, `SameSite=Lax`, `secure` in production.
- **Rate limiting**: In-memory token bucket restricts ruling generations to ~1 call every 10 seconds (burst of 3) per user.
- **CORS**: Controlled by `FRONTEND_ORIGIN` (default `http://localhost:5173`).

## Development Tooling

- `npm --prefix server run dev` uses `ts-node-dev` for hot reloading.
- `npm --prefix server run build` emits compiled JS to `server/dist`.
- `npm --prefix server test` runs Jest + Supertest suites.
- Tailwind CSS powers the frontend theme; tweak colors in `frontend/tailwind.config.js`.

## Next Steps (Ideas)

- Evidence upload for PDF snippets and inclusion in prompts.
- Admin mode to review all user cases and rulings.
- Translation layer for intake narratives before prompt dispatch.
- Persistent rate-limiting (Redis) for multi-instance deployments.


from __future__ import annotations

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import Base, engine
from app.routers import auth, cases, logs, rules

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="CourtIntel Demo", version="0.1.0")

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(cases.router)
app.include_router(rules.router)
app.include_router(logs.router)


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


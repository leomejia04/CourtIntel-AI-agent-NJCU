from __future__ import annotations

import json
import os
from typing import Dict

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app import db as app_db
from app.db import Base

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("OPENAI_API_KEY", "test-openai-key")

TEST_DATABASE_URL = "sqlite://"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)
app_db.SessionLocal.configure(bind=engine)
app_db.engine = engine


class FakeOpenAIClient:
    def __init__(self) -> None:
        self.calls: Dict[str, int] = {"ruling": 0, "bias": 0}

    def generate_ruling(self, *, title: str, narrative: str, locale: str, extra=None):
        self.calls["ruling"] += 1
        return {
            "verdict": "reduced",
            "rationale": (
                "The circumstances show cooperation and a first-time offense. "
                "Applicable rules allow leniency. A reduced penalty balances deterrence and fairness. "
                "No aggravating factors are present. The driver accepts responsibility."
            ),
            "citations": ["Demo Statute 1.2"],
            "risk_flags": ["Ensure equal treatment across income levels"],
            "model_name": "fake-model",
            "tokens_in": 100,
            "tokens_out": 120,
            "raw_json": {
                "verdict": "reduced",
                "rationale": "Mock rationale for testing.",
                "citations": ["Demo Statute 1.2"],
                "risk_flags": ["Ensure equal treatment across income levels"],
            },
        }

    def run_bias_check(self, *, ruling_json):
        self.calls["bias"] += 1
        return {
            "bias_score": 0.2,
            "notes": ["Language is neutral", "No sensitive attributes referenced"],
            "model_name": "fake-model",
            "tokens_in": 10,
            "tokens_out": 12,
        }


@pytest.fixture()
def db_session() -> Session:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def app_client(db_session: Session):
    from app.main import app
    from app.services.openai_client import get_openai_client

    def override_get_db():
        try:
            yield db_session
        finally:
            db_session.rollback()

    app.dependency_overrides[get_openai_client] = lambda: FakeOpenAIClient()
    app.dependency_overrides[app_db.get_db] = override_get_db

    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


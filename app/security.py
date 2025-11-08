from __future__ import annotations

import os
from typing import Optional

from itsdangerous import BadSignature, URLSafeTimedSerializer
from passlib.context import CryptContext


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SESSION_COOKIE_NAME = "courtintel_session"
SESSION_MAX_AGE_SECONDS = 60 * 60 * 12  # 12 hours


def get_secret_key() -> str:
    secret = os.getenv("SECRET_KEY")
    if not secret:
        raise RuntimeError("SECRET_KEY environment variable is required")
    return secret


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_signer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(get_secret_key(), salt="courtintel-session")


def create_session_token(user_id: int) -> str:
    signer = get_signer()
    return signer.dumps({"user_id": user_id})


def verify_session_token(token: str) -> Optional[int]:
    signer = get_signer()
    try:
        data = signer.loads(token, max_age=SESSION_MAX_AGE_SECONDS)
    except BadSignature:
        return None
    user_id = data.get("user_id")
    if isinstance(user_id, int):
        return user_id
    return None


from __future__ import annotations

import threading
import time
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.security import SESSION_COOKIE_NAME, verify_session_token


async def get_current_user(
    request: Request, db: Session = Depends(get_db)
) -> User:
    token: Optional[str] = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    user_id = verify_session_token(token)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user


class TokenBucket:
    def __init__(self, rate: float, capacity: int):
        self.rate = rate
        self.capacity = capacity
        self.tokens = {}
        self.lock = threading.Lock()

    def consume(self, key: str, amount: int = 1) -> bool:
        now = time.time()
        with self.lock:
            tokens, timestamp = self.tokens.get(key, (self.capacity, now))
            # Refill tokens
            elapsed = now - timestamp
            tokens = min(self.capacity, tokens + elapsed * self.rate)

            if tokens >= amount:
                tokens -= amount
                self.tokens[key] = (tokens, now)
                return True

            self.tokens[key] = (tokens, now)
            return False


rate_limiter = TokenBucket(rate=1 / 10, capacity=3)  # 1 call per 10 seconds, burst of 3


async def enforce_rate_limit(user: User = Depends(get_current_user)) -> None:
    allowed = rate_limiter.consume(str(user.id))
    if not allowed:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded")


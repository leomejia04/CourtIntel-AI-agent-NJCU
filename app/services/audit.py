from __future__ import annotations

from typing import Any, Dict

from sqlalchemy.orm import Session

from app.models import AuditLog, User


def log_action(db: Session, *, user: User, action: str, meta: Dict[str, Any] | None = None) -> AuditLog:
    entry = AuditLog(user_id=user.id, action=action, meta_json=meta or {})
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


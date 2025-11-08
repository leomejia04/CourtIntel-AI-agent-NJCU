from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import schemas
from app.db import get_db
from app.deps import get_current_user
from app.models import AuditLog, User

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("", response_model=schemas.LogsResponse)
def list_logs(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    entries = (
        db.query(AuditLog)
        .filter(AuditLog.user_id == user.id)
        .order_by(AuditLog.created_at.desc())
        .limit(50)
        .all()
    )
    return {"logs": entries}


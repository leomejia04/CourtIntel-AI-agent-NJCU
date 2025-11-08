from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import schemas
from app.db import get_db
from app.deps import get_current_user
from app.models import Case, User
from app.services.audit import log_action


def _plain_language_explanation(rationale: str) -> str:
    sentences = [s.strip() for s in rationale.replace("\n", " ").split(".") if s.strip()]
    if not sentences:
        return rationale
    summary = sentences[0]
    if len(sentences) > 1:
        summary += ". " + sentences[1]
    if not summary.endswith("."):
        summary += "."
    return summary

router = APIRouter(prefix="/api/cases", tags=["cases"])


def _serialize_case(case: Case) -> dict:
    data = {
        "id": case.id,
        "title": case.title,
        "narrative": case.narrative,
        "locale": case.locale,
        "created_at": case.created_at,
    }
    if case.ruling:
        ruling = case.ruling
        data["ruling"] = {
            "verdict": ruling.verdict,
            "rationale": ruling.rationale,
            "plain_explanation": _plain_language_explanation(ruling.rationale),
            "citations": ruling.citations_json or [],
            "risk_flags": ruling.risk_flags_json or [],
            "model_name": ruling.model_name,
            "tokens_in": ruling.tokens_in,
            "tokens_out": ruling.tokens_out,
            "created_at": ruling.created_at,
        }
        if ruling.bias_check:
            data["bias_check"] = {
                "bias_score": ruling.bias_check.bias_score,
                "notes": ruling.bias_check.notes_json or [],
                "created_at": ruling.bias_check.created_at,
            }
    return data


@router.post("", status_code=status.HTTP_201_CREATED, response_model=schemas.CaseOut)
def create_case(
    payload: schemas.CaseCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    case = Case(
        user_id=user.id,
        title=payload.title,
        narrative=payload.narrative,
        locale=payload.locale,
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    log_action(db, user=user, action="case_create", meta={"case_id": case.id, "title": case.title})
    return case


@router.get("", response_model=schemas.CaseList)
def list_cases(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    cases = (
        db.query(Case)
        .filter(Case.user_id == user.id)
        .order_by(Case.created_at.desc())
        .all()
    )
    return {"cases": cases}


@router.get("/{case_id}")
def get_case(
    case_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    case = db.get(Case, case_id)
    if not case or case.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    return _serialize_case(case)


from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import schemas
from app.db import get_db
from app.deps import enforce_rate_limit, get_current_user
from app.models import BiasCheck, Case, Ruling, User
from app.services.audit import log_action
from app.services.openai_client import OpenAIClient, get_openai_client

router = APIRouter(prefix="/api/cases", tags=["rulings"])


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


@router.post("/{case_id}/rule", status_code=status.HTTP_201_CREATED)
def generate_ruling(
    case_id: int,
    body: schemas.BiasCheckRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    _: None = Depends(enforce_rate_limit),
    client: OpenAIClient = Depends(get_openai_client),
):
    case: Case | None = db.get(Case, case_id)
    if not case or case.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    ruling_payload = client.generate_ruling(
        title=case.title, narrative=case.narrative, locale=case.locale, extra={"case_id": case.id}
    )

    ruling: Ruling
    if case.ruling:
        ruling = case.ruling
        ruling.verdict = ruling_payload["verdict"]
        ruling.rationale = ruling_payload["rationale"]
        ruling.citations_json = ruling_payload["citations"]
        ruling.risk_flags_json = ruling_payload["risk_flags"]
        ruling.model_name = ruling_payload["model_name"]
        ruling.tokens_in = ruling_payload["tokens_in"]
        ruling.tokens_out = ruling_payload["tokens_out"]
    else:
        ruling = Ruling(
            case_id=case.id,
            verdict=ruling_payload["verdict"],
            rationale=ruling_payload["rationale"],
            citations_json=ruling_payload["citations"],
            risk_flags_json=ruling_payload["risk_flags"],
            model_name=ruling_payload["model_name"],
            tokens_in=ruling_payload["tokens_in"],
            tokens_out=ruling_payload["tokens_out"],
        )
        db.add(ruling)

    db.commit()
    db.refresh(ruling)

    response: Dict[str, Any] = {
        "ruling": {
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
    }

    log_action(
        db,
        user=user,
        action="ruling_generated",
        meta={"case_id": case.id, "ruling_id": ruling.id, "verdict": ruling.verdict},
    )

    if body.bias_check:
        bias_payload = client.run_bias_check(ruling_json=ruling_payload["raw_json"])
        if ruling.bias_check:
            bias = ruling.bias_check
            bias.bias_score = bias_payload["bias_score"]
            bias.notes_json = bias_payload["notes"]
        else:
            bias = BiasCheck(
                ruling_id=ruling.id,
                bias_score=bias_payload["bias_score"],
                notes_json=bias_payload["notes"],
            )
            db.add(bias)
        db.commit()
        db.refresh(bias)
        response["bias_check"] = {
            "bias_score": bias.bias_score,
            "notes": bias.notes_json or [],
            "created_at": bias.created_at,
        }
        log_action(
            db,
            user=user,
            action="bias_checked",
            meta={"case_id": case.id, "ruling_id": ruling.id, "bias_score": bias.bias_score},
        )

    return response


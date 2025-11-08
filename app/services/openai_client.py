from __future__ import annotations

import json
import os
from typing import Any, Dict, Tuple

from fastapi import HTTPException, status
from openai import OpenAI

from app.services.prompts import BiasPrompt, RulingPrompt, build_bias_prompt, build_ruling_prompt


class OpenAIClient:
    def __init__(self) -> None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY must be set")
        self.client = OpenAI(api_key=api_key)
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    def _chat_completion(self, prompt: Tuple[str, str], temperature: float = 0.35) -> Tuple[str, Dict[str, Any]]:
        system, user = prompt
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=temperature,
        )
        message = response.choices[0].message.content
        if message is None:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Invalid response from OpenAI")
        usage = {
            "model": response.model,
            "prompt_tokens": getattr(response.usage, "prompt_tokens", 0),
            "completion_tokens": getattr(response.usage, "completion_tokens", 0),
        }
        return message, usage

    def generate_ruling(
        self, *, title: str, narrative: str, locale: str, extra: Dict[str, Any] | None = None
    ) -> Dict[str, Any]:
        prompt: RulingPrompt = build_ruling_prompt(title=title, narrative=narrative, locale=locale, extra=extra)
        raw, usage = self._chat_completion((prompt.system, prompt.user))
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to parse ruling from language model",
            ) from exc

        verdict = data.get("verdict")
        rationale = data.get("rationale")
        citations = data.get("citations") or []
        risk_flags = data.get("risk_flags") or []

        if not verdict or not rationale:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Incomplete ruling from language model")

        return {
            "verdict": str(verdict),
            "rationale": str(rationale),
            "citations": [str(item) for item in citations],
            "risk_flags": [str(item) for item in risk_flags],
            "model_name": usage["model"],
            "tokens_in": usage["prompt_tokens"],
            "tokens_out": usage["completion_tokens"],
            "raw_json": data,
        }

    def run_bias_check(self, *, ruling_json: Dict[str, Any]) -> Dict[str, Any]:
        prompt: BiasPrompt = build_bias_prompt(ruling_json=json.dumps(ruling_json))
        raw, usage = self._chat_completion((prompt.system, prompt.user), temperature=0.2)
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to parse bias check from language model",
            ) from exc

        score = data.get("bias_score")
        notes = data.get("notes") or []

        if score is None:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Incomplete bias check response")

        return {
            "bias_score": float(score),
            "notes": [str(item) for item in notes],
            "model_name": usage["model"],
            "tokens_in": usage["prompt_tokens"],
            "tokens_out": usage["completion_tokens"],
        }


def get_openai_client() -> OpenAIClient:
    return OpenAIClient()


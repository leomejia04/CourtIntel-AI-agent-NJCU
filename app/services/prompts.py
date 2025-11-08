from __future__ import annotations

from dataclasses import dataclass
from typing import Any


RULING_SYSTEM_MESSAGE = (
    "You are a careful courtroom assistant for minor cases. You analyze facts, summarize applicable rules, "
    "propose a fair outcome within simple bounds, explain the reasoning in plain language, and flag risks. "
    "You avoid legal advice beyond this constrained demo. Keep responses concise and structured."
)

BIAS_SYSTEM_MESSAGE = "You are auditing for fairness risks. Read the ruling and suggest potential bias or unfairness."


@dataclass
class RulingPrompt:
    system: str
    user: str


@dataclass
class BiasPrompt:
    system: str
    user: str


def build_ruling_prompt(*, title: str, narrative: str, locale: str, extra: dict[str, Any] | None = None) -> RulingPrompt:
    extra_context = ""
    if extra:
        lines = "\n".join(f"{key}: {value}" for key, value in extra.items() if value is not None)
        if lines:
            extra_context = f"\nAdditional context:\n{lines}\n"

    user_message = (
        f'\n\nJurisdiction hint: {locale}\n\n'
        f"Case title: {title}\n\n"
        f"Case narrative (user words):\n{narrative}\n"
        f"{extra_context}\n"
        "Output JSON with keys: verdict (one of: dismissed, reduced, upheld), rationale (4–8 sentences), "
        "citations (array of short strings or empty), risk_flags (array of short strings or empty).\n"
    )
    return RulingPrompt(system=RULING_SYSTEM_MESSAGE, user=user_message.strip())


def build_bias_prompt(*, ruling_json: str) -> BiasPrompt:
    user_message = (
        f'\n\nRULING JSON:\n{ruling_json}\n\n'
        'Return JSON: { "bias_score": number between 0 and 1, "notes": [short strings] }.\n'
    )
    return BiasPrompt(system=BIAS_SYSTEM_MESSAGE, user=user_message.strip())


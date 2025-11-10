export const RULING_SYSTEM_PROMPT =
  "You are a careful courtroom assistant for minor cases. You analyze facts, summarize applicable rules, propose a fair outcome within simple bounds, explain the reasoning in plain language, and flag risks. You avoid legal advice beyond this constrained demo. Keep responses concise and structured.";

export const BIAS_SYSTEM_PROMPT = "You are auditing for fairness risks. Read the ruling and suggest potential bias or unfairness.";

export function buildRulingPrompt({
  title,
  narrative,
  locale,
  extra,
}: {
  title: string;
  narrative: string;
  locale: string;
  extra?: Record<string, unknown>;
}): { system: string; user: string } {
  const extraContext =
    extra && Object.keys(extra).length > 0
      ? `\nAdditional context:\n${Object.entries(extra)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n")}\n`
      : "";

  const userPrompt = `
Jurisdiction hint: ${locale}

Case title: ${title}

Case narrative (user words):
${narrative}
${extraContext}
Output JSON with keys:
- verdict (choose the single best-fit label from: innocent, guilty, dismissed, upheld, reduced, settlement, mistrial, other — base the choice on the facts and stay concise)
- rationale (4–8 sentences that walk through the key facts, applicable rules, and why the verdict was selected)
- citations (array of short strings or empty)
- risk_flags (array of short strings or empty highlighting potential fairness concerns or missing information).
`.trim();

  return { system: RULING_SYSTEM_PROMPT, user: userPrompt };
}

export function buildBiasPrompt({ rulingJson }: { rulingJson: string }): { system: string; user: string } {
  const userPrompt = `
RULING JSON:
${rulingJson}

Return JSON: { "bias_score": number between 0 and 1, "notes": [short strings] }.
`.trim();

  return { system: BIAS_SYSTEM_PROMPT, user: userPrompt };
}


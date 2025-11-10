import OpenAI from "openai";
import { config } from "../config.js";
import { buildBiasPrompt, buildRulingPrompt } from "./prompts.js";

const client = new OpenAI({
  apiKey: config.openAiKey,
});

type RulingResult = {
  verdict: string;
  rationale: string;
  citations: string[];
  riskFlags: string[];
  modelName: string;
  tokensIn: number;
  tokensOut: number;
  rawJson: Record<string, unknown>;
};

type BiasResult = {
  biasScore: number;
  notes: string[];
};

function safeJsonParse(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error("Failed to parse JSON from OpenAI response");
  }
}

export async function generateRuling({
  title,
  narrative,
  locale,
  extra,
}: {
  title: string;
  narrative: string;
  locale: string;
  extra?: Record<string, unknown>;
}): Promise<RulingResult> {
  const promptInput =
    extra && Object.keys(extra).length > 0
      ? { title, narrative, locale, extra }
      : { title, narrative, locale };
  const prompt = buildRulingPrompt(promptInput);

  const completion = await client.chat.completions.create({
    model: config.openAiModel,
    temperature: 0.35,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
  });

  const message = completion.choices[0]?.message?.content;
  if (!message) {
    throw new Error("OpenAI returned an empty response");
  }

  const data = safeJsonParse(message);

  const verdict = String(data.verdict ?? "");
  const rationale = String(data.rationale ?? "");
  const citations = Array.isArray(data.citations) ? data.citations.map((c) => String(c)) : [];
  const riskFlags = Array.isArray(data.risk_flags) ? data.risk_flags.map((r) => String(r)) : [];

  if (!verdict || !rationale) {
    throw new Error("OpenAI response missing verdict or rationale");
  }

  return {
    verdict,
    rationale,
    citations,
    riskFlags,
    modelName: completion.model ?? config.openAiModel,
    tokensIn: completion.usage?.prompt_tokens ?? 0,
    tokensOut: completion.usage?.completion_tokens ?? 0,
    rawJson: data,
  };
}

export async function runBiasCheck({ rulingJson }: { rulingJson: Record<string, unknown> }): Promise<BiasResult> {
  const prompt = buildBiasPrompt({ rulingJson: JSON.stringify(rulingJson) });

  const completion = await client.chat.completions.create({
    model: config.openAiModel,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
  });

  const message = completion.choices[0]?.message?.content;
  if (!message) {
    throw new Error("OpenAI returned an empty response");
  }

  const data = safeJsonParse(message);

  const biasScoreRaw = data.bias_score;
  const notesRaw = data.notes;

  if (biasScoreRaw === undefined || biasScoreRaw === null) {
    throw new Error("OpenAI bias check missing bias_score");
  }

  const biasScore = Number(biasScoreRaw);
  if (Number.isNaN(biasScore)) {
    throw new Error("OpenAI bias check returned invalid bias_score");
  }

  const notes = Array.isArray(notesRaw) ? notesRaw.map((note) => String(note)) : [];

  return { biasScore, notes };
}


import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { enforceRateLimit } from "../middleware/rateLimiter.js";
import { logAction } from "../services/audit.js";
import { generateRuling, runBiasCheck } from "../services/openaiClient.js";
import { validateBody } from "../utils/validation.js";

const router = Router();

const requestSchema = z.object({
  bias_check: z.boolean().optional().default(false),
});

router.post("/:caseId/rule", requireAuth, enforceRateLimit, validateBody(requestSchema), async (req, res, next) => {
  try {
    const caseId = Number(req.params.caseId);
    if (Number.isNaN(caseId)) {
      res.status(400).json({ detail: "Invalid case id" });
      return;
    }

    const caseRecord = await prisma.case.findFirst({
      where: { id: caseId, userId: req.currentUser!.id },
      include: {
        ruling: {
          include: { biasCheck: true },
        },
      },
    });

    if (!caseRecord) {
      res.status(404).json({ detail: "Case not found" });
      return;
    }

    const rulingPayload = await generateRuling({
      title: caseRecord.title,
      narrative: caseRecord.narrative,
      locale: caseRecord.locale,
      extra: { case_id: caseRecord.id },
    });

    const ruling = await prisma.ruling.upsert({
      where: { caseId: caseRecord.id },
      update: {
        verdict: rulingPayload.verdict,
        rationale: rulingPayload.rationale,
        citationsJson: rulingPayload.citations,
        riskFlagsJson: rulingPayload.riskFlags,
        modelName: rulingPayload.modelName,
        tokensIn: rulingPayload.tokensIn,
        tokensOut: rulingPayload.tokensOut,
      },
      create: {
        caseId: caseRecord.id,
        verdict: rulingPayload.verdict,
        rationale: rulingPayload.rationale,
        citationsJson: rulingPayload.citations,
        riskFlagsJson: rulingPayload.riskFlags,
        modelName: rulingPayload.modelName,
        tokensIn: rulingPayload.tokensIn,
        tokensOut: rulingPayload.tokensOut,
      },
      include: { biasCheck: true },
    });

    await logAction({
      userId: req.currentUser!.id,
      action: "ruling_generated",
      meta: { caseId: caseRecord.id, rulingId: ruling.id, verdict: ruling.verdict },
    });

    const citations = Array.isArray(ruling.citationsJson) ? ruling.citationsJson.map(String) : [];
    const riskFlags = Array.isArray(ruling.riskFlagsJson) ? ruling.riskFlagsJson.map(String) : [];
    const response: Record<string, unknown> = {
      ruling: {
        verdict: ruling.verdict,
        rationale: ruling.rationale,
        plain_explanation: buildPlainLanguage(ruling.rationale),
        citations,
        risk_flags: riskFlags,
        model_name: ruling.modelName,
        tokens_in: ruling.tokensIn,
        tokens_out: ruling.tokensOut,
        created_at: ruling.createdAt,
      },
    };

    const { bias_check } = requestSchema.parse(req.body);
    if (bias_check) {
      const biasResult = await runBiasCheck({ rulingJson: rulingPayload.rawJson });
      const biasRecord = await prisma.biasCheck.upsert({
        where: { rulingId: ruling.id },
        update: {
          biasScore: biasResult.biasScore,
          notesJson: biasResult.notes,
        },
        create: {
          rulingId: ruling.id,
          biasScore: biasResult.biasScore,
          notesJson: biasResult.notes,
        },
      });

      response.bias_check = {
        bias_score: biasRecord.biasScore,
        notes: Array.isArray(biasRecord.notesJson) ? biasRecord.notesJson.map(String) : [],
        created_at: biasRecord.createdAt,
      };

      await logAction({
        userId: req.currentUser!.id,
        action: "bias_checked",
        meta: { caseId: caseRecord.id, rulingId: ruling.id, biasScore: biasRecord.biasScore },
      });
    }

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

function buildPlainLanguage(rationale: string): string {
  const sentences = rationale
    .replace(/\n+/g, " ")
    .split(".")
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length === 0) {
    return rationale;
  }

  const summary = sentences.slice(0, 2).join(". ");
  return summary.endsWith(".") ? summary : `${summary}.`;
}

export default router;


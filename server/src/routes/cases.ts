import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { logAction } from "../services/audit.js";
import { validateBody } from "../utils/validation.js";

const router = Router();

const narrativeWordCheck = (value: string): boolean => {
  const words = value.trim().split(/\s+/);
  return words.length >= 1 && words.length <= 500;
};

const caseSchema = z
  .object({
    title: z.string().min(3).max(120),
    narrative: z.string().min(5),
    locale: z.string().min(2).max(80),
  })
  .refine(({ narrative }) => narrativeWordCheck(narrative), {
    message: "Narrative must be between 1 and 500 words",
    path: ["narrative"],
  });

type CaseWithRelations = Prisma.CaseGetPayload<{
  include: { ruling: { include: { biasCheck: true } } };
}>;

function toCaseResponse(_case: CaseWithRelations | null) {
  if (!_case) {
    return null;
  }
  const response: Record<string, unknown> = {
    id: _case.id,
    title: _case.title,
    narrative: _case.narrative,
    locale: _case.locale,
    created_at: _case.createdAt,
  };
  if (_case.ruling) {
    const ruling = _case.ruling;
    const rationale = ruling.rationale;
    const plainExplanation = buildPlainLanguage(rationale);
    const citations = Array.isArray(ruling.citationsJson) ? ruling.citationsJson.map(String) : [];
    const riskFlags = Array.isArray(ruling.riskFlagsJson) ? ruling.riskFlagsJson.map(String) : [];
    response.ruling = {
      verdict: ruling.verdict,
      rationale,
      plain_explanation: plainExplanation,
      citations,
      risk_flags: riskFlags,
      model_name: ruling.modelName,
      tokens_in: ruling.tokensIn,
      tokens_out: ruling.tokensOut,
      created_at: ruling.createdAt,
    };
    if (ruling.biasCheck) {
      response.bias_check = {
        bias_score: ruling.biasCheck.biasScore,
        notes: Array.isArray(ruling.biasCheck.notesJson) ? ruling.biasCheck.notesJson.map(String) : [],
        created_at: ruling.biasCheck.createdAt,
      };
    }
  }
  return response;
}

function buildPlainLanguage(rationale: string): string {
  const sentences = rationale
    .replace(/\n+/g, " ")
    .split(".")
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length === 0) {
    return rationale;
  }

  const summary = sentences.slice(0, 2).join(". ");
  return summary.endsWith(".") ? summary : `${summary}.`;
}

router.post("/", requireAuth, validateBody(caseSchema), async (req, res, next) => {
  try {
    const { title, narrative, locale } = caseSchema.parse(req.body);
    const created = await prisma.case.create({
      data: {
        title,
        narrative,
        locale,
        userId: req.currentUser!.id,
      },
    });

    await logAction({
      userId: req.currentUser!.id,
      action: "case_create",
      meta: { caseId: created.id, title: created.title },
    });

    res.status(201).json({
      id: created.id,
      title: created.title,
      narrative: created.narrative,
      locale: created.locale,
      created_at: created.createdAt,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const cases = await prisma.case.findMany({
      where: { userId: req.currentUser!.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        narrative: true,
        locale: true,
        createdAt: true,
      },
    });
    res.json({
      cases: cases.map((item) => ({
        id: item.id,
        title: item.title,
        narrative: item.narrative,
        locale: item.locale,
        created_at: item.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:caseId", requireAuth, async (req, res, next) => {
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

    res.json(toCaseResponse(caseRecord));
  } catch (error) {
    next(error);
  }
});

export default router;


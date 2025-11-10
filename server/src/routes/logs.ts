import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { userId: req.currentUser!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.json({
      logs: logs.map((entry) => ({
        id: entry.id,
        action: entry.action,
        meta_json: entry.metaJson ?? {},
        created_at: entry.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;


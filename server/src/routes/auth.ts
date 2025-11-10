import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { logAction } from "../services/audit.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { validateBody } from "../utils/validation.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const credentialsSchema = z.object({
  username: z.string().min(3).max(50).toLowerCase(),
  password: z.string().min(6).max(128),
});

router.post(
  "/register",
  validateBody(credentialsSchema),
  async (req, res, next) => {
    try {
      const { username, password } = credentialsSchema.parse(req.body);
      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing) {
        res.status(409).json({ detail: "Username already exists" });
        return;
      }

      const passwordHash = await hashPassword(password);
      const user = await prisma.user.create({
        data: { username, passwordHash },
        select: { id: true, username: true, createdAt: true },
      });

      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/login",
  validateBody(credentialsSchema),
  async (req, res, next) => {
    try {
      const { username, password } = credentialsSchema.parse(req.body);
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user) {
        res.status(401).json({ detail: "Invalid credentials" });
        return;
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ detail: "Invalid credentials" });
        return;
      }

      if (req.session) {
        req.session.userId = user.id;
      }

      await logAction({ userId: user.id, action: "login", meta: { at: new Date().toISOString() } });

      res.json({ id: user.id, username: user.username, createdAt: user.createdAt });
    } catch (error) {
      next(error);
    }
  },
);

router.post("/logout", (req, res) => {
  if (req.session) {
    req.session = null;
  }
  res.status(204).send();
});

router.get("/me", requireAuth, (req, res) => {
  res.json(req.currentUser);
});

export default router;


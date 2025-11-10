import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db.js";

export async function attachCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.session?.userId;
  if (!userId) {
    return next();
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });
    if (user) {
      req.currentUser = user;
    } else if (req.session) {
      req.session = null;
    }
  } catch (error) {
    return next(error);
  }

  return next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.currentUser) {
    res.status(401).json({ detail: "Not authenticated" });
    return;
  }
  next();
}


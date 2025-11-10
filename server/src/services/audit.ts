import type { AuditLog, Prisma } from "@prisma/client";
import { prisma } from "../db.js";

export async function logAction({
  userId,
  action,
  meta,
}: {
  userId: number;
  action: string;
  meta?: Prisma.InputJsonValue;
}): Promise<AuditLog> {
  return prisma.auditLog.create({
    data: {
      userId,
      action,
      metaJson: meta ?? {},
    },
  });
}


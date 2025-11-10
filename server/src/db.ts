import { PrismaClient } from "@prisma/client";
import { config } from "./config.js";

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: config.databaseUrl,
    },
  },
  log: config.isProduction ? ["error"] : ["error", "warn"],
});

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}


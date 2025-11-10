import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "file:./tests/test.db";
process.env.SECRET_KEY ??= "test-secret-123";
process.env.OPENAI_API_KEY ??= "test-openai-key";
process.env.OPENAI_MODEL ??= "gpt-4o-mini";
process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";

const testDbPath = join(process.cwd(), "tests", "test.db");
if (existsSync(testDbPath)) {
  rmSync(testDbPath);
}

execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env } });

const { default: app } = await import("../src/app.js");
const { prisma, disconnectDb } = await import("../src/db.js");

afterAll(async () => {
  await disconnectDb();
});

export function api() {
  return request(app);
}

export async function resetDatabase(): Promise<void> {
  await prisma.biasCheck.deleteMany();
  await prisma.ruling.deleteMany();
  await prisma.case.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
}


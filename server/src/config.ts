import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z
    .string()
    .transform((val) => Number(val))
    .or(z.number())
    .optional()
    .default(8000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SECRET_KEY: z.string().min(10, "SECRET_KEY must be at least 10 characters"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  // eslint-disable-next-line no-process-exit
  process.exit(1);
}

export const config = {
  nodeEnv: parsed.data.NODE_ENV,
  port: typeof parsed.data.PORT === "number" ? parsed.data.PORT : parsed.data.PORT ?? 8000,
  databaseUrl: parsed.data.DATABASE_URL,
  secretKey: parsed.data.SECRET_KEY,
  openAiKey: parsed.data.OPENAI_API_KEY,
  openAiModel: parsed.data.OPENAI_MODEL,
  frontendOrigin: parsed.data.FRONTEND_ORIGIN,
  isProduction: parsed.data.NODE_ENV === "production",
  isTest: parsed.data.NODE_ENV === "test",
};


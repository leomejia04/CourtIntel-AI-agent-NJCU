import cookieSession from "cookie-session";
import type { RequestHandler } from "express";
import { config } from "../config.js";

export const sessionMiddleware: RequestHandler = cookieSession({
  name: "courtintel_session",
  secret: config.secretKey,
  httpOnly: true,
  sameSite: config.isProduction ? "none" : "lax",
  secure: config.isProduction,
  maxAge: 12 * 60 * 60 * 1000, // 12 hours
});


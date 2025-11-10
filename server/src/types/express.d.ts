import type session from "cookie-session";

declare module "express-serve-static-core" {
  interface Request {
    session?: session.Session & Partial<session.SessionObject> & { userId?: number | null };
    currentUser?: {
      id: number;
      username: string;
    };
  }
}


import cors from "cors";
import express from "express";
import morgan from "morgan";
import { config } from "./config.js";
import { attachCurrentUser } from "./middleware/auth.js";
import { sessionMiddleware } from "./middleware/session.js";
import apiRouter from "./routes/index.js";

const app = express();

app.use(
  cors({
    origin: config.frontendOrigin,
    credentials: true,
  }),
);
app.use(morgan(config.isProduction ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));
app.use(sessionMiddleware);
app.use(attachCurrentUser);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", apiRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ detail: "Internal server error" });
});

export default app;


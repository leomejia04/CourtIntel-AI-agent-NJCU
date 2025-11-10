import { Router } from "express";
import authRouter from "./auth.js";
import casesRouter from "./cases.js";
import rulingsRouter from "./rulings.js";
import logsRouter from "./logs.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/cases", casesRouter);
router.use("/cases", rulingsRouter);
router.use("/logs", logsRouter);

export default router;


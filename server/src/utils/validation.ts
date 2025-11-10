import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        detail: "Validation error",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    req.body = parsed.data as unknown as Request["body"];
    next();
  };
}


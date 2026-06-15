import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

export function validate(schema: z.ZodSchema, source: "body" | "query" | "params" = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        errors: result.error.flatten().fieldErrors,
        status: 400,
      });
      return;
    }
    req[source] = result.data;
    next();
  };
}

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters").max(32),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const tradeSchema = z.object({
  symbol: z.string().min(1).max(10),
  side: z.enum(["long", "short"]),
  type: z.enum(["market", "limit", "stop"]),
  quantity: z.number().positive(),
  price: z.number().positive().optional(),
});

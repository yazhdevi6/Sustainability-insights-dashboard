import type { ErrorRequestHandler, RequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { HttpError } from "../lib/httpError";
import { LlmError } from "../services/insights/providers/types";

/** Every error response has the same shape: { error: { code, message, details? } } */
function body(code: string, message: string, details?: unknown) {
  return { error: { code, message, ...(details !== undefined && { details }) } };
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(HttpError.notFound(`Route ${req.method} ${req.path} not found`));
};

const LLM_STATUS: Record<LlmError["kind"], number> = {
  timeout: 504,
  rate_limited: 429,
  auth: 502,
  invalid_response: 502,
  upstream: 502,
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json(body(err.code, err.message, err.details));
  }

  if (err instanceof LlmError) {
    console.error(`[llm] ${err.kind}: ${err.message}`);
    return res.status(LLM_STATUS[err.kind]).json(body(`LLM_${err.kind.toUpperCase()}`, err.publicMessage));
  }

  // Malformed JSON body from express.json()
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json(body("INVALID_JSON", "Request body is not valid JSON"));
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    console.error("[db] connection failed:", err.message);
    return res.status(503).json(body("DATABASE_UNAVAILABLE", "Database is unavailable. Check DATABASE_URL and that PostgreSQL is running."));
  }

  console.error("[unhandled]", err);
  res.status(500).json(body("INTERNAL_ERROR", "An unexpected error occurred"));
};

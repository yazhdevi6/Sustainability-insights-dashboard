import type { RequestHandler } from "express";
import type { z } from "zod";
import { HttpError } from "../lib/httpError";

type Schemas = {
  params?: z.ZodType;
  query?: z.ZodType;
  body?: z.ZodType;
};

/**
 * Validates request params/query/body against Zod schemas.
 * Parsed (coerced, defaulted) values are stored on `res.locals` so handlers
 * receive typed data instead of raw strings.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req, res, next) => {
    const issues: { location: string; path: string; message: string }[] = [];

    for (const location of ["params", "query", "body"] as const) {
      const schema = schemas[location];
      if (!schema) continue;
      const result = schema.safeParse(req[location] ?? {});
      if (result.success) {
        res.locals[location] = result.data;
      } else {
        for (const issue of result.error.issues) {
          issues.push({ location, path: issue.path.join("."), message: issue.message });
        }
      }
    }

    if (issues.length > 0) {
      return next(new HttpError(400, "VALIDATION_ERROR", "Request validation failed", issues));
    }
    next();
  };
}

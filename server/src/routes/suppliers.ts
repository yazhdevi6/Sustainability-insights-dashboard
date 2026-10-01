import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { env } from "../config/env";
import { validate } from "../middleware/validate";
import { getSupplierDetail, listSuppliers, type SupplierFilters } from "../services/supplierService";
import { generateInsight } from "../services/insights/insightService";

export const suppliersRouter = Router();

const idParams = z.object({ id: z.coerce.number().int().positive({ message: "Supplier id must be a positive integer" }) });

const listQuery = z.object({
  search: z.string().trim().max(100).optional(),
  sector: z.string().trim().max(50).optional(),
  status: z.enum(["review", "watch", "ok"]).optional(),
});

const insightBody = z.strictObject({ forceRefresh: z.boolean().default(false) });

// LLM calls cost money/quota, so they get a tighter per-IP limit than the rest of the API.
const insightLimiter = rateLimit({
  windowMs: 60_000,
  limit: env.INSIGHT_RATE_LIMIT_PER_MIN,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many insight requests. Please wait a minute and try again." } },
});

suppliersRouter.get("/", validate({ query: listQuery }), async (_req, res) => {
  const filters = res.locals.query as SupplierFilters;
  const suppliers = await listSuppliers(filters);
  res.json({ data: suppliers, count: suppliers.length });
});

suppliersRouter.get("/:id", validate({ params: idParams }), async (_req, res) => {
  const { id } = res.locals.params as z.infer<typeof idParams>;
  res.json({ data: await getSupplierDetail(id) });
});

suppliersRouter.post("/:id/insights", insightLimiter, validate({ params: idParams, body: insightBody }), async (_req, res) => {
  const { id } = res.locals.params as z.infer<typeof idParams>;
  const { forceRefresh } = res.locals.body as z.infer<typeof insightBody>;
  const { insight, cached } = await generateInsight(id, { forceRefresh });
  res.status(cached ? 200 : 201).json({ data: insight, meta: { cached } });
});

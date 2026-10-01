import { Router } from "express";
import { getDashboardSummary } from "../services/dashboardService";

export const dashboardRouter = Router();

dashboardRouter.get("/summary", async (_req, res) => {
  res.json({ data: await getDashboardSummary() });
});

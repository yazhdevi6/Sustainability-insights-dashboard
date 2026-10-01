import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { dashboardRouter } from "./routes/dashboard";
import { suppliersRouter } from "./routes/suppliers";
import { getLlmInfo } from "./services/insights/insightService";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

/**
 * The Express app. Default-exported so Vercel can run it as a serverless
 * function; src/index.ts imports it and listens on a port for local development.
 */
const app = express();

app.disable("x-powered-by");
// Behind Vercel's proxy: use the X-Forwarded-For client IP (needed for per-IP rate limiting).
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()) }));
app.use(express.json({ limit: "10kb" }));

app.get("/api/health", async (_req, res) => {
  let database: "up" | "down" = "up";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "down";
  }
  // Reports which LLM is active, never the key itself.
  res.status(database === "up" ? 200 : 503).json({ status: database === "up" ? "ok" : "degraded", database, llm: getLlmInfo() });
});

app.use("/api/dashboard", dashboardRouter);
app.use("/api/suppliers", suppliersRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

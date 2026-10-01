import "dotenv/config";
import { z } from "zod";

/**
 * All configuration comes from environment variables (server/.env).
 * Secrets such as GEMINI_API_KEY are only ever read here, on the server,
 * and are never sent to the client or written to logs.
 */
const PLACEHOLDER_KEYS = new Set(["", "your-gemini-api-key", "changeme"]);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required (see .env.example)"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  GEMINI_API_KEY: z
    .string()
    .optional()
    .transform((v) => (v && !PLACEHOLDER_KEYS.has(v.trim()) ? v.trim() : undefined)),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),
  INSIGHT_RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  console.error(`Invalid environment configuration:\n${problems}`);
  process.exit(1);
}

export const env = parsed.data;

/** Gemini is used when a key is configured; otherwise the deterministic mock provider is used. */
export const llmMode: "gemini" | "mock" = env.GEMINI_API_KEY ? "gemini" : "mock";

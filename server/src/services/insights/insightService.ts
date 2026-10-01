import { env, llmMode } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { loadAllSuppliers, loadSupplier } from "../supplierService";
import { buildInsightContext, hashContext } from "./context";
import { PROMPT_VERSION, SYSTEM_INSTRUCTION, buildUserPrompt } from "./prompt";
import { insightOutputSchema, type InsightOutput } from "./schema";
import { createGeminiProvider } from "./providers/gemini";
import { createMockProvider } from "./providers/mock";
import { LlmError, type InsightProvider, type LlmPrompt } from "./providers/types";

const provider: InsightProvider =
  llmMode === "gemini" ? createGeminiProvider(env.GEMINI_API_KEY!, env.GEMINI_MODEL, env.LLM_TIMEOUT_MS) : createMockProvider();

const MAX_ATTEMPTS = 2;

export function getLlmInfo() {
  return { provider: provider.name, model: provider.model, promptVersion: PROMPT_VERSION };
}

/** Parses and validates raw LLM text. Tolerates code fences, rejects anything off-schema. */
function parseOutput(raw: string): InsightOutput {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    throw new LlmError("invalid_response", `Response was not valid JSON: ${cleaned.slice(0, 200)}`);
  }
  const result = insightOutputSchema.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new LlmError("invalid_response", `Response failed schema validation: ${issues}`);
  }
  return result.data;
}

/** Calls the provider, retrying once on malformed output or transient upstream failure. */
async function generateWithRetry(prompt: LlmPrompt): Promise<InsightOutput> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return parseOutput(await provider.generate(prompt));
    } catch (err) {
      lastError = err;
      const retryable = err instanceof LlmError && (err.kind === "invalid_response" || err.kind === "upstream");
      if (!retryable || attempt === MAX_ATTEMPTS) break;
      console.warn(`[llm] attempt ${attempt} failed (${(err as LlmError).message}); retrying`);
    }
  }
  throw lastError;
}

export async function generateInsight(supplierId: number, options: { forceRefresh: boolean }) {
  // 1. Retrieve supplier data (and the portfolio, for benchmarks).
  const [supplier, portfolio] = await Promise.all([loadSupplier(supplierId), loadAllSuppliers()]);

  // 2. Prepare context. Reuse a cached insight if the context is unchanged.
  const context = buildInsightContext(supplier, portfolio);
  const contextHash = hashContext(context, `${provider.name}:${provider.model}:${PROMPT_VERSION}`);

  if (!options.forceRefresh) {
    const cached = await prisma.insight.findFirst({ where: { supplierId, contextHash }, orderBy: { createdAt: "desc" } });
    if (cached) return { insight: cached, cached: true };
  }

  // 3-4. Send to the LLM, then parse and validate the response.
  const started = Date.now();
  const output = await generateWithRetry({ system: SYSTEM_INSTRUCTION, user: buildUserPrompt(context), context });
  const latencyMs = Date.now() - started;

  // Post-processing: the review decision is owned by the deterministic rules, not the model.
  if (output.requiresReview !== context.ruleAssessment.requiresReview) {
    console.warn(`[llm] model requiresReview=${output.requiresReview} disagreed with rules for supplier ${supplierId}; using rules`);
  }

  const insight = await prisma.insight.create({
    data: {
      supplierId,
      summary: output.summary,
      riskLevel: output.riskLevel,
      requiresReview: context.ruleAssessment.requiresReview,
      keyFindings: output.keyFindings,
      recommendations: output.recommendations,
      provider: provider.name,
      model: provider.model,
      contextHash,
      latencyMs,
    },
  });

  // 5. Returned to the route, which sends it to the dashboard.
  return { insight, cached: false };
}

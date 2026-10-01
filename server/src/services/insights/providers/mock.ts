import type { InsightOutput } from "../schema";
import type { InsightProvider, LlmPrompt } from "./types";

/**
 * Deterministic, template-based stand-in for the LLM, used when GEMINI_API_KEY is
 * not configured. It returns a JSON string so its output goes through exactly the
 * same parsing and validation path as a real LLM response.
 */
export function createMockProvider(): InsightProvider {
  return {
    name: "mock",
    model: "rule-template",
    async generate({ context }: LlmPrompt) {
      const { supplier, metrics, ruleAssessment, certifications } = context;
      const byName = Object.fromEntries(metrics.map((m) => [m.metric, m]));
      const emissions = byName["Carbon emissions"];
      const recycled = byName["Recycled material"];
      const waste = byName["Waste recovery"];
      const flags = ruleAssessment.flags;

      const riskLevel: InsightOutput["riskLevel"] = flags.some((f) => f.severity === "high")
        ? "high"
        : flags.length > 0
          ? "medium"
          : "low";

      const trend =
        emissions.changePct === null
          ? "Emissions history is insufficient for a trend"
          : emissions.changePct > 0
            ? `Emissions rose ${emissions.changePct}% to ${emissions.current} tCO2e`
            : `Emissions fell ${Math.abs(emissions.changePct)}% to ${emissions.current} tCO2e`;

      const summary =
        flags.length > 0
          ? `${trend} for ${supplier.name}. Issues found: ${flags.map((f) => f.message.toLowerCase()).join("; ")}. ${
              ruleAssessment.requiresReview ? "The supplier requires further review." : "The supplier should be monitored."
            }`
          : `${trend} for ${supplier.name}, with recycled material at ${recycled.current}% and waste recovery at ${waste.current}%. No review policy thresholds were breached.`;

      const validCerts = certifications.filter((c) => c.status === "valid").map((c) => c.name);
      const output: InsightOutput = {
        summary,
        riskLevel,
        requiresReview: ruleAssessment.requiresReview,
        keyFindings: [
          { metric: "Carbon emissions", observation: `${trend}.`, sentiment: (emissions.changePct ?? 0) > 0 ? "negative" : "positive" },
          {
            metric: "Recycled material",
            observation: `Recycled material is ${recycled.current}% against a portfolio average of ${recycled.portfolioAverage}%.`,
            sentiment: (recycled.current ?? 0) >= (recycled.portfolioAverage ?? 0) ? "positive" : "negative",
          },
          {
            metric: "Certifications",
            observation: validCerts.length ? `Valid certifications: ${validCerts.join(", ")}.` : "No valid sustainability certification on record.",
            sentiment: validCerts.length ? "positive" : "negative",
          },
        ],
        recommendations: flags.length
          ? flags.slice(0, 3).map((f) => `Follow up with the supplier on: ${f.message.toLowerCase()}.`)
          : ["Maintain current monitoring cadence and recognise the supplier's performance."],
      };

      return JSON.stringify(output);
    },
  };
}

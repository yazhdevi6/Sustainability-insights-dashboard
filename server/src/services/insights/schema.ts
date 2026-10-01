import { z } from "zod";

/**
 * The contract for LLM output. It is used twice:
 *  1. As a JSON Schema sent to Gemini (structured output), so the model is
 *     constrained to this shape at generation time.
 *  2. As a Zod schema that re-validates the response on our side, because a
 *     schema hint is not a guarantee.
 */
export const insightOutputSchema = z.object({
  summary: z.string().trim().min(20).max(800),
  riskLevel: z.enum(["low", "medium", "high"]),
  requiresReview: z.boolean(),
  keyFindings: z
    .array(
      z.object({
        metric: z.string().trim().min(1).max(60),
        observation: z.string().trim().min(1).max(300),
        sentiment: z.enum(["positive", "negative", "neutral"]),
      }),
    )
    .min(1)
    .max(5),
  recommendations: z.array(z.string().trim().min(1).max(300)).min(1).max(4),
});

export type InsightOutput = z.infer<typeof insightOutputSchema>;

/** Hand-written JSON Schema limited to the subset Gemini supports. */
export const insightJsonSchema = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "2-3 sentence plain-English overview for a business user, citing the most important figures.",
    },
    riskLevel: { type: "string", enum: ["low", "medium", "high"] },
    requiresReview: { type: "boolean" },
    keyFindings: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          metric: { type: "string", description: "Metric name, e.g. 'Carbon emissions'" },
          observation: { type: "string", description: "One sentence with the relevant figure(s)." },
          sentiment: { type: "string", enum: ["positive", "negative", "neutral"] },
        },
        required: ["metric", "observation", "sentiment"],
        propertyOrdering: ["metric", "observation", "sentiment"],
      },
    },
    recommendations: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: { type: "string", description: "One concrete, actionable next step." },
    },
  },
  required: ["summary", "riskLevel", "requiresReview", "keyFindings", "recommendations"],
  propertyOrdering: ["summary", "riskLevel", "requiresReview", "keyFindings", "recommendations"],
} as const;

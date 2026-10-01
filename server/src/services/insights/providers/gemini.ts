import { ApiError, GoogleGenAI } from "@google/genai";
import { insightJsonSchema } from "../schema";
import { LlmError, type InsightProvider, type LlmPrompt } from "./types";

function toLlmError(err: unknown, timedOut: boolean): LlmError {
  if (err instanceof LlmError) return err;
  if (timedOut) return new LlmError("timeout", "Gemini request aborted after timeout");

  if (err instanceof ApiError) {
    const detail = `Gemini API ${err.status}: ${err.message}`;
    if (err.status === 429) return new LlmError("rate_limited", detail);
    if (err.status === 401 || err.status === 403 || /api key/i.test(err.message)) return new LlmError("auth", detail);
    return new LlmError("upstream", detail);
  }

  return new LlmError("upstream", `Gemini request failed: ${err instanceof Error ? err.message : String(err)}`);
}

export function createGeminiProvider(apiKey: string, model: string, timeoutMs: number): InsightProvider {
  const ai = new GoogleGenAI({ apiKey });

  return {
    name: "gemini",
    model,
    async generate({ system, user }: LlmPrompt) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await ai.models.generateContent({
          model,
          contents: user,
          config: {
            systemInstruction: system,
            temperature: 0.2, // low: consistent, factual wording
            responseMimeType: "application/json",
            responseJsonSchema: insightJsonSchema,
            abortSignal: controller.signal,
          },
        });

        const text = response.text;
        if (!text) {
          const reason = response.candidates?.[0]?.finishReason ?? response.promptFeedback?.blockReason ?? "unknown";
          throw new LlmError("invalid_response", `Gemini returned no text (reason: ${reason})`);
        }
        return text;
      } catch (err) {
        throw toLlmError(err, controller.signal.aborted);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

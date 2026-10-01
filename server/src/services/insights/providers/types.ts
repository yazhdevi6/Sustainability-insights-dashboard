import type { InsightContext } from "../context";

export interface LlmPrompt {
  system: string;
  user: string;
  /** Structured data behind the prompt; used by the mock provider. */
  context: InsightContext;
}

/** An LLM backend. Returns the raw text response; parsing/validation is done by the caller. */
export interface InsightProvider {
  readonly name: "gemini" | "mock";
  readonly model: string;
  generate(prompt: LlmPrompt): Promise<string>;
}

export type LlmErrorKind = "timeout" | "rate_limited" | "auth" | "invalid_response" | "upstream";

const PUBLIC_MESSAGES: Record<LlmErrorKind, string> = {
  timeout: "The AI service took too long to respond. Please try again.",
  rate_limited: "The AI service rate limit was reached. Please wait a minute and try again.",
  auth: "The AI service rejected the server's credentials. Check GEMINI_API_KEY on the server.",
  invalid_response: "The AI service returned a response that could not be understood. Please try again.",
  upstream: "The AI service is currently unavailable. Please try again later.",
};

/**
 * Error from the LLM layer. `message` holds internal detail for server logs;
 * `publicMessage` is the safe text returned to clients (no keys, no raw provider errors).
 */
export class LlmError extends Error {
  readonly publicMessage: string;

  constructor(
    readonly kind: LlmErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "LlmError";
    this.publicMessage = PUBLIC_MESSAGES[kind];
  }
}

# Technical Notes

## a. LLM and API used

**Google Gemini** (default model `gemini-2.5-flash`, set with `GEMINI_MODEL`), called through the official `@google/genai` Node SDK.

Why Gemini Flash:

- **Free tier.** It suits a prototype, and reviewers can run it with their own free key.
- **Native structured output.** Passing `responseMimeType: "application/json"` together with `responseJsonSchema` makes the model's output follow our schema while it is being generated. That is much more reliable than asking for JSON in the prompt.
- **Fast and cheap.** Each insight is a short, bounded task (about 1–2k input tokens, a few hundred output tokens) and doesn't need a larger model.

The provider sits behind a small interface (`InsightProvider` in `services/insights/providers/types.ts`). Switching to OpenAI or Claude means adding one file. A **mock provider** implements the same interface, so the app works with no key and still goes through the full parse, validate and store path.

## b. Prompt approach

Code for this is in `server/src/services/insights/prompt.ts` and `context.ts`.

1. **Calculate first, then prompt.** LLMs are unreliable at arithmetic. The backend works out every figure before calling the model: change since the previous period, portfolio averages, the supplier's emissions rank, certification validity and the review-rule flags. The model is asked to *interpret* these numbers, never to calculate them.
2. **Send only what's needed.** The context includes the supplier's name, sector, country and products; for each metric, the current value, previous value, % change, portfolio average, 4-quarter history and whether lower is better; certifications; and rule flags. It leaves out IDs, emails and timestamps. This keeps the prompt small and avoids sending personal data.
3. **The system instruction covers:**
   - **Role and audience:** a sustainability analyst writing for non-expert procurement users.
   - **Grounding:** use only the data provided, never invent figures, and say so when data is missing.
   - **Prompt-injection guard:** the data sits inside `<supplier_data>` tags and is described as data, not instructions.
   - **Assessment rules:** explain the flagged issues first; mention strengths too; set `requiresReview` from the rules; how to choose `riskLevel`.
   - **Style limits:** 2–3 sentences, under 80 words, cite figures, no markdown.
4. **Output schema:**

   ```json
   {
     "summary": "...",
     "riskLevel": "low|medium|high",
     "requiresReview": true,
     "keyFindings": [{ "metric": "...", "observation": "...", "sentiment": "positive|negative|neutral" }],
     "recommendations": ["..."]
   }
   ```

   The frontend renders the structured fields directly as risk badges, findings with icons and a numbered list of actions, rather than showing a block of free text.
5. **Temperature 0.2** keeps the wording consistent and factual.
6. **Prompt versioning.** `PROMPT_VERSION` is part of the cache key, so changing the prompt invalidates old insights automatically.

## c. API flow

1. **Retrieve.** `POST /api/suppliers/:id/insights` is rate limited and validated with Zod. It then loads the supplier, together with its products, certifications and metric history, plus the rest of the portfolio for benchmarking.
2. **Prepare context.** `buildInsightContext()` produces the compact, pre-calculated JSON, and a SHA-256 hash of it is taken, combined with the provider, model and prompt version.
3. **Cache check.** If an insight with the same hash exists and `forceRefresh` is false, the API returns it (200, `meta.cached: true`) without calling the LLM.
4. **Call the LLM.** The Gemini call runs with an AbortController timeout (`LLM_TIMEOUT_MS`, default 20s).
5. **Process the response:**
   - Strip any code fences, then `JSON.parse`.
   - Validate with the Zod schema (types, enums, lengths, array sizes).
   - Retry **up to twice**, waiting 1 s and then 2 s, if the output is invalid or the upstream failure is transient (for example Gemini's occasional "model overloaded" 503). Timeouts, auth failures and rate limits are not retried.
   - **Post-process:** `requiresReview` is always taken from the deterministic rules, and any disagreement is logged.
6. **Store and display.** The insight is saved with its provider, model, latency and context hash, then returned with 201. The React `InsightPanel` renders it, with loading, error and cached states.

**Error mapping.** Provider errors become typed `LlmError` values (`timeout`, `rate_limited`, `auth`, `invalid_response`, `upstream`). The central error handler maps them to 504, 429 or 502, each with a **safe public message**. Raw provider errors are only written to server logs.

## d. Technical decisions

| Decision | Reason |
|---|---|
| **Separate Express backend** (not Next.js API routes) | Makes the backend/frontend boundary the brief asks for explicit. The API can be tested, deployed and scaled on its own. |
| **Next.js server components for pages; client components only for charts, filters and the insight panel** | Data is fetched on the server, so there's no loading flicker and less JavaScript ships to the browser. Only interactive parts run on the client. |
| **`/api` rewrite proxy in Next.js** | The browser uses one origin, so no CORS setup is needed in development and the backend URL isn't hard-coded in client code. |
| **Deterministic review rules** (`reviewRules.ts`) | "Suppliers requiring review" is a KPI, so it must be reproducible, auditable and free. The LLM adds explanation, not the decision. Thresholds: emissions up more than 20% (high) or more than 10% (medium); recycled content under 10% (high) or under 20% (medium); waste recovery under 50% (medium); no valid certification (high). A supplier needs review if it has any high flag or at least 2 flags. |
| **Derived values are calculated, not stored** | Review status and certification validity depend on the current date and data. Computing them on each read keeps them correct; at 15 suppliers the cost is negligible. |
| **Insight caching by context hash** | Saves LLM quota (important on a free tier), makes repeat views instant, and keeps a history of insights. |
| **Prisma + PostgreSQL** | Schema-first with type-checked queries and versioned SQL migrations. `Json` columns hold findings and recommendations. |
| **Zod everywhere** | One library validates environment config, request params, query and body, and LLM output. Parsed values are coerced and typed. |
| **Security baseline** | The key is only in `server/.env`, which git ignores, and `.env.example` is provided. Helmet headers are set, JSON bodies are capped at 10 KB, request bodies are strictly validated, and the insight endpoint is rate limited per IP. Error messages don't expose internals, and the health endpoint reports the provider but not the key. |
| **Accessible charts** | Palette checked for colour blindness; status is always shown with an icon and label, not colour alone; light and dark themes; tooltips on hover; the table gives a readable view of all data. |

## e. Limitations and improvements

**Current limitations**

- **Tiny, synthetic dataset:** 15 suppliers × 4 quarters of fictional figures. There's no data import yet.
- **Rough benchmarks:** the portfolio average mixes sectors. Sector-specific comparisons, or emissions per unit of revenue or output, would be more meaningful.
- **No authentication or multi-tenancy.** Rate limiting is per IP, and behind the Next.js proxy every browser request appears to come from the same IP.
- **Synchronous LLM call:** the user waits up to about 20 s. There is no streaming.
- **Hallucination risk is reduced, not removed.** Grounding rules, pre-calculated figures, a schema and low temperature all help, but nothing automatically checks that every number quoted in the text matches the data.
- **Free-tier Gemini** has low per-minute quotas, and data sent on the free tier may be used by Google to improve its products. Production use needs a paid tier or Vertex AI.
- **No automated tests** yet. Verification was manual: endpoint checks and UI screenshots.

**Improvements**

1. **Better answer quality:** check that numbers quoted in the insight match the input data; add sector baselines; include emission scopes (1, 2 and 3).
2. **Portfolio-level insights:** an "executive summary" across all suppliers, and natural-language questions over the data (for example, "Which textile suppliers worsened this quarter?").
3. **Streaming responses:** stream tokens over SSE so the summary appears as it's written.
4. **Background jobs:** pre-generate insights when new data arrives (a queue such as BullMQ), instead of on demand.
5. **Data ingestion:** CSV/Excel upload and supplier self-reporting, with validation and a data-quality score.
6. **Production hardening:**
   - auth and role-based access control (RBAC)
   - per-user quotas
   - a Redis-backed rate limiter
   - structured logging and tracing, including LLM latency, tokens and cost
   - secrets manager
   - CI with unit tests for `reviewRules` and the response parser, API integration tests and Playwright end-to-end tests
7. **Evaluation:** a small labelled set of suppliers with expected findings, to regression-test prompt and model changes.

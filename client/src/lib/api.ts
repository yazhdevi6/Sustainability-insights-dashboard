import type { ApiErrorBody, DashboardSummary, Insight, SupplierDetail, SupplierSummary } from "./types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Server components call the Express API directly (API_URL).
 * Browser code calls the same-origin /api path, which next.config.ts rewrites to
 * the Express API, so the browser never talks to Gemini or holds any key.
 */
function baseUrl() {
  return typeof window === "undefined" ? (process.env.API_URL ?? "http://localhost:4000/api") : "/api";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Could not reach the API server. Is the backend running on port 4000?");
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (body as ApiErrorBody | null)?.error;
    throw new ApiError(res.status, err?.code ?? "HTTP_ERROR", err?.message ?? `Request failed with status ${res.status}`);
  }
  return (body as { data: T }).data;
}

export const api = {
  dashboard: () => request<DashboardSummary>("/dashboard/summary"),
  suppliers: () => request<SupplierSummary[]>("/suppliers"),
  supplier: (id: number) => request<SupplierDetail>(`/suppliers/${id}`),

  async generateInsight(id: number, forceRefresh: boolean) {
    const res = await fetch(`${baseUrl()}/suppliers/${id}/insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forceRefresh }),
    }).catch(() => {
      throw new ApiError(0, "NETWORK_ERROR", "Could not reach the API server.");
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const err = (body as ApiErrorBody | null)?.error;
      throw new ApiError(res.status, err?.code ?? "HTTP_ERROR", err?.message ?? "Insight generation failed.");
    }
    return body as { data: Insight; meta: { cached: boolean } };
  },
};

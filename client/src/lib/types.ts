// Shapes returned by the Express API (server/src). Dates arrive as ISO strings.

export type ReviewStatus = "review" | "watch" | "ok";
export type RiskLevel = "low" | "medium" | "high";

export interface SupplierSummary {
  id: number;
  name: string;
  country: string;
  sector: string;
  productCount: number;
  validCertificationCount: number;
  latestPeriod: string | null;
  emissionsTco2e: number | null;
  previousEmissionsTco2e: number | null;
  emissionsChangePct: number | null;
  recycledPct: number | null;
  wasteRecoveryPct: number | null;
  reviewStatus: ReviewStatus;
  requiresReview: boolean;
  flagCount: number;
}

export interface DashboardSummary {
  kpis: {
    totalSuppliers: number;
    totalProducts: number;
    totalEmissionsTco2e: number;
    previousTotalEmissionsTco2e: number;
    suppliersRequiringReview: number;
    latestPeriod: string | null;
  };
  charts: {
    emissionsBySupplier: { id: number; name: string; emissionsTco2e: number; reviewStatus: ReviewStatus }[];
    emissionsTrend: { period: string; emissionsTco2e: number }[];
    reviewStatus: { status: ReviewStatus; count: number }[];
    emissionsBySector: { sector: string; emissionsTco2e: number }[];
  };
  suppliers: SupplierSummary[];
}

export interface MetricValues {
  period: string;
  periodStart: string;
  emissionsTco2e: number;
  energyMwh: number;
  waterLitres: number;
  recycledPct: number;
  wasteRecoveryPct: number;
}

export type MetricKey = "emissionsTco2e" | "energyMwh" | "waterLitres" | "recycledPct" | "wasteRecoveryPct";

export interface ReviewFlag {
  code: string;
  severity: "high" | "medium";
  message: string;
}

export interface Insight {
  id: number;
  supplierId: number;
  summary: string;
  riskLevel: RiskLevel;
  requiresReview: boolean;
  keyFindings: { metric: string; observation: string; sentiment: "positive" | "negative" | "neutral" }[];
  recommendations: string[];
  provider: "gemini" | "mock";
  model: string;
  latencyMs: number;
  createdAt: string;
}

export interface SupplierDetail {
  id: number;
  name: string;
  country: string;
  sector: string;
  contactEmail: string | null;
  products: { id: number; name: string; category: string }[];
  certifications: { id: number; name: string; issuer: string; issuedOn: string; expiresOn: string | null; valid: boolean }[];
  current: MetricValues | null;
  previous: MetricValues | null;
  changes: Record<MetricKey, number | null>;
  history: MetricValues[];
  review: { status: ReviewStatus; requiresReview: boolean; flags: ReviewFlag[] };
  latestInsight: Insight | null;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

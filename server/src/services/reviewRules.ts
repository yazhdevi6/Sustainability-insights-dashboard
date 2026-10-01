/**
 * Deterministic review rules.
 *
 * "Requires review" drives a dashboard KPI, so it must be reproducible and auditable.
 * It is therefore computed by plain code, not by the LLM. The LLM receives these
 * flags as context and explains them in business language.
 */

export const REVIEW_THRESHOLDS = {
  emissionsIncreaseHighPct: 20,
  emissionsIncreaseMediumPct: 10,
  recycledCriticalPct: 10,
  recycledLowPct: 20,
  wasteRecoveryLowPct: 50,
} as const;

export type Severity = "high" | "medium";
export type ReviewStatus = "review" | "watch" | "ok";

export interface ReviewFlag {
  code: "EMISSIONS_INCREASE" | "LOW_RECYCLED_CONTENT" | "LOW_WASTE_RECOVERY" | "NO_VALID_CERTIFICATION";
  severity: Severity;
  message: string;
}

export interface ReviewAssessment {
  status: ReviewStatus;
  requiresReview: boolean;
  flags: ReviewFlag[];
}

export interface MetricValues {
  emissionsTco2e: number;
  energyMwh: number;
  waterLitres: number;
  recycledPct: number;
  wasteRecoveryPct: number;
}

export interface CertificationLike {
  name: string;
  expiresOn: Date | null;
}

export function pctChange(current: number, previous: number | undefined): number | null {
  if (previous === undefined || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10; // one decimal place
}

export function isCertificationValid(cert: CertificationLike, now = new Date()): boolean {
  return cert.expiresOn === null || cert.expiresOn.getTime() >= now.getTime();
}

export function assessSupplier(
  input: { latest?: MetricValues; previous?: MetricValues; certifications: CertificationLike[] },
  now = new Date(),
): ReviewAssessment {
  const t = REVIEW_THRESHOLDS;
  const flags: ReviewFlag[] = [];
  const { latest, previous, certifications } = input;

  if (latest) {
    const change = pctChange(latest.emissionsTco2e, previous?.emissionsTco2e);
    if (change !== null && change > t.emissionsIncreaseHighPct) {
      flags.push({ code: "EMISSIONS_INCREASE", severity: "high", message: `Emissions up ${change}% vs previous period` });
    } else if (change !== null && change > t.emissionsIncreaseMediumPct) {
      flags.push({ code: "EMISSIONS_INCREASE", severity: "medium", message: `Emissions up ${change}% vs previous period` });
    }

    if (latest.recycledPct < t.recycledLowPct) {
      flags.push({
        code: "LOW_RECYCLED_CONTENT",
        severity: latest.recycledPct < t.recycledCriticalPct ? "high" : "medium",
        message: `Recycled material at ${latest.recycledPct}% (target ≥ ${t.recycledLowPct}%)`,
      });
    }

    if (latest.wasteRecoveryPct < t.wasteRecoveryLowPct) {
      flags.push({
        code: "LOW_WASTE_RECOVERY",
        severity: "medium",
        message: `Waste recovery at ${latest.wasteRecoveryPct}% (target ≥ ${t.wasteRecoveryLowPct}%)`,
      });
    }
  }

  if (!certifications.some((c) => isCertificationValid(c, now))) {
    flags.push({
      code: "NO_VALID_CERTIFICATION",
      severity: "high",
      message: certifications.length === 0 ? "No sustainability certification on record" : "All certifications have expired",
    });
  }

  const highCount = flags.filter((f) => f.severity === "high").length;
  const requiresReview = highCount > 0 || flags.length >= 2;
  const status: ReviewStatus = requiresReview ? "review" : flags.length > 0 ? "watch" : "ok";

  return { status, requiresReview, flags };
}

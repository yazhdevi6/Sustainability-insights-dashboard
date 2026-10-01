import { createHash } from "node:crypto";
import { REVIEW_THRESHOLDS, isCertificationValid, pctChange } from "../reviewRules";
import { analyseSupplier, type SupplierWithRelations } from "../supplierService";

const METRICS = [
  { key: "emissionsTco2e", label: "Carbon emissions", unit: "tCO2e", lowerIsBetter: true },
  { key: "energyMwh", label: "Energy consumption", unit: "MWh", lowerIsBetter: true },
  { key: "waterLitres", label: "Water consumption", unit: "litres", lowerIsBetter: true },
  { key: "recycledPct", label: "Recycled material", unit: "%", lowerIsBetter: false },
  { key: "wasteRecoveryPct", label: "Waste recovery", unit: "%", lowerIsBetter: false },
] as const;

const round = (n: number) => Math.round(n * 10) / 10;
const isoDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/**
 * Builds the compact, pre-computed context sent to the LLM.
 *
 * All arithmetic (period-over-period change, portfolio averages, rule flags) is done
 * here in code. LLMs are unreliable at arithmetic, so the model is asked to interpret
 * numbers, never to calculate them. Only fields relevant to the analysis are included
 * (no ids, emails, timestamps), which keeps tokens low and avoids leaking data.
 */
export function buildInsightContext(supplier: SupplierWithRelations, portfolio: SupplierWithRelations[], now = new Date()) {
  const { latest, previous, review } = analyseSupplier(supplier, now);
  const portfolioLatest = portfolio.map((s) => s.metrics.at(-1)).filter((m) => m !== undefined);
  const sectorPeers = portfolio.filter((s) => s.sector === supplier.sector && s.id !== supplier.id);

  const avg = (key: (typeof METRICS)[number]["key"]) =>
    portfolioLatest.length ? round(portfolioLatest.reduce((sum, m) => sum + m[key], 0) / portfolioLatest.length) : null;

  const emissionsRank =
    latest &&
    [...portfolioLatest].sort((a, b) => b.emissionsTco2e - a.emissionsTco2e).findIndex((m) => m.supplierId === supplier.id) + 1;

  return {
    supplier: {
      name: supplier.name,
      country: supplier.country,
      sector: supplier.sector,
      products: supplier.products.map((p) => p.name),
    },
    reportingPeriod: { current: latest?.period ?? null, previous: previous?.period ?? null },
    metrics: METRICS.map((m) => ({
      metric: m.label,
      unit: m.unit,
      lowerIsBetter: m.lowerIsBetter,
      current: latest ? latest[m.key] : null,
      previous: previous ? previous[m.key] : null,
      changePct: latest ? pctChange(latest[m.key], previous?.[m.key]) : null,
      portfolioAverage: avg(m.key),
      history: supplier.metrics.map((row) => ({ period: row.period, value: row[m.key] })),
    })),
    portfolioPosition: {
      suppliersInPortfolio: portfolio.length,
      emissionsRank: emissionsRank || null, // 1 = highest emitter
      sectorPeers: sectorPeers.map((p) => p.name),
    },
    certifications: supplier.certifications.map((c) => ({
      name: c.name,
      status: isCertificationValid(c, now) ? "valid" : "expired",
      expiresOn: isoDate(c.expiresOn),
    })),
    ruleAssessment: {
      requiresReview: review.requiresReview,
      status: review.status,
      flags: review.flags,
      thresholds: REVIEW_THRESHOLDS,
    },
  };
}

export type InsightContext = ReturnType<typeof buildInsightContext>;

/** Stable hash of the LLM input, used to reuse a cached insight when nothing has changed. */
export function hashContext(context: InsightContext, providerKey: string): string {
  return createHash("sha256").update(providerKey).update(JSON.stringify(context)).digest("hex");
}

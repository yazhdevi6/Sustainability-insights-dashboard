import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/httpError";
import { assessSupplier, isCertificationValid, pctChange, type ReviewStatus } from "./reviewRules";

const supplierInclude = {
  products: { orderBy: { name: "asc" } },
  certifications: { orderBy: { expiresOn: "desc" } },
  metrics: { orderBy: { periodStart: "asc" } },
} satisfies Prisma.SupplierInclude;

export type SupplierWithRelations = Prisma.SupplierGetPayload<{ include: typeof supplierInclude }>;

/** Latest and previous reporting periods, plus the review assessment derived from them. */
export function analyseSupplier(s: SupplierWithRelations, now = new Date()) {
  const latest = s.metrics.at(-1);
  const previous = s.metrics.at(-2);
  const review = assessSupplier({ latest, previous, certifications: s.certifications }, now);
  return { latest, previous, review };
}

function toSummary(s: SupplierWithRelations) {
  const { latest, previous, review } = analyseSupplier(s);
  return {
    id: s.id,
    name: s.name,
    country: s.country,
    sector: s.sector,
    productCount: s.products.length,
    validCertificationCount: s.certifications.filter((c) => isCertificationValid(c)).length,
    latestPeriod: latest?.period ?? null,
    emissionsTco2e: latest?.emissionsTco2e ?? null,
    previousEmissionsTco2e: previous?.emissionsTco2e ?? null,
    emissionsChangePct: latest ? pctChange(latest.emissionsTco2e, previous?.emissionsTco2e) : null,
    recycledPct: latest?.recycledPct ?? null,
    wasteRecoveryPct: latest?.wasteRecoveryPct ?? null,
    reviewStatus: review.status,
    requiresReview: review.requiresReview,
    flagCount: review.flags.length,
  };
}

export type SupplierSummary = ReturnType<typeof toSummary>;

export async function loadAllSuppliers() {
  return prisma.supplier.findMany({ include: supplierInclude, orderBy: { name: "asc" } });
}

export async function loadSupplier(id: number) {
  const supplier = await prisma.supplier.findUnique({ where: { id }, include: supplierInclude });
  if (!supplier) throw HttpError.notFound(`Supplier ${id} not found`);
  return supplier;
}

export interface SupplierFilters {
  search?: string;
  sector?: string;
  status?: ReviewStatus;
}

export async function listSuppliers(filters: SupplierFilters = {}): Promise<SupplierSummary[]> {
  const suppliers = await prisma.supplier.findMany({
    where: {
      ...(filters.search && { name: { contains: filters.search, mode: "insensitive" } }),
      ...(filters.sector && { sector: { equals: filters.sector, mode: "insensitive" } }),
    },
    include: supplierInclude,
    orderBy: { name: "asc" },
  });
  const summaries = suppliers.map(toSummary);
  // Review status is derived, not stored, so it is filtered after computation.
  return filters.status ? summaries.filter((s) => s.reviewStatus === filters.status) : summaries;
}

export async function getSupplierDetail(id: number) {
  const s = await loadSupplier(id);
  const { latest, previous, review } = analyseSupplier(s);
  const latestInsight = await prisma.insight.findFirst({ where: { supplierId: id }, orderBy: { createdAt: "desc" } });

  const metricValues = (m: SupplierWithRelations["metrics"][number]) => {
    const { id: _id, supplierId: _sid, ...rest } = m;
    return rest;
  };
  const change = (key:"emissionsTco2e" | "energyMwh" | "waterLitres" | "recycledPct" | "wasteRecoveryPct") =>
    latest ? pctChange(latest[key], previous?.[key]) : null;

  return {
    id: s.id,
    name: s.name,
    country: s.country,
    sector: s.sector,
    contactEmail: s.contactEmail,
    products: s.products.map(({ id, name, category }) => ({ id, name, category })),
    certifications: s.certifications.map((c) => ({
      id: c.id,
      name: c.name,
      issuer: c.issuer,
      issuedOn: c.issuedOn,
      expiresOn: c.expiresOn,
      valid: isCertificationValid(c),
    })),
    current: latest ? metricValues(latest) : null,
    previous: previous ? metricValues(previous) : null,
    changes: {
      emissionsTco2e: change("emissionsTco2e"),
      energyMwh: change("energyMwh"),
      waterLitres: change("waterLitres"),
      recycledPct: change("recycledPct"),
      wasteRecoveryPct: change("wasteRecoveryPct"),
    },
    history: s.metrics.map(metricValues),
    review,
    latestInsight,
  };
}

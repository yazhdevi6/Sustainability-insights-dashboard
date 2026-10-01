import { prisma } from "../lib/prisma";
import { listSuppliers } from "./supplierService";

export async function getDashboardSummary() {
  const [suppliers, totalProducts, periodTotals] = await Promise.all([
    listSuppliers(),
    prisma.product.count(),
    prisma.metricPeriod.groupBy({
      by: ["period"],
      _sum: { emissionsTco2e: true },
      orderBy: { period: "asc" },
    }),
  ]);

  const totalEmissions = suppliers.reduce((sum, s) => sum + (s.emissionsTco2e ?? 0), 0);
  const previousTotal = suppliers.reduce((sum, s) => sum + (s.previousEmissionsTco2e ?? 0), 0);
  const count = (status: string) => suppliers.filter((s) => s.reviewStatus === status).length;

  // Emissions by sector for the latest period.
  const sectorTotals = new Map<string, number>();
  for (const s of suppliers) {
    sectorTotals.set(s.sector, (sectorTotals.get(s.sector) ?? 0) + (s.emissionsTco2e ?? 0));
  }

  return {
    kpis: {
      totalSuppliers: suppliers.length,
      totalProducts,
      totalEmissionsTco2e: totalEmissions,
      previousTotalEmissionsTco2e: previousTotal,
      suppliersRequiringReview: count("review"),
      latestPeriod: suppliers.find((s) => s.latestPeriod)?.latestPeriod ?? null,
    },
    charts: {
      emissionsBySupplier: suppliers
        .map((s) => ({ id: s.id, name: s.name, emissionsTco2e: s.emissionsTco2e ?? 0, reviewStatus: s.reviewStatus }))
        .sort((a, b) => b.emissionsTco2e - a.emissionsTco2e),
      emissionsTrend: periodTotals.map((p) => ({ period: p.period, emissionsTco2e: p._sum.emissionsTco2e ?? 0 })),
      reviewStatus: [
        { status: "review", count: count("review") },
        { status: "watch", count: count("watch") },
        { status: "ok", count: count("ok") },
      ],
      emissionsBySector: [...sectorTotals]
        .map(([sector, emissionsTco2e]) => ({ sector, emissionsTco2e }))
        .sort((a, b) => b.emissionsTco2e - a.emissionsTco2e),
    },
    suppliers,
  };
}

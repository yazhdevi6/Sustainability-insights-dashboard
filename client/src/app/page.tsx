import Link from "next/link";
import { api } from "@/lib/api";
import { formatNumber, formatTonnes } from "@/lib/format";
import type { ReviewStatus } from "@/lib/types";
import { Card } from "@/components/ui";
import { MetricCard } from "@/components/MetricCard";
import { SupplierTable } from "@/components/SupplierTable";
import { SupplierPicker } from "@/components/SupplierPicker";
import { HBarChart } from "@/components/charts/HBarChart";
import { LineTrendChart } from "@/components/charts/LineTrendChart";
import { ReviewBreakdown } from "@/components/charts/ReviewBreakdown";

export const dynamic = "force-dynamic";

const STATUSES = ["review", "watch", "ok"];

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const [{ kpis, charts, suppliers }, { status }] = await Promise.all([api.dashboard(), searchParams]);
  const initialStatus = STATUSES.includes(status ?? "") ? (status as ReviewStatus) : undefined;
  const emissionsChange = kpis.previousTotalEmissionsTco2e
    ? Math.round(((kpis.totalEmissionsTco2e - kpis.previousTotalEmissionsTco2e) / kpis.previousTotalEmissionsTco2e) * 1000) / 10
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Supplier sustainability overview</h1>
          <p className="mt-1 text-sm text-ink-2">Latest reporting period: {kpis.latestPeriod ?? "—"}</p>
        </div>
        <SupplierPicker suppliers={suppliers} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Total suppliers" value={formatNumber(kpis.totalSuppliers)} />
        <MetricCard label="Total products" value={formatNumber(kpis.totalProducts)} />
        <MetricCard
          label={`Total emissions (${kpis.latestPeriod ?? "latest"})`}
          value={formatNumber(kpis.totalEmissionsTco2e)}
          unit="tCO₂e"
          changePct={emissionsChange}
          previous={formatTonnes(kpis.previousTotalEmissionsTco2e)}
          lowerIsBetter
        />
        <div className="rounded-xl border border-critical/25 bg-critical-wash p-4">
          <div className="text-xs text-critical-ink">Suppliers requiring review</div>
          <div className="mt-1 text-2xl font-semibold text-ink">
            {kpis.suppliersRequiringReview}
            <span className="ml-1 text-sm font-normal text-ink-2">of {kpis.totalSuppliers}</span>
          </div>
          <Link href="/?status=review#suppliers" className="mt-1 inline-block text-xs font-medium text-critical-ink hover:underline">
            View list →
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Total emissions trend" subtitle="All suppliers, tCO₂e per quarter" className="lg:col-span-2">
          <LineTrendChart
            data={charts.emissionsTrend}
            xKey="period"
            series={[{ key: "emissionsTco2e", label: "Emissions", color: "var(--series-1)" }]}
            format="tonnes"
            tickFormat="compact"
          />
        </Card>
        <Card title="Review status" subtitle="Based on the review policy rules">
          <ReviewBreakdown data={charts.reviewStatus} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Emissions by supplier" subtitle={`${kpis.latestPeriod ?? "Latest"} · tCO₂e · click a bar to open`}>
          <HBarChart
            data={charts.emissionsBySupplier.map((s) => ({ label: s.name, value: s.emissionsTco2e, href: `/suppliers/${s.id}` }))}
            valueLabel="Emissions"
            format="tonnes"
            tickFormat="compact"
          />
        </Card>
        <Card title="Emissions by sector" subtitle={`${kpis.latestPeriod ?? "Latest"} · tCO₂e`}>
          <HBarChart
            data={charts.emissionsBySector.map((s) => ({ label: s.sector, value: s.emissionsTco2e }))}
            valueLabel="Emissions"
            format="tonnes"
            tickFormat="compact"
          />
        </Card>
      </div>

      <div id="suppliers" className="scroll-mt-4">
        <Card title="Suppliers" subtitle="Select a supplier to view details and generate an AI insight">
          <SupplierTable key={initialStatus ?? "all"} suppliers={suppliers} initialStatus={initialStatus} />
        </Card>
      </div>
    </div>
  );
}

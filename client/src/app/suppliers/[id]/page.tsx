import Link from "next/link";
import { notFound } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { formatCompact, formatDate, formatLitres, formatNumber, formatPct, formatTonnes } from "@/lib/format";
import { Card, StatusBadge } from "@/components/ui";
import { MetricCard } from "@/components/MetricCard";
import { InsightPanel } from "@/components/InsightPanel";
import { SupplierPicker } from "@/components/SupplierPicker";
import { LineTrendChart } from "@/components/charts/LineTrendChart";

export const dynamic = "force-dynamic";


export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [supplier, suppliers] = await Promise.all([
    api.supplier(id).catch((err) => {
      if (err instanceof ApiError && err.status === 404) notFound();
      throw err;
    }),
    api.suppliers(),
  ]);

  const { current, previous, changes, history, review } = supplier;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-ink-2 hover:text-ink">
          ← Dashboard
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-ink">{supplier.name}</h1>
              <StatusBadge status={review.status} />
            </div>
            <p className="mt-1 text-sm text-ink-2">
              {supplier.sector} · {supplier.country}
              {current && <> · Reporting period {current.period}</>}
              {previous && <span className="text-muted"> (compared with {previous.period})</span>}
            </p>
          </div>
          <SupplierPicker suppliers={suppliers} currentId={supplier.id} />
        </div>
      </div>

      {review.flags.length > 0 && (
        <div className="rounded-xl border border-line bg-surface p-4">
          <h2 className="mb-2 text-sm font-semibold text-ink">Review policy flags</h2>
          <ul className="flex flex-wrap gap-2">
            {review.flags.map((f) => (
              <li
                key={f.code}
                className={`rounded-lg px-2.5 py-1 text-xs ${f.severity === "high" ? "bg-critical-wash text-critical-ink" : "bg-warning-wash text-ink-2"}`}
              >
                <strong className="font-semibold">{f.severity === "high" ? "High" : "Medium"}:</strong> {f.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          label="Carbon emissions"
          value={formatNumber(current?.emissionsTco2e)}
          unit="tCO₂e"
          changePct={changes.emissionsTco2e}
          previous={formatTonnes(previous?.emissionsTco2e)}
          lowerIsBetter
        />
        <MetricCard
          label="Energy consumption"
          value={formatNumber(current?.energyMwh)}
          unit="MWh"
          changePct={changes.energyMwh}
          previous={`${formatNumber(previous?.energyMwh)} MWh`}
          lowerIsBetter
        />
        <MetricCard
          label="Water consumption"
          value={formatCompact(current?.waterLitres)}
          unit="litres"
          changePct={changes.waterLitres}
          previous={formatLitres(previous?.waterLitres)}
          lowerIsBetter
        />
        <MetricCard
          label="Recycled material"
          value={formatPct(current?.recycledPct)}
          changePct={changes.recycledPct}
          previous={formatPct(previous?.recycledPct)}
          lowerIsBetter={false}
        />
        <MetricCard
          label="Waste recovery"
          value={formatPct(current?.wasteRecoveryPct)}
          changePct={changes.wasteRecoveryPct}
          previous={formatPct(previous?.wasteRecoveryPct)}
          lowerIsBetter={false}
        />
      </div>

      <InsightPanel supplierId={supplier.id} initialInsight={supplier.latestInsight} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Carbon emissions" subtitle="tCO₂e per quarter">
          <LineTrendChart
            data={history}
            xKey="period"
            series={[{ key: "emissionsTco2e", label: "Emissions", color: "var(--series-1)" }]}
            format="tonnes"
            tickFormat="compact"
          />
        </Card>
        <Card title="Circularity" subtitle="% per quarter">
          <LineTrendChart
            data={history}
            xKey="period"
            series={[
              { key: "recycledPct", label: "Recycled", color: "var(--series-1)" },
              { key: "wasteRecoveryPct", label: "Waste recovery", color: "var(--series-2)" },
            ]}
            format="pct"
            tickFormat="pctTick"
            yDomain={[0, 100]}
          />
        </Card>
        <Card title="Energy consumption" subtitle="MWh per quarter">
          <LineTrendChart
            data={history}
            xKey="period"
            series={[{ key: "energyMwh", label: "Energy", color: "var(--series-1)" }]}
            format="mwh"
            tickFormat="compact"
            height={180}
          />
        </Card>
        <Card title="Water consumption" subtitle="Litres per quarter">
          <LineTrendChart
            data={history}
            xKey="period"
            series={[{ key: "waterLitres", label: "Water", color: "var(--series-1)" }]}
            format="litres"
            tickFormat="compact"
            height={180}
          />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Certifications">
          {supplier.certifications.length === 0 ? (
            <p className="text-sm text-muted">No certifications on record.</p>
          ) : (
            <ul className="divide-y divide-line">
              {supplier.certifications.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div>
                    <div className="font-medium text-ink">{c.name}</div>
                    <div className="text-xs text-muted">{c.issuer}</div>
                  </div>
                  <div className="text-right text-xs">
                    <StatusBadge status={c.valid ? "ok" : "review"} label={c.valid ? "Valid" : "Expired"} />
                    <div className="mt-1 text-muted">
                      {c.valid ? "Valid until" : "Expired"} {formatDate(c.expiresOn)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Products" subtitle={`${supplier.products.length} supplied products`}>
          <ul className="divide-y divide-line">
            {supplier.products.map((p) => (
              <li key={p.id} className="flex justify-between gap-2 py-2.5 text-sm">
                <span className="text-ink">{p.name}</span>
                <span className="text-muted">{p.category}</span>
              </li>
            ))}
          </ul>
          {supplier.contactEmail && <p className="mt-3 text-xs text-muted">Contact: {supplier.contactEmail}</p>}
        </Card>
      </div>
    </div>
  );
}

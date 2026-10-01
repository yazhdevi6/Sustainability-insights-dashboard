"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReviewStatus, SupplierSummary } from "@/lib/types";
import { changeTone, formatChange, formatNumber, formatPct } from "@/lib/format";
import { StatusBadge } from "./ui";

const TONE = { good: "text-good-ink", bad: "text-critical-ink", neutral: "text-ink-2" };

export function SupplierTable({ suppliers, initialStatus }: { suppliers: SupplierSummary[]; initialStatus?: ReviewStatus }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ReviewStatus | "">(initialStatus ?? "");
  const [sector, setSector] = useState("");

  const sectors = useMemo(() => [...new Set(suppliers.map((s) => s.sector))].sort(), [suppliers]);
  const rows = suppliers.filter(
    (s) =>
      (!search || s.name.toLowerCase().includes(search.toLowerCase()) || s.country.toLowerCase().includes(search.toLowerCase())) &&
      (!status || s.reviewStatus === status) &&
      (!sector || s.sector === sector),
  );

  const control = "rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink outline-none focus:border-accent";

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Search supplier or country…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${control} min-w-0 flex-1 basis-56`}
          aria-label="Search suppliers"
        />
        <select value={sector} onChange={(e) => setSector(e.target.value)} className={control} aria-label="Filter by sector">
          <option value="">All sectors</option>
          {sectors.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ReviewStatus | "")}
          className={control}
          aria-label="Filter by review status"
        >
          <option value="">All statuses</option>
          <option value="review">Needs review</option>
          <option value="watch">Watch</option>
          <option value="ok">On track</option>
        </select>
      </div>

      <div className="-mx-5 overflow-x-auto px-5">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="py-2 pr-3 font-medium">Supplier</th>
              <th className="py-2 pr-3 font-medium">Sector</th>
              <th className="py-2 pr-3 text-right font-medium">Emissions (tCO₂e)</th>
              <th className="py-2 pr-3 text-right font-medium">vs prev.</th>
              <th className="py-2 pr-3 text-right font-medium">Recycled</th>
              <th className="py-2 pr-3 text-right font-medium">Waste rec.</th>
              <th className="py-2 pr-3 text-right font-medium">Certs</th>
              <th className="py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {rows.map((s) => (
              <tr key={s.id} className="group border-b border-line last:border-0 hover:bg-surface-2">
                <td className="py-2.5 pr-3">
                  <Link href={`/suppliers/${s.id}`} className="font-medium text-ink group-hover:text-accent">
                    {s.name}
                  </Link>
                  <div className="text-xs text-muted">{s.country}</div>
                </td>
                <td className="py-2.5 pr-3 text-ink-2">{s.sector}</td>
                <td className="py-2.5 pr-3 text-right text-ink">{formatNumber(s.emissionsTco2e)}</td>
                <td className={`py-2.5 pr-3 text-right ${TONE[changeTone(s.emissionsChangePct, true)]}`}>
                  {formatChange(s.emissionsChangePct)}
                </td>
                <td className="py-2.5 pr-3 text-right text-ink-2">{formatPct(s.recycledPct)}</td>
                <td className="py-2.5 pr-3 text-right text-ink-2">{formatPct(s.wasteRecoveryPct)}</td>
                <td className="py-2.5 pr-3 text-right text-ink-2">{s.validCertificationCount}</td>
                <td className="py-2.5">
                  <StatusBadge status={s.reviewStatus} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-muted">
                  No suppliers match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

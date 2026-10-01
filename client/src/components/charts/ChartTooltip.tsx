export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

/** Shared tooltip card: values in ink, colour carried only by the swatch. */
export function TooltipCard({ title, rows, hint }: { title: string; rows: TooltipRow[]; hint?: string }) {
  return (
    <div className="min-w-40 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-semibold text-ink">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-ink-2">
            {r.color && <span className="size-2 rounded-full" style={{ background: r.color }} />}
            {r.label}
          </span>
          <span className="tabular font-medium text-ink">{r.value}</span>
        </div>
      ))}
      {hint && <div className="mt-1 text-muted">{hint}</div>}
    </div>
  );
}

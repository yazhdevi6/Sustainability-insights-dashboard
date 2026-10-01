import { changeTone, formatChange } from "@/lib/format";

const TONE = { good: "text-good-ink", bad: "text-critical-ink", neutral: "text-muted" };

export function MetricCard({
  label,
  value,
  unit,
  previous,
  changePct,
  lowerIsBetter,
}: {
  label: string;
  value: string;
  unit?: string;
  previous?: string;
  changePct?: number | null;
  lowerIsBetter?: boolean;
}) {
  const tone = changePct === undefined ? "neutral" : changeTone(changePct, lowerIsBetter ?? true);
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-ink">
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-ink-2">{unit}</span>}
      </div>
      {changePct !== undefined && (
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-xs">
          <span className={`font-medium ${TONE[tone]}`}>{formatChange(changePct)}</span>
          {previous && <span className="text-muted">from {previous}</span>}
        </div>
      )}
    </div>
  );
}

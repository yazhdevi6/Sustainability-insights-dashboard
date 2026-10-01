const nf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
const compact = new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 });

export const formatNumber = (n: number | null | undefined) => (n == null ? "—" : nf.format(n));
export const formatCompact = (n: number | null | undefined) => (n == null ? "—" : compact.format(n));
export const formatTonnes = (n: number | null | undefined) => (n == null ? "—" : `${nf.format(n)} tCO₂e`);
export const formatPct = (n: number | null | undefined) => (n == null ? "—" : `${nf.format(n)}%`);

export const formatLitres = (n: number | null | undefined) => (n == null ? "—" : `${compact.format(n)} L`);

/**
 * Named formatters. Server components can't pass functions to client chart
 * components, so charts take one of these keys instead.
 */
export const FORMATTERS = {
  number: formatNumber,
  compact: formatCompact,
  tonnes: formatTonnes,
  pct: formatPct,
  pctTick: (n: number | null | undefined) => (n == null ? "—" : `${n}%`),
  mwh: (n: number | null | undefined) => (n == null ? "—" : `${nf.format(n)} MWh`),
  litres: formatLitres,
} satisfies Record<string, (n: number | null | undefined) => string>;

export type FormatKey = keyof typeof FORMATTERS;

export function formatChange(pct: number | null | undefined) {
  if (pct == null) return "—";
  if (pct === 0) return "0%";
  return `${pct > 0 ? "▲" : "▼"} ${nf.format(Math.abs(pct))}%`;
}

/** Whether a change is favourable, given the metric's direction. */
export function changeTone(pct: number | null | undefined, lowerIsBetter: boolean): "good" | "bad" | "neutral" {
  if (pct == null || Math.abs(pct) < 0.5) return "neutral";
  return (pct < 0) === lowerIsBetter ? "good" : "bad";
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

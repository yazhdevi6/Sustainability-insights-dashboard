import type { ReactNode } from "react";
import type { ReviewStatus, RiskLevel } from "@/lib/types";

export function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-5 ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

// Status colours never carry meaning alone: every badge pairs an icon with a label.
const STATUS: Record<ReviewStatus, { label: string; icon: string; className: string }> = {
  review: { label: "Needs review", icon: "!", className: "bg-critical-wash text-critical-ink [--dot:var(--critical)]" },
  watch: { label: "Watch", icon: "~", className: "bg-warning-wash text-ink-2 [--dot:var(--warning)]" },
  ok: { label: "On track", icon: "✓", className: "bg-good-wash text-good-ink [--dot:var(--good)]" },
};

const RISK: Record<RiskLevel, ReviewStatus> = { high: "review", medium: "watch", low: "ok" };

function Pill({ icon, label, className }: { icon: string; label: string; className: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${className}`}>
      <span
        aria-hidden
        className="grid size-3.5 place-items-center rounded-full bg-[var(--dot)] text-[9px] leading-none font-bold text-white"
      >
        {icon}
      </span>
      {label}
    </span>
  );
}

export function StatusBadge({ status, label }: { status: ReviewStatus; label?: string }) {
  const s = STATUS[status];
  return <Pill icon={s.icon} label={label ?? s.label} className={s.className} />;
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const s = STATUS[RISK[level]];
  return <Pill icon={s.icon} label={`${level[0].toUpperCase()}${level.slice(1)} risk`} className={s.className} />;
}

export function statusMeta(status: ReviewStatus) {
  return STATUS[status];
}

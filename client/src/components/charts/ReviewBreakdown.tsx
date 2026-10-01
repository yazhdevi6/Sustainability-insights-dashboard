import Link from "next/link";
import type { ReviewStatus } from "@/lib/types";
import { StatusBadge, statusMeta } from "../ui";

const DOT: Record<ReviewStatus, string> = { review: "var(--critical)", watch: "var(--warning)", ok: "var(--good)" };

/** Part-to-whole of review status: one segmented bar plus a labelled list (no colour-only encoding). */
export function ReviewBreakdown({ data }: { data: { status: ReviewStatus; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  return (
    <div>
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Supplier review status breakdown">
        {data
          .filter((d) => d.count > 0)
          .map((d) => (
            <div
              key={d.status}
              title={`${statusMeta(d.status).label}: ${d.count}`}
              style={{ width: `${(d.count / total) * 100}%`, background: DOT[d.status] }}
            />
          ))}
      </div>
      <ul className="mt-4 space-y-2">
        {data.map((d) => (
          <li key={d.status} className="flex items-center justify-between text-sm">
            <Link href={`/?status=${d.status}#suppliers`} className="hover:underline" scroll={false}>
              <StatusBadge status={d.status} />
            </Link>
            <span className="tabular text-ink">
              <span className="font-semibold">{d.count}</span>
              <span className="ml-1 text-muted">({Math.round((d.count / total) * 100)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

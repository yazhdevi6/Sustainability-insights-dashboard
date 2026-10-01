"use client";

import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FORMATTERS, type FormatKey } from "@/lib/format";
import { TooltipCard } from "./ChartTooltip";

export interface BarDatum {
  label: string;
  value: number;
  href?: string;
}

/** Ranked horizontal bars (single series). Rows with an href navigate on click. */
export function HBarChart({
  data,
  valueLabel,
  format: formatKey,
  tickFormat: tickFormatKey,
}: {
  data: BarDatum[];
  valueLabel: string;
  format: FormatKey;
  tickFormat: FormatKey;
}) {
  const router = useRouter();
  const format = FORMATTERS[formatKey];
  const tickFormat = FORMATTERS[tickFormatKey];
  const clickable = data.some((d) => d.href);
  const height = Math.max(160, data.length * 26 + 36);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={6}>
          <CartesianGrid horizontal={false} stroke="var(--grid)" />
          <XAxis
            type="number"
            tickFormatter={tickFormat}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={{ stroke: "var(--axis)" }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={170}
            tick={{ fill: "var(--ink-2)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-2)" }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipCard
                  title={String(payload[0].payload.label)}
                  rows={[{ label: valueLabel, value: format(Number(payload[0].value)), color: "var(--series-1)" }]}
                  hint={payload[0].payload.href ? "Click to open supplier" : undefined}
                />
              ) : null
            }
          />
          <Bar
            dataKey="value"
            fill="var(--series-1)"
            radius={[0, 4, 4, 0]}
            maxBarSize={16}
            isAnimationActive={false}
            cursor={clickable ? "pointer" : undefined}
            onClick={(entry) => {
              const href = (entry as { payload?: BarDatum }).payload?.href;
              if (href) router.push(href);
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

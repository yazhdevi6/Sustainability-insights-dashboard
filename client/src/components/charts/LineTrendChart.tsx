"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FORMATTERS, type FormatKey } from "@/lib/format";
import { TooltipCard } from "./ChartTooltip";

export interface LineSeries {
  key: string;
  label: string;
  color: string;
}

/**
 * Time-series line chart on a single y-axis. Series sharing a chart must share a unit.
 * Two or more series get a legend plus a direct label at the last point.
 */
export function LineTrendChart({
  data,
  xKey,
  series,
  format: formatKey,
  tickFormat: tickFormatKey,
  height = 220,
  yDomain,
}: {
  data: readonly object[];
  xKey: string;
  series: LineSeries[];
  format: FormatKey;
  tickFormat: FormatKey;
  height?: number;
  yDomain?: [number | "auto", number | "auto"];
}) {
  const format = FORMATTERS[formatKey];
  const tickFormat = FORMATTERS[tickFormatKey];
  const multi = series.length > 1;
  const last = data.length - 1;

  return (
    <div>
      {multi && (
        <ul className="mb-2 flex flex-wrap gap-4 text-xs text-ink-2">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <div style={{ height }} className="w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: multi ? 72 : 16, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis
              dataKey={xKey}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              axisLine={{ stroke: "var(--axis)" }}
              tickLine={false}
              padding={{ left: 12, right: 12 }}
            />
            <YAxis
              tickFormatter={tickFormat}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={52}
              domain={yDomain ?? [0, "auto"]}
            />
            <Tooltip
              cursor={{ stroke: "var(--axis)", strokeWidth: 1 }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TooltipCard
                    title={String(label)}
                    rows={series.map((s) => ({
                      label: s.label,
                      value: format(Number(payload.find((p) => p.dataKey === s.key)?.value)),
                      color: s.color,
                    }))}
                  />
                ) : null
              }
            />
            {series.map((s) => (
              <Line
                key={s.key}
                type="linear"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={{ r: 3.5, fill: s.color, stroke: "var(--surface)", strokeWidth: 2 }}
                activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
                isAnimationActive={false}
                label={
                  multi
                    ? ({ x, y, index }: { x?: number | string; y?: number | string; index?: number }) =>
                        index === last ? (
                          <text key={`${s.key}-lbl`} x={Number(x) + 8} y={Number(y)} dy={4} fontSize={11} fill="var(--ink-2)">
                            {s.label}
                          </text>
                        ) : (
                          <g key={`${s.key}-${index}`} />
                        )
                    : undefined
                }
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

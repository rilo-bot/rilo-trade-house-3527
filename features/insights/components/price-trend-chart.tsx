"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "../insights.data";
import { AXIS_TICK, TOOLTIP_STYLE } from "./chart-theme";

/** Indicative 12-month median-price line: suburb (solid) vs region (dashed). */
export function PriceTrendChart({
  data,
  suburb,
}: {
  data: TrendPoint[];
  suburb: string;
}) {
  return (
    <div
      role="img"
      aria-label={`Line chart: indicative 12-month median price trend for ${suburb}, shown against the wider region.`}
      className="h-64 w-full sm:h-72"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          accessibilityLayer
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: 4 }}
        >
          <defs>
            <linearGradient id="suburbArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            minTickGap={16}
          />
          <YAxis
            width={58}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            domain={["dataMin - 30000", "dataMax + 30000"]}
            tickFormatter={(v: number) => `$${(v / 1_000_000).toFixed(2)}m`}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value) => `$${(Number(value) / 1_000_000).toFixed(2)}m`}
          />
          <Area
            type="monotone"
            dataKey="region"
            name="Region"
            stroke="var(--muted-foreground)"
            strokeDasharray="5 4"
            strokeWidth={2}
            fill="none"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="suburb"
            name={suburb}
            stroke="var(--primary)"
            strokeWidth={2.5}
            fill="url(#suburbArea)"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

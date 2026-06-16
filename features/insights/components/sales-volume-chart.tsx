"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { VolumePoint } from "../insights.data";
import { AXIS_TICK, TOOLTIP_STYLE } from "./chart-theme";

/** Monthly bars (new listings); the current month is highlighted. */
export function SalesVolumeChart({ data }: { data: VolumePoint[] }) {
  return (
    <div
      role="img"
      aria-label="Bar chart: new listings per month over the last 12 months, with the current month highlighted."
      className="h-64 w-full sm:h-72"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          accessibilityLayer
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: -8 }}
        >
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            minTickGap={12}
          />
          <YAxis
            width={32}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            contentStyle={TOOLTIP_STYLE}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={36}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill="var(--primary)"
                fillOpacity={d.current ? 1 : 0.28}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

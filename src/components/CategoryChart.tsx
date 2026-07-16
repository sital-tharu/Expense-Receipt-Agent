"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatInr } from "@/lib/stats";
import type { CategoryTotal } from "@/lib/stats";

const ROW_HEIGHT = 44;

export default function CategoryChart({ data }: { data: CategoryTotal[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">
        No spending this week yet.
      </p>
    );
  }

  return (
    <div style={{ height: data.length * ROW_HEIGHT + 16 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 76, bottom: 4, left: 0 }}
        >
          <CartesianGrid horizontal={false} stroke="var(--viz-grid)" />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="category"
            axisLine={false}
            tickLine={false}
            width={104}
            tick={{ fill: "var(--viz-ink-muted)", fontSize: 13 }}
          />
          <Tooltip
            cursor={{ fill: "transparent" }}
            formatter={(value) => [formatInr(Number(value)), "Spent"]}
            contentStyle={{
              background: "var(--viz-surface)",
              border: "1px solid var(--viz-grid)",
              borderRadius: 8,
              fontSize: 13,
              color: "var(--foreground)",
            }}
          />
          <Bar
            dataKey="total"
            fill="var(--viz-series-1)"
            barSize={18}
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="total"
              position="right"
              formatter={(value) => formatInr(Number(value))}
              style={{ fill: "var(--viz-ink-secondary)", fontSize: 12 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

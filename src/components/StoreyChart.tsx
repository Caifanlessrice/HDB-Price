import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { Building2 } from "lucide-react";
import type { HDBRecord } from "../types";
import { aggregateBy } from "../utils/aggregate";
import { formatPrice, formatPriceShort } from "../utils/format";
import { ChartCard } from "./ChartCard";
import { COLORS } from "../utils/colors";

interface StoreyChartProps {
  data: HDBRecord[];
}

// Sort storey ranges by their lower bound
function storeySort(a: string, b: string): number {
  const getMin = (s: string) => parseInt(s.split(" TO ")[0]) || 0;
  return getMin(a) - getMin(b);
}

export function StoreyChart({ data }: StoreyChartProps) {
  const agg = aggregateBy(data, "storeyRange").sort((a, b) =>
    storeySort(a.label, b.label)
  );

  return (
    <ChartCard
      title="Price by Storey Range"
      icon={<Building2 size={16} />}
      badge="High-floor premium"
      className="card-full"
    >
      <div style={{ minWidth: Math.max(400, agg.length * 45) }}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={agg} margin={{ bottom: 20 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            angle={-30}
            textAnchor="end"
          />
          <YAxis
            tickFormatter={(v) => formatPriceShort(v)}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value) => [formatPrice(Number(value)), "Avg Price"]}
            contentStyle={{
              background: "#1a1d27",
              border: "1px solid #2a2e3a",
              borderRadius: 8,
              fontSize: 13,
              color: "#ffffff",
            }}
            labelStyle={{ color: "#ffffff" }}
            itemStyle={{ color: "#ffffff" }}
          />
          <Bar dataKey="avg" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {agg.map((_, i) => (
              <Cell key={i} fill={COLORS[(i + 8) % COLORS.length]} />
            ))}
            <LabelList
              dataKey="avg"
              position="top"
              formatter={(v) => formatPriceShort(Number(v))}
              style={{ fill: "#ffffff", fontSize: 10, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

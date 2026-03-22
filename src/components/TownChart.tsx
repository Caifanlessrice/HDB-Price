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
import { BarChart3 } from "lucide-react";
import type { HDBRecord } from "../types";
import { aggregateBy } from "../utils/aggregate";
import { formatPrice, formatPriceShort } from "../utils/format";
import { ChartCard } from "./ChartCard";
import { COLORS } from "../utils/colors";

interface TownChartProps {
  data: HDBRecord[];
  onTownClick: (town: string) => void;
}

export function TownChart({ data, onTownClick }: TownChartProps) {
  const agg = aggregateBy(data, "town").sort((a, b) => b.avg - a.avg);

  return (
    <ChartCard
      title="Average Price by Town"
      icon={<BarChart3 size={16} />}
      badge="Tap to drill down"
      className="card-wide"
    >
      <div style={{ height: Math.max(400, agg.length * 28) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={agg} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis
              type="number"
              tickFormatter={(v) => formatPriceShort(v)}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={110}
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
            <Bar
              dataKey="avg"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              onClick={(entry) => onTownClick((entry as unknown as { label: string }).label)}
            >
              {agg.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
              <LabelList
                dataKey="avg"
                position="right"
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

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
import { Layers } from "lucide-react";
import type { HDBRecord } from "../types";
import { aggregateBy } from "../utils/aggregate";
import { formatPrice, formatPriceShort } from "../utils/format";
import { ChartCard } from "./ChartCard";
import { COLORS } from "../utils/colors";

const FLAT_ORDER = [
  "1 ROOM",
  "2 ROOM",
  "3 ROOM",
  "4 ROOM",
  "5 ROOM",
  "EXECUTIVE",
  "MULTI-GENERATION",
];

interface FlatTypeChartProps {
  data: HDBRecord[];
  onFlatTypeClick: (flatType: string) => void;
}

export function FlatTypeChart({ data, onFlatTypeClick }: FlatTypeChartProps) {
  const agg = aggregateBy(data, "flatType");
  const sorted = FLAT_ORDER.filter((t) =>
    agg.some((a) => a.label === t)
  ).map((t) => agg.find((a) => a.label === t)!);

  return (
    <ChartCard
      title="Price by Flat Type"
      icon={<Layers size={16} />}
      badge="Tap to drill down"
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={sorted} margin={{ bottom: 20 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            angle={-25}
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
          <Bar
            dataKey="avg"
            radius={[4, 4, 0, 0]}
            maxBarSize={50}
            cursor="pointer"
            onClick={(entry) => onFlatTypeClick((entry as unknown as { label: string }).label)}
          >
            {sorted.map((_, i) => (
              <Cell key={i} fill={COLORS[(i + 4) % COLORS.length]} />
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
    </ChartCard>
  );
}

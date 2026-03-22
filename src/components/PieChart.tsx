import { useState, useEffect } from "react";
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { PieChart as PieIcon } from "lucide-react";
import type { HDBRecord } from "../types";
import { ChartCard } from "./ChartCard";
import { COLORS } from "../utils/colors";

interface TransactionPieProps {
  data: HDBRecord[];
}

export function TransactionPie({ data }: TransactionPieProps) {
  const counts = new Map<string, number>();
  for (const r of data) {
    counts.set(r.flatType, (counts.get(r.flatType) ?? 0) + 1);
  }

  const chartData = Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const total = data.length;

  // Responsive sizing
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const innerR = isMobile ? 40 : 55;
  const outerR = isMobile ? 70 : 90;
  const labelFontSize = isMobile ? 9 : 11;

  return (
    <ChartCard title="Transaction Mix" icon={<PieIcon size={16} />}>
      <ResponsiveContainer width="100%" height={isMobile ? 260 : 280}>
        <RePieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={innerR}
            outerRadius={outerR}
            dataKey="value"
            paddingAngle={2}
            label={({ percent, x, y, textAnchor }: { percent?: number; x: number; y: number; textAnchor: string }) => (
              <text x={x} y={y} textAnchor={textAnchor as "start" | "middle" | "end"} fill="#ffffff" fontSize={labelFontSize} fontWeight={600}>
                {((percent ?? 0) * 100).toFixed(1)}%
              </text>
            )}
            labelLine={{ stroke: "#ffffff55", strokeWidth: 1 }}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [
              `${Number(value).toLocaleString()} (${((Number(value) / total) * 100).toFixed(1)}%)`,
              String(name),
            ]}
            contentStyle={{
              background: "#1a1d27",
              border: "1px solid #2a2e3a",
              borderRadius: 8,
              fontSize: 12,
              color: "#ffffff",
            }}
            labelStyle={{ color: "#ffffff" }}
            itemStyle={{ color: "#ffffff" }}
          />
          <Legend
            verticalAlign="bottom"
            iconSize={8}
            wrapperStyle={{ fontSize: isMobile ? 9 : 11 }}
          />
        </RePieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

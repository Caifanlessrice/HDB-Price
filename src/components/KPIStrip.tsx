import {
  DollarSign,
  TrendingUp,
  Crown,
  Hash,
} from "lucide-react";
import type { HDBRecord } from "../types";
import { formatPrice } from "../utils/format";
import { median } from "../utils/aggregate";
import { useMemo } from "react";

interface KPIStripProps {
  data: HDBRecord[];
}

export function KPIStrip({ data }: KPIStripProps) {
  const prices = data.map((r) => r.resalePrice);
  const avg = prices.length
    ? prices.reduce((a, b) => a + b, 0) / prices.length
    : 0;
  const med = median(prices);

  const mostExpensive = useMemo(() => {
    if (data.length === 0) return null;
    return data.reduce((max, r) => (r.resalePrice > max.resalePrice ? r : max), data[0]);
  }, [data]);

  const kpis = [
    {
      icon: <DollarSign size={18} />,
      label: "Avg Resale Price",
      value: formatPrice(avg),
      detail: null as string | null,
      color: "var(--accent)",
    },
    {
      icon: <TrendingUp size={18} />,
      label: "Median Price",
      value: formatPrice(med),
      detail: null as string | null,
      color: "var(--green)",
    },
    {
      icon: <Crown size={18} />,
      label: "Most Expensive Unit",
      value: mostExpensive ? formatPrice(mostExpensive.resalePrice) : "—",
      detail: mostExpensive
        ? `${mostExpensive.block} ${mostExpensive.streetName} · ${mostExpensive.flatType}`
        : null,
      color: "var(--orange)",
    },
    {
      icon: <Hash size={18} />,
      label: "Transactions",
      value: data.length.toLocaleString("en-SG"),
      detail: null as string | null,
      color: "var(--blue)",
    },
  ];

  return (
    <div className="kpi-strip">
      {kpis.map((k) => (
        <div className="kpi-card" key={k.label}>
          <div className="kpi-icon" style={{ color: k.color }}>
            {k.icon}
          </div>
          <div className="kpi-body">
            <span className="kpi-label">{k.label}</span>
            <span className="kpi-value">{k.value}</span>
            {k.detail && <span className="kpi-detail">{k.detail}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

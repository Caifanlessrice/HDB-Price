import { X, Search } from "lucide-react";
import type { HDBRecord } from "../types";
import { formatPrice, formatPriceShort } from "../utils/format";
import { median } from "../utils/aggregate";

interface DrillDownProps {
  title: string;
  data: HDBRecord[];
  onClose: () => void;
}

export function DrillDown({ title, data, onClose }: DrillDownProps) {
  const sorted = [...data].sort((a, b) => b.resalePrice - a.resalePrice);

  const prices = sorted.map((r) => r.resalePrice);
  const avg = prices.length
    ? prices.reduce((a, b) => a + b, 0) / prices.length
    : 0;
  const med = median(prices);
  const highest = prices[0] ?? 0;
  const lowest = prices[prices.length - 1] ?? 0;

  const display = sorted.slice(0, 300);

  return (
    <div className="drill-panel">
      <div className="card card-full">
        <div className="card-header">
          <h3>
            <Search size={16} /> {title} — {data.length.toLocaleString()}{" "}
            Transactions
          </h3>
          <button className="btn-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Summary stats */}
        <div className="drill-summary">
          <div className="drill-stat">
            <span className="drill-stat-label">Average</span>
            <span className="drill-stat-value">{formatPrice(avg)}</span>
          </div>
          <div className="drill-stat">
            <span className="drill-stat-label">Median</span>
            <span className="drill-stat-value">{formatPrice(med)}</span>
          </div>
          <div className="drill-stat">
            <span className="drill-stat-label">Highest</span>
            <span className="drill-stat-value highlight-up">
              {formatPrice(highest)}
            </span>
          </div>
          <div className="drill-stat">
            <span className="drill-stat-label">Lowest</span>
            <span className="drill-stat-value highlight-down">
              {formatPriceShort(lowest)}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Town</th>
                <th>Block & Street</th>
                <th>Flat Type</th>
                <th>Storey</th>
                <th>Area (sqm)</th>
                <th>Lease Start</th>
                <th>Price (S$)</th>
                <th>$/sqm</th>
              </tr>
            </thead>
            <tbody>
              {display.map((r, i) => (
                <tr key={i}>
                  <td>{r.month}</td>
                  <td>{r.town}</td>
                  <td>
                    {r.block} {r.streetName}
                  </td>
                  <td>{r.flatType}</td>
                  <td>{r.storeyRange}</td>
                  <td>{r.floorAreaSqm}</td>
                  <td>{r.leaseCommenceDate}</td>
                  <td>{formatPrice(r.resalePrice)}</td>
                  <td>${Math.round(r.pricePerSqm).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.length > 300 && (
          <p className="table-footer">
            Showing top 300 of {data.length.toLocaleString()} transactions
          </p>
        )}
      </div>
    </div>
  );
}

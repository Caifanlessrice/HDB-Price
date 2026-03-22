import type { HDBRecord, AggEntry, TrendPoint } from "../types";

export function aggregateBy(
  data: HDBRecord[],
  key: keyof HDBRecord
): AggEntry[] {
  const map = new Map<string, { sum: number; count: number }>();

  for (const r of data) {
    const k = String(r[key]);
    const entry = map.get(k) ?? { sum: 0, count: 0 };
    entry.sum += r.resalePrice;
    entry.count++;
    map.set(k, entry);
  }

  return Array.from(map.entries()).map(([label, { sum, count }]) => ({
    label,
    avg: sum / count,
    count,
    total: sum,
  }));
}

export function aggregateByPsm(data: HDBRecord[]): AggEntry[] {
  const map = new Map<string, { sum: number; count: number }>();

  for (const r of data) {
    if (r.pricePerSqm <= 0) continue;
    const entry = map.get(r.town) ?? { sum: 0, count: 0 };
    entry.sum += r.pricePerSqm;
    entry.count++;
    map.set(r.town, entry);
  }

  return Array.from(map.entries()).map(([label, { sum, count }]) => ({
    label,
    avg: sum / count,
    count,
    total: sum,
  }));
}

export function aggregateTrend(data: HDBRecord[]): TrendPoint[] {
  const map = new Map<string, { sum: number; count: number }>();

  for (const r of data) {
    const entry = map.get(r.month) ?? { sum: 0, count: 0 };
    entry.sum += r.resalePrice;
    entry.count++;
    map.set(r.month, entry);
  }

  return Array.from(map.entries())
    .map(([month, { sum, count }]) => ({
      month,
      avg: sum / count,
      count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

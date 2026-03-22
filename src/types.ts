// ── Core data types ────────────────────────────────────────

export interface RawRecord {
  month: string;
  town: string;
  flat_type: string;
  block: string;
  street_name: string;
  storey_range: string;
  floor_area_sqm: string;
  lease_commence_date: string;
  resale_price: string;
  remaining_lease?: string;
  flat_model?: string;
  _id: number;
}

export interface HDBRecord {
  month: string;
  year: string;
  town: string;
  flatType: string;
  block: string;
  streetName: string;
  storeyRange: string;
  floorAreaSqm: number;
  leaseCommenceDate: string;
  resalePrice: number;
  pricePerSqm: number;
  remainingLease: number | null;
}

// ── Filter state ───────────────────────────────────────────

export interface Filters {
  year: string;
  town: string;
  flatType: string;
}

// ── Aggregation helpers ────────────────────────────────────

export interface AggEntry {
  label: string;
  avg: number;
  count: number;
  total: number;
}

export interface TrendPoint {
  month: string;
  avg: number;
  count: number;
}

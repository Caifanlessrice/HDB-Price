import { RotateCcw, Calendar, MapPin, Home } from "lucide-react";
import type { Filters, HDBRecord } from "../types";

interface FilterBarProps {
  data: HDBRecord[];
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export function FilterBar({ data, filters, onChange }: FilterBarProps) {
  const years = [...new Set(data.map((r) => r.year))].sort();
  const towns = [...new Set(data.map((r) => r.town))].sort();
  const flatTypes = [...new Set(data.map((r) => r.flatType))].sort();

  const update = (key: keyof Filters, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const reset = () => {
    onChange({ year: "all", town: "all", flatType: "all" });
  };

  const hasActiveFilter =
    filters.year !== "all" ||
    filters.town !== "all" ||
    filters.flatType !== "all";

  return (
    <div className="filter-section">
      {/* Active filter chips */}
      {hasActiveFilter && (
        <div className="filter-chips">
          {filters.year !== "all" && (
            <span className="chip" onClick={() => update("year", "all")}>
              {filters.year} ×
            </span>
          )}
          {filters.town !== "all" && (
            <span className="chip" onClick={() => update("town", "all")}>
              {filters.town} ×
            </span>
          )}
          {filters.flatType !== "all" && (
            <span
              className="chip"
              onClick={() => update("flatType", "all")}
            >
              {filters.flatType} ×
            </span>
          )}
        </div>
      )}

      <div className="filter-controls">
        <div className="filter-item">
          <label>
            <Calendar size={13} /> Year
          </label>
          <select
            value={filters.year}
            onChange={(e) => update("year", e.target.value)}
          >
            <option value="all">All Years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label>
            <MapPin size={13} /> Town
          </label>
          <select
            value={filters.town}
            onChange={(e) => update("town", e.target.value)}
          >
            <option value="all">All Towns</option>
            {towns.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label>
            <Home size={13} /> Flat Type
          </label>
          <select
            value={filters.flatType}
            onChange={(e) => update("flatType", e.target.value)}
          >
            <option value="all">All Types</option>
            {flatTypes.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn-reset"
          onClick={reset}
          disabled={!hasActiveFilter}
        >
          <RotateCcw size={14} /> Reset
        </button>
      </div>
    </div>
  );
}

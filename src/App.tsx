import { useState, useMemo, useCallback, useRef } from "react";
import type { Filters } from "./types";
import { useHDBData } from "./hooks/useHDBData";
import { LoadingScreen } from "./components/LoadingScreen";
import { KPIStrip } from "./components/KPIStrip";
import { FilterBar } from "./components/FilterBar";
import { TownChart } from "./components/TownChart";
import { FlatTypeChart } from "./components/FlatTypeChart";
import { TrendChart } from "./components/TrendChart";
import { TransactionPie } from "./components/PieChart";
import { PsmChart } from "./components/PsmChart";
import { StoreyChart } from "./components/StoreyChart";
import { HeatMap } from "./components/HeatMap";
import { DrillDown } from "./components/DrillDown";
import "./App.css";

export interface DrillFilter {
  town?: string;
  flatType?: string;
  storeyRange?: string;
  month?: string;
}

function App() {
  const { data, loading, loadingMore, progress, total, error } = useHDBData();
  const [filters, setFilters] = useState<Filters>({
    year: "all",
    town: "all",
    flatType: "all",
  });
  const [drillFilter, setDrillFilter] = useState<DrillFilter | null>(null);
  const drillRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    return data.filter(
      (r) =>
        (filters.year === "all" || r.year === filters.year) &&
        (filters.town === "all" || r.town === filters.town) &&
        (filters.flatType === "all" || r.flatType === filters.flatType)
    );
  }, [data, filters]);

  // Apply drill-down filter on top of global filters
  const drillData = useMemo(() => {
    if (!drillFilter) return [];
    return filtered.filter((r) =>
      (!drillFilter.town || r.town === drillFilter.town) &&
      (!drillFilter.flatType || r.flatType === drillFilter.flatType) &&
      (!drillFilter.storeyRange || r.storeyRange === drillFilter.storeyRange) &&
      (!drillFilter.month || r.month === drillFilter.month)
    );
  }, [filtered, drillFilter]);

  const scrollToDrill = useCallback(() => {
    setTimeout(() => {
      drillRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  const handleDrill = useCallback((filter: DrillFilter) => {
    setDrillFilter(filter);
    scrollToDrill();
  }, [scrollToDrill]);

  const handleTownClick = useCallback((town: string) => {
    handleDrill({ town });
  }, [handleDrill]);

  const handleFlatTypeClick = useCallback((flatType: string) => {
    handleDrill({ flatType });
  }, [handleDrill]);

  const handleStoreyClick = useCallback((storeyRange: string) => {
    handleDrill({ storeyRange });
  }, [handleDrill]);

  const handleMonthClick = useCallback((month: string) => {
    handleDrill({ month });
  }, [handleDrill]);

  const handlePieClick = useCallback((flatType: string) => {
    handleDrill({ flatType });
  }, [handleDrill]);

  // Build drill-down title
  const drillTitle = useMemo(() => {
    if (!drillFilter) return "";
    const parts: string[] = [];
    if (drillFilter.town) parts.push(drillFilter.town);
    if (drillFilter.flatType) parts.push(drillFilter.flatType);
    if (drillFilter.storeyRange) parts.push(`Floor ${drillFilter.storeyRange}`);
    if (drillFilter.month) parts.push(drillFilter.month);
    return parts.join(" · ");
  }, [drillFilter]);

  if (loading) {
    return <LoadingScreen progress={progress} error={error} />;
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <span className="header-icon">🏠</span>
          <span className="header-title">HDB Resale Explorer</span>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <h1>Singapore HDB Resale Prices</h1>
        <p>
          Explore historical resale flat transactions across all towns, flat
          types, and time periods
        </p>
      </section>

      {/* Background loading indicator */}
      {loadingMore && (
        <div className="loading-banner">
          <div className="loading-banner-bar">
            <div
              className="loading-banner-fill"
              style={{ width: `${total > 0 ? (data.length / total) * 100 : 0}%` }}
            />
          </div>
          <span>{progress}</span>
        </div>
      )}

      {/* KPIs */}
      <KPIStrip data={filtered} />

      {/* Filters */}
      <FilterBar data={data} filters={filters} onChange={setFilters} />

      {/* Charts */}
      <section className="dashboard">
        {/* Heat Map — full width, first visual */}
        <HeatMap data={filtered} onTownClick={handleTownClick} />

        <div className="chart-row">
          <TownChart data={filtered} onTownClick={handleTownClick} />
          <FlatTypeChart data={filtered} onFlatTypeClick={handleFlatTypeClick} />
        </div>

        <div className="chart-row">
          <TrendChart data={filtered} onMonthClick={handleMonthClick} />
          <TransactionPie data={filtered} onFlatTypeClick={handlePieClick} />
        </div>

        <PsmChart data={filtered} onTownClick={handleTownClick} />
        <StoreyChart data={filtered} onStoreyClick={handleStoreyClick} />
      </section>

      {/* Drill-down */}
      <div ref={drillRef}>
        {drillFilter && (
          <DrillDown
            title={drillTitle}
            data={drillData}
            onClose={() => setDrillFilter(null)}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="footer">
        <p>
          Data source:{" "}
          <a href="https://data.gov.sg" target="_blank" rel="noopener noreferrer">
            data.gov.sg
          </a>{" "}
          — HDB Resale Flat Prices
        </p>
        <p className="footer-sub">
          Built with React, TypeScript &amp; Recharts
        </p>
      </footer>
    </div>
  );
}

export default App;

import { useState, useEffect, useRef, useCallback } from "react";
import type { RawRecord, HDBRecord } from "../types";
import { titleCase } from "../utils/format";
import { getCachedData, setCachedData } from "../utils/cache";

const DATASET_ID = "d_8b84c4ee58e3cfc0ece0d773c8ca6abc";
const PAGE_SIZE = 10_000;
const CURRENT_YEAR = new Date().getFullYear();
const MAX_PAGE_RETRIES = 10;
const RATE_WAIT = 5_000;
const BATCH_GAP = 2_500;

// Pre-built snapshot shipped with the app (updated at build time)
const SNAPSHOT_URL = `${import.meta.env.BASE_URL}hdb-snapshot.json`;

function normalise(r: RawRecord): HDBRecord {
  // Support both full keys (API) and short keys (snapshot)
  const month = r.month ?? r.m ?? "";
  const town = r.town ?? r.t ?? "";
  const flatType = r.flat_type ?? r.f ?? "";
  const block = r.block ?? r.b ?? "";
  const streetName = r.street_name ?? r.s ?? "";
  const storeyRange = r.storey_range ?? r.sr ?? "";
  const floorAreaSqm = parseFloat(r.floor_area_sqm ?? r.a ?? "0") || 0;
  const resalePrice = parseFloat(r.resale_price ?? r.p ?? "0") || 0;
  const leaseCommenceDate = r.lease_commence_date ?? r.l ?? "";
  const leaseStart = parseInt(leaseCommenceDate) || 0;

  return {
    month,
    year: month.substring(0, 4),
    town: titleCase(town),
    flatType,
    block,
    streetName: titleCase(streetName),
    storeyRange,
    floorAreaSqm,
    leaseCommenceDate,
    resalePrice,
    pricePerSqm: floorAreaSqm > 0 ? resalePrice / floorAreaSqm : 0,
    remainingLease: leaseStart > 0 ? 99 - (CURRENT_YEAR - leaseStart) : null,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(
  offset: number
): Promise<{ records: RawRecord[]; total: number }> {
  for (let attempt = 0; attempt < MAX_PAGE_RETRIES; attempt++) {
    try {
      const url = `https://data.gov.sg/api/action/datastore_search?resource_id=${DATASET_ID}&limit=${PAGE_SIZE}&offset=${offset}&sort=month%20desc`;
      const res = await fetch(url);

      if (res.status === 429) {
        await delay(RATE_WAIT + attempt * 1500);
        continue;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();

      if (json.code === 24 || json.name === "TOO_MANY_REQUESTS") {
        await delay(RATE_WAIT + attempt * 1500);
        continue;
      }

      return {
        records: json.result?.records ?? [],
        total: json.result?.total ?? 0,
      };
    } catch (err) {
      if (attempt < MAX_PAGE_RETRIES - 1) {
        await delay(RATE_WAIT);
        continue;
      }
      throw err;
    }
  }

  throw new Error("Rate limited after multiple retries");
}

/**
 * Load pre-built snapshot from the app bundle.
 * This is a static JSON file shipped with the build — no API calls needed.
 */
async function loadSnapshot(): Promise<RawRecord[] | null> {
  try {
    const res = await fetch(SNAPSHOT_URL);
    if (!res.ok) return null;
    const data: RawRecord[] = await res.json();
    return Array.isArray(data) && data.length > 0 ? data : null;
  } catch {
    return null;
  }
}

export function useHDBData() {
  const [data, setData] = useState<HDBRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [progress, setProgress] = useState("Loading…");
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const appendData = useCallback(
    (newRecords: HDBRecord[], totalCount: number, loadedCount: number) => {
      setData((prev) => [...prev, ...newRecords]);
      setTotal(totalCount);
      setProgress(
        `Loaded ${loadedCount.toLocaleString()} of ${totalCount.toLocaleString()} records`
      );
    },
    []
  );

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    async function fetchAllSequential(
      startOffset: number,
      totalRecords: number,
      existingRecords: HDBRecord[],
      existingCount: number,
      onProgress: (records: HDBRecord[], total: number, loaded: number) => void
    ): Promise<HDBRecord[]> {
      const allRecords = [...existingRecords];
      let loadedCount = existingCount;
      let currentOffset = startOffset;

      while (currentOffset < totalRecords) {
        try {
          const page = await fetchPage(currentOffset);
          const normalised = page.records.map(normalise);
          allRecords.push(...normalised);
          loadedCount += normalised.length;
          onProgress(normalised, totalRecords, loadedCount);
          currentOffset += PAGE_SIZE;
          if (page.records.length < PAGE_SIZE) break;
          if (currentOffset < totalRecords) await delay(BATCH_GAP);
        } catch {
          break;
        }
      }

      return allRecords;
    }

    async function fetchAll() {
      // ═══════════════════════════════════════════════════════
      // Priority 1: IndexedDB cache (instant, <100ms)
      // ═══════════════════════════════════════════════════════
      setProgress("Checking local cache…");
      try {
        const cached = await getCachedData();
        if (cached && cached.length > 0) {
          setData(cached);
          setTotal(cached.length);
          setProgress(`Loaded ${cached.length.toLocaleString()} records from cache`);
          setLoading(false);
          refreshInBackground(cached.length);
          return;
        }
      } catch {
        // Cache unavailable
      }

      // ═══════════════════════════════════════════════════════
      // Priority 2: Pre-built snapshot (fast, ~2-3s download)
      // Ships with the app — no API rate limits
      // ═══════════════════════════════════════════════════════
      setProgress("Loading snapshot…");
      try {
        const snapshot = await loadSnapshot();
        if (snapshot && snapshot.length > 0) {
          // Normalise in chunks to keep UI responsive
          const chunkSize = 50_000;
          const allRecords: HDBRecord[] = [];

          for (let i = 0; i < snapshot.length; i += chunkSize) {
            const chunk = snapshot.slice(i, i + chunkSize).map(normalise);
            allRecords.push(...chunk);

            // Yield to UI thread between chunks
            if (i + chunkSize < snapshot.length) {
              setProgress(
                `Processing ${Math.min(i + chunkSize, snapshot.length).toLocaleString()} of ${snapshot.length.toLocaleString()} records…`
              );
              await delay(0);
            }
          }

          setData(allRecords);
          setTotal(allRecords.length);
          setProgress(`Loaded ${allRecords.length.toLocaleString()} records`);
          setLoading(false);

          // Cache the snapshot data for even faster next load
          setCachedData(allRecords);

          // Check for newer data in background
          refreshInBackground(allRecords.length);
          return;
        }
      } catch {
        // Snapshot unavailable, fall back to API
      }

      // ═══════════════════════════════════════════════════════
      // Priority 3: Live API fetch (slowest, rate-limited)
      // ═══════════════════════════════════════════════════════
      setProgress("Connecting to data.gov.sg…");

      let totalRecords: number;
      let firstRecords: HDBRecord[];
      try {
        const firstPage = await fetchPage(0);
        totalRecords = firstPage.total;
        firstRecords = firstPage.records.map(normalise);
        appendData(firstRecords, totalRecords, firstRecords.length);
        setLoading(false);
        setLoadingMore(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
        setLoading(false);
        return;
      }

      const allRecords = await fetchAllSequential(
        PAGE_SIZE,
        totalRecords,
        firstRecords,
        firstRecords.length,
        (newRecords, total, loaded) => appendData(newRecords, total, loaded)
      );

      setLoadingMore(false);

      if (allRecords.length > 0) {
        setCachedData(allRecords);
      }
    }

    async function refreshInBackground(currentCount: number) {
      try {
        await delay(5000); // Don't compete with initial render
        const probe = await fetchPage(0);

        if (probe.total <= currentCount) return; // No new data

        setLoadingMore(true);

        const firstRecords = probe.records.map(normalise);

        const allRecords = await fetchAllSequential(
          PAGE_SIZE,
          probe.total,
          firstRecords,
          firstRecords.length,
          (_newRecords, total, loaded) => {
            setProgress(`Updating ${loaded.toLocaleString()} of ${total.toLocaleString()}`);
          }
        );

        if (allRecords.length > currentCount) {
          setData(allRecords);
          setTotal(allRecords.length);
          setProgress(`${allRecords.length.toLocaleString()} records (updated)`);
          setCachedData(allRecords);
        }

        setLoadingMore(false);
      } catch {
        // Background refresh failed — existing data is fine
        setLoadingMore(false);
      }
    }

    fetchAll();
  }, [appendData]);

  return { data, loading, loadingMore, progress, total, error };
}

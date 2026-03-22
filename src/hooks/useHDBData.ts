import { useState, useEffect, useRef, useCallback } from "react";
import type { RawRecord, HDBRecord } from "../types";
import { titleCase } from "../utils/format";
import { getCachedData, setCachedData } from "../utils/cache";

const DATASET_ID = "d_8b84c4ee58e3cfc0ece0d773c8ca6abc";
const PAGE_SIZE = 10_000;
const CURRENT_YEAR = new Date().getFullYear();
const MAX_PAGE_RETRIES = 10; // retries per single page request
const RATE_WAIT = 5_000; // base wait on 429
const BATCH_GAP = 2_500; // gap between sequential page fetches

function normalise(r: RawRecord): HDBRecord {
  const floorAreaSqm = parseFloat(r.floor_area_sqm) || 0;
  const resalePrice = parseFloat(r.resale_price) || 0;
  const leaseStart = parseInt(r.lease_commence_date) || 0;

  return {
    month: r.month,
    year: r.month?.substring(0, 4) ?? "",
    town: titleCase(r.town),
    flatType: r.flat_type,
    block: r.block,
    streetName: titleCase(r.street_name),
    storeyRange: r.storey_range,
    floorAreaSqm,
    leaseCommenceDate: r.lease_commence_date,
    resalePrice,
    pricePerSqm: floorAreaSqm > 0 ? resalePrice / floorAreaSqm : 0,
    remainingLease: leaseStart > 0 ? 99 - (CURRENT_YEAR - leaseStart) : null,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch a single page with aggressive retry + backoff.
 * Will keep trying for up to ~90 seconds before giving up.
 */
async function fetchPage(
  offset: number
): Promise<{ records: RawRecord[]; total: number }> {
  for (let attempt = 0; attempt < MAX_PAGE_RETRIES; attempt++) {
    try {
      const url = `https://data.gov.sg/api/action/datastore_search?resource_id=${DATASET_ID}&limit=${PAGE_SIZE}&offset=${offset}&sort=month%20desc`;
      const res = await fetch(url);

      if (res.status === 429) {
        await delay(RATE_WAIT + attempt * 1500); // 5s, 6.5s, 8s, 9.5s…
        continue;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();

      // Rate limit returned as 200 with error body
      if (json.code === 24 || json.name === "TOO_MANY_REQUESTS") {
        await delay(RATE_WAIT + attempt * 1500);
        continue;
      }

      return {
        records: json.result?.records ?? [],
        total: json.result?.total ?? 0,
      };
    } catch (err) {
      // Network error — retry after delay
      if (attempt < MAX_PAGE_RETRIES - 1) {
        await delay(RATE_WAIT);
        continue;
      }
      throw err;
    }
  }

  throw new Error("Rate limited after multiple retries");
}

export function useHDBData() {
  const [data, setData] = useState<HDBRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [progress, setProgress] = useState("Connecting to data.gov.sg…");
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

    /**
     * Sequential fetch with per-page retry.
     * Reliable over aggressive — each page retries independently.
     */
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

          // Stop if we got fewer records than requested (last page)
          if (page.records.length < PAGE_SIZE) break;

          // Pause between requests to stay under rate limit
          if (currentOffset < totalRecords) {
            await delay(BATCH_GAP);
          }
        } catch {
          // fetchPage already retried 10 times — give up on remaining
          break;
        }
      }

      return allRecords;
    }

    async function fetchAll() {
      // ── Step 1: Try IndexedDB cache (instant load) ──
      setProgress("Checking local cache…");
      try {
        const cached = await getCachedData();
        if (cached && cached.length > 0) {
          setData(cached);
          setTotal(cached.length);
          setProgress(`Loaded ${cached.length.toLocaleString()} records from cache`);
          setLoading(false);

          // Background refresh to check for new data
          refreshInBackground(cached.length);
          return;
        }
      } catch {
        // Cache unavailable, proceed with fetch
      }

      // ── Step 2: Fresh fetch — sequential with per-page retry ──
      setProgress("Connecting to data.gov.sg…");

      // First page — discover total
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

      // Fetch remaining pages
      const allRecords = await fetchAllSequential(
        PAGE_SIZE,
        totalRecords,
        firstRecords,
        firstRecords.length,
        (newRecords, total, loaded) => appendData(newRecords, total, loaded)
      );

      setLoadingMore(false);

      // Cache for instant next visit
      if (allRecords.length > 0) {
        setCachedData(allRecords);
      }
    }

    /**
     * Background refresh: check for new data and silently update cache.
     */
    async function refreshInBackground(cachedCount: number) {
      try {
        await delay(3000); // Don't compete with initial render
        const probe = await fetchPage(0);

        if (probe.total === cachedCount) return; // No new data

        // New data available — re-fetch everything
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

        if (allRecords.length > cachedCount) {
          setData(allRecords);
          setTotal(allRecords.length);
          setProgress(`${allRecords.length.toLocaleString()} records (updated)`);
          setCachedData(allRecords);
        }

        setLoadingMore(false);
      } catch {
        // Background refresh failed — cached data is fine
      }
    }

    fetchAll();
  }, [appendData]);

  return { data, loading, loadingMore, progress, total, error };
}

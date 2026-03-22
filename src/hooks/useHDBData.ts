import { useState, useEffect, useRef, useCallback } from "react";
import type { RawRecord, HDBRecord } from "../types";
import { titleCase } from "../utils/format";

const DATASET_ID = "d_8b84c4ee58e3cfc0ece0d773c8ca6abc";
const PAGE_SIZE = 10_000;
const CURRENT_YEAR = new Date().getFullYear();
const RATE_LIMIT_DELAY = 2_000; // ms between requests
const RETRY_DELAY = 10_000; // ms to wait after hitting rate limit
const MAX_RETRIES = 8;

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

async function fetchPage(
  offset: number
): Promise<{ records: RawRecord[]; total: number }> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Sort by month descending so we load the most recent data first
    const url = `https://data.gov.sg/api/action/datastore_search?resource_id=${DATASET_ID}&limit=${PAGE_SIZE}&offset=${offset}&sort=month%20desc`;
    const res = await fetch(url);

    if (res.status === 429) {
      await delay(RETRY_DELAY);
      continue;
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();

    // Rate limit returned as 200 with error body
    if (json.code === 24 || json.name === "TOO_MANY_REQUESTS") {
      await delay(RETRY_DELAY);
      continue;
    }

    return {
      records: json.result?.records ?? [],
      total: json.result?.total ?? 0,
    };
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

  // Progressive data update — batches state updates
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

    async function fetchAll() {
      let offset = 0;
      let loadedCount = 0;
      let isFirstBatch = true;
      let totalRecords = 0;
      let consecutiveErrors = 0;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          const page = await fetchPage(offset);
          consecutiveErrors = 0; // reset on success
          totalRecords = page.total;

          const normalised = page.records.map(normalise);
          loadedCount += normalised.length;
          offset += PAGE_SIZE;

          appendData(normalised, page.total, loadedCount);

          // After first batch, switch from full loading screen to background loading
          if (isFirstBatch) {
            setLoading(false);
            setLoadingMore(true);
            isFirstBatch = false;
          }

          // Stop when we've received fewer records than requested (last page)
          // OR when we've loaded all records based on the total count
          if (page.records.length < PAGE_SIZE || loadedCount >= totalRecords) {
            break;
          }

          // Rate-limit-safe delay between requests
          await delay(RATE_LIMIT_DELAY);
        } catch (err) {
          consecutiveErrors++;

          if (isFirstBatch) {
            setError(
              err instanceof Error ? err.message : "Failed to fetch data"
            );
            setLoading(false);
            break;
          }

          // Retry up to 3 consecutive errors before giving up
          if (consecutiveErrors >= 3) {
            break;
          }

          // Wait longer before retrying after an error
          await delay(RETRY_DELAY);
        }
      }

      setLoadingMore(false);
    }

    fetchAll();
  }, [appendData]);

  return { data, loading, loadingMore, progress, total, error };
}

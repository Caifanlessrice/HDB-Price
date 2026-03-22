/**
 * IndexedDB cache for HDB data.
 * Stores the full normalised dataset so repeat visits load instantly (<1s).
 */

const DB_NAME = "hdb-resale-cache";
const DB_VERSION = 1;
const STORE_NAME = "records";
const META_STORE = "meta";
const CACHE_KEY = "hdb-data";
const META_KEY = "cache-meta";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

import type { HDBRecord } from "../types";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedData(): Promise<HDBRecord[] | null> {
  try {
    const db = await openDB();

    // Check meta for freshness
    const meta = await new Promise<{ timestamp: number; count: number } | undefined>((resolve, reject) => {
      const tx = db.transaction(META_STORE, "readonly");
      const store = tx.objectStore(META_STORE);
      const req = store.get(META_KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (!meta || Date.now() - meta.timestamp > CACHE_TTL) {
      return null; // expired or missing
    }

    // Read cached records
    const records = await new Promise<HDBRecord[] | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(CACHE_KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (records && records.length === meta.count) {
      return records;
    }
    return null;
  } catch {
    return null; // IndexedDB not available
  }
}

export async function setCachedData(records: HDBRecord[]): Promise<void> {
  try {
    const db = await openDB();

    // Write records
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_NAME, META_STORE], "readwrite");
      tx.objectStore(STORE_NAME).put(records, CACHE_KEY);
      tx.objectStore(META_STORE).put(
        { timestamp: Date.now(), count: records.length },
        META_KEY
      );
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Silently fail — caching is best-effort
  }
}

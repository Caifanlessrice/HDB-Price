/**
 * Fetches all HDB resale records via the data.gov.sg bulk download API
 * and saves as a compact JSON snapshot.
 *
 * Uses the S3 download endpoint — no rate limiting, downloads in seconds.
 *
 * Usage: npm run snapshot
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(__dirname, "..", "public", "hdb-snapshot.json");
const DATASET_ID = "d_8b84c4ee58e3cfc0ece0d773c8ca6abc";

async function main() {
  console.log("🏠 Fetching HDB resale data via bulk download…\n");

  // Step 1: Get S3 download URL
  console.log("  📡 Requesting download URL…");
  const initRes = await fetch(
    `https://api-open.data.gov.sg/v1/public/api/datasets/${DATASET_ID}/initiate-download`
  );
  const initData = await initRes.json();

  if (!initData.data?.url) {
    throw new Error("Failed to get download URL: " + JSON.stringify(initData));
  }

  // Step 2: Download CSV
  console.log("  ⬇️  Downloading CSV from S3…");
  const csvRes = await fetch(initData.data.url);
  const csvText = await csvRes.text();

  // Step 3: Parse CSV
  console.log("  🔄 Parsing CSV…");
  const lines = csvText.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  console.log(`     Headers: ${headers.join(", ")}`);

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    const record = {};
    headers.forEach((h, j) => {
      record[h] = values[j]?.trim() || "";
    });
    records.push(record);
  }

  console.log(`     Parsed: ${records.length.toLocaleString()} records`);

  // Step 4: Compact — strip to needed fields with short keys
  console.log("  📦 Compacting…");
  const compact = records.map((r) => ({
    m: r.month,
    t: r.town,
    f: r.flat_type,
    b: r.block,
    s: r.street_name,
    sr: r.storey_range,
    a: r.floor_area_sqm,
    l: r.lease_commence_date,
    p: r.resale_price,
  }));

  // Step 5: Save
  fs.writeFileSync(OUTPUT, JSON.stringify(compact));

  const sizeMB = (fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(1);
  console.log(`\n✅ Done! ${compact.length.toLocaleString()} records → ${OUTPUT}`);
  console.log(`   Size: ${sizeMB} MB (serves as ~2.6 MB gzipped)`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

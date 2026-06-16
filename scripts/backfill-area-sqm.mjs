/**
 * Tread House — area m² backfill.
 *
 * Advanced search filters/sorts on a canonical square-metre field (`valueSqm`)
 * stored next to each listing's `area` / `landArea` (see features/listings/area.ts).
 * New + edited listings get it stamped on write; this one-off script populates it
 * for documents created before that change.
 *
 * Usage (from the project root):
 *   node scripts/backfill-area-sqm.mjs            # backfill missing valueSqm
 *   node scripts/backfill-area-sqm.mjs --all      # recompute for every listing
 *   node scripts/backfill-area-sqm.mjs --dry-run  # report only, write nothing
 *
 * Dependency-free: uses only the installed `mongodb` driver + Node built-ins, and
 * reads MONGODB_URI / MONGODB_DB_NAME from .env.local (or the real environment).
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { MongoClient } from "mongodb";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const argv = new Set(process.argv.slice(2));
const ALL = argv.has("--all");
const DRY_RUN = argv.has("--dry-run");

/** Multiplier to convert a value in the given unit to square metres. */
const TO_SQM = { sqm: 1, hectare: 10_000, sqft: 0.092903, sqyd: 0.836127 };

const toSqm = (value, unit) => {
  const factor = TO_SQM[unit] ?? 1;
  return Math.round(value * factor * 100) / 100;
};

/** Minimal .env.local loader (no dotenv dependency). Real env vars win. */
function loadEnv() {
  try {
    const text = readFileSync(join(ROOT, ".env.local"), "utf8");
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    /* no .env.local — rely on the real environment */
  }
}
loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

if (!MONGODB_URI || !MONGODB_DB_NAME) {
  console.error("[backfill] MONGODB_URI / MONGODB_DB_NAME are required");
  process.exit(1);
}

/** Build the $set for a doc's computable area fields (only what's present + valid). */
function buildSet(doc) {
  const set = {};
  if (
    doc.area &&
    typeof doc.area.value === "number" &&
    typeof doc.area.unit === "string" &&
    (ALL || typeof doc.area.valueSqm !== "number")
  ) {
    set["area.valueSqm"] = toSqm(doc.area.value, doc.area.unit);
  }
  if (
    doc.landArea &&
    typeof doc.landArea.value === "number" &&
    typeof doc.landArea.unit === "string" &&
    (ALL || typeof doc.landArea.valueSqm !== "number")
  ) {
    set["landArea.valueSqm"] = toSqm(doc.landArea.value, doc.landArea.unit);
  }
  return set;
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const col = client.db(MONGODB_DB_NAME).collection("listings");

  const cursor = col.find(
    { $or: [{ area: { $exists: true } }, { landArea: { $exists: true } }] },
    { projection: { area: 1, landArea: 1 } },
  );

  const ops = [];
  let scanned = 0;
  for await (const doc of cursor) {
    scanned++;
    const set = buildSet(doc);
    if (Object.keys(set).length > 0) {
      ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set: set } } });
    }
  }

  console.log(`[backfill] scanned ${scanned} listing(s); ${ops.length} need updates`);
  if (ops.length > 0 && !DRY_RUN) {
    const res = await col.bulkWrite(ops, { ordered: false });
    console.log(`[backfill] updated ${res.modifiedCount} listing(s)`);
  } else if (DRY_RUN) {
    console.log("[backfill] dry run — no writes performed");
  }

  await client.close();
}

main().catch((err) => {
  console.error("[backfill] failed:", err);
  process.exit(1);
});

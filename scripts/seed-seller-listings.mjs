/**
 * Tread House — additive seller listings.
 *
 * Adds genuine-looking listings for specific real seller accounts (resolved BY
 * EMAIL), WITHOUT touching the main dataset. Every listing gets a UNIQUE set of
 * photos (no image repeats across this batch, covers are all "fresh" photos), is
 * active + recently dated so it surfaces in the home "Featured" (newest) section,
 * and is owned by the matching account so it shows in that owner's dashboard.
 *
 * Tagged `seedSource: "nz-seed-sellers"` — separate from the main `nz-seed`
 * dataset, so the two never clear or overwrite each other.
 *
 *   node scripts/seed-seller-listings.mjs            # replace this batch, then insert
 *   node scripts/seed-seller-listings.mjs --keep     # append without clearing
 *   node scripts/seed-seller-listings.mjs --dry-run  # validate offline, write nothing
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { MongoClient, ObjectId } from "mongodb";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SEED_SOURCE = "nz-seed-sellers";

const argv = new Set(process.argv.slice(2));
const KEEP = argv.has("--keep");
const DRY_RUN = argv.has("--dry-run");

/* ── env ───────────────────────────────────────────────────────────────────── */
function loadEnv() {
  try {
    for (const raw of readFileSync(join(ROOT, ".env.local"), "utf8").replace(/^﻿/, "").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {}
}
loadEnv();
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;
if (!MONGODB_URI || !MONGODB_DB_NAME) {
  console.error("✖ MONGODB_URI and MONGODB_DB_NAME must be set.");
  process.exit(1);
}

/* ── canonical NZ suburb table (district/region/postcode/geo) ──────────────── */
// [suburb, district, region, postcode, lat, lng]
const SUBURBS = [
  ["Ponsonby", "Auckland City", "Auckland", "1011", -36.8575, 174.7456],
  ["Mount Eden", "Auckland City", "Auckland", "1024", -36.877, 174.764],
  ["Grey Lynn", "Auckland City", "Auckland", "1021", -36.8645, 174.739],
  ["Remuera", "Auckland City", "Auckland", "1050", -36.88, 174.8],
  ["Takapuna", "North Shore City", "Auckland", "0622", -36.787, 174.775],
  ["Devonport", "North Shore City", "Auckland", "0624", -36.833, 174.796],
  ["Howick", "Manukau City", "Auckland", "2014", -36.899, 174.93],
  ["Papakura", "Papakura", "Auckland", "2110", -37.066, 174.944],
  ["Te Aro", "Wellington", "Wellington", "6011", -41.294, 174.777],
  ["Mount Victoria", "Wellington", "Wellington", "6011", -41.296, 174.79],
  ["Kelburn", "Wellington", "Wellington", "6012", -41.287, 174.768],
  ["Karori", "Wellington", "Wellington", "6012", -41.284, 174.733],
  ["Island Bay", "Wellington", "Wellington", "6023", -41.343, 174.77],
  ["Petone", "Lower Hutt", "Wellington", "5012", -41.224, 174.877],
  ["Lower Hutt", "Lower Hutt", "Wellington", "5010", -41.209, 174.907],
  ["Riccarton", "Christchurch City", "Canterbury", "8011", -43.532, 172.587],
  ["Fendalton", "Christchurch City", "Canterbury", "8052", -43.518, 172.601],
  ["Merivale", "Christchurch City", "Canterbury", "8014", -43.515, 172.63],
  ["Sumner", "Christchurch City", "Canterbury", "8081", -43.566, 172.76],
  ["Addington", "Christchurch City", "Canterbury", "8024", -43.543, 172.616],
  ["Rolleston", "Selwyn", "Canterbury", "7614", -43.59, 172.382],
  ["Rangiora", "Waimakariri", "Canterbury", "7400", -43.305, 172.595],
  ["Hamilton East", "Hamilton", "Waikato", "3216", -37.796, 175.296],
  ["Chartwell", "Hamilton", "Waikato", "3210", -37.756, 175.289],
  ["Rototuna", "Hamilton", "Waikato", "3210", -37.733, 175.284],
  ["Hillcrest", "Hamilton", "Waikato", "3216", -37.78, 175.309],
  ["Cambridge", "Waipa", "Waikato", "3434", -37.877, 175.47],
  ["Mount Maunganui", "Tauranga", "Bay of Plenty", "3116", -37.64, 176.185],
  ["Papamoa", "Tauranga", "Bay of Plenty", "3118", -37.703, 176.296],
  ["Bethlehem", "Tauranga", "Bay of Plenty", "3110", -37.702, 176.113],
  ["Tauranga Central", "Tauranga", "Bay of Plenty", "3110", -37.686, 176.166],
  ["North Dunedin", "Dunedin", "Otago", "9016", -45.864, 170.514],
  ["St Clair", "Dunedin", "Otago", "9012", -45.912, 170.488],
  ["Roslyn", "Dunedin", "Otago", "9010", -45.865, 170.49],
  ["Queenstown", "Queenstown-Lakes", "Otago", "9300", -45.0312, 168.6626],
  ["Arrowtown", "Queenstown-Lakes", "Otago", "9302", -44.939, 168.833],
  ["Wanaka", "Wanaka", "Otago", "9305", -44.7, 169.15],
];
const SUBURB_TABLE = new Map(
  SUBURBS.map(([suburb, district, region, postcode, lat, lng]) => [
    suburb, { suburb, district, region, postcode, lat, lng },
  ]),
);
const STREETS = [
  "Kauri Lane", "Rimu Street", "Victoria Road", "Beach Road", "Hill Crescent",
  "Marine Parade", "Tui Place", "Park Avenue", "Sunset Terrace", "Harbour View Road",
  "Totara Drive", "Seaview Road", "Coronation Avenue", "Riverside Drive", "Puriri Street",
];

/* ── image pool: 24 "fresh" (each listing's cover + 2nd shot) + 22 originals ── */
const FRESH = [
  "1507525428034-b723cf961d3e", "1576941089067-2de3c901e126", "1580587771525-78b9dba3b914",
  "1583608205776-bfd35f0d9f83", "1576013551627-0cc20b96c2a7", "1572120360610-d971b9d7767c",
  "1600585152220-90363fe7e115", "1600047509807-ba8f99d2cdde", "1600573472592-401b489a3cdc",
  "1600566753190-17f0baa2a6c3", "1505691938895-1758d7feb511", "1502005097973-6a7082348e28",
  "1556909212-d5b604d0c90d", "1567767292278-a4f21aa2d36e", "1522444195799-478538b28823",
  "1505693416388-ac5ce068fe85", "1556228453-efd6c1ff04f6", "1560185007-c5ca9d2c014d",
  "1616137466211-f939a420be84", "1616486338812-3dadae4b4ace", "1616594039964-ae9021a400a0",
  "1600121848594-d8644e57abab", "1449824913935-59a10b8d2000", "1480714378408-67cf0d13bc1b",
];
const ORIGINAL = [
  "1600596542815-ffad4c1539a9", "1568605114967-8130f3a36994", "1570129477492-45c003edd2be",
  "1605276374104-dee2a0ed3cd6", "1564013799919-ab600027ffc6", "1600585154340-be6161a56a0c",
  "1512917774080-9991f1c4c750", "1600607687939-ce8a6c25118c", "1600566753086-00f18fb6b3ea",
  "1502672260266-1c1ef2d93688", "1522708323590-d24dbb6b0267", "1493809842364-78817add7ffb",
  "1556911220-bff31c812dba", "1484154218962-a197022b5858", "1560448204-603b3fc33ddc",
  "1505873242700-f289a29e1e0f", "1586023492125-27b2c045efd7", "1617806118233-18e1de247200",
  "1583847268964-b28dc8f51f92", "1556909114-f6e7ad7d3136", "1565182999561-18d7dc61c393",
  "1502005229762-cf1b2da7c5d6",
];
const photoUrl = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=70`;

/* ── deterministic helpers ─────────────────────────────────────────────────── */
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const rint = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const clean = (s, max) => (typeof s === "string" ? s.trim().slice(0, max) : undefined);
const posNum = (n) => (typeof n === "number" && n > 0 ? n : undefined);

const NOW = Date.now();
const pad = (n) => String(n).padStart(2, "0");
const isoLocal = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
function openHomeWindow(daysAhead, hour) {
  const start = new Date(NOW + daysAhead * 86400000);
  start.setHours(hour, 0, 0, 0);
  return { start: isoLocal(start), end: isoLocal(new Date(start.getTime() + 30 * 60000)) };
}
function weekendDate(rng, lo, hi, hour) {
  const d = new Date(NOW + rint(rng, lo, hi) * 86400000);
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  d.setHours(hour, 0, 0, 0);
  return d;
}

const SALE_METHODS = new Set(["asking_price", "negotiation", "enquiries_over", "auction", "tender", "deadline_sale", "price_withheld"]);

function buildPrice(rng, rec) {
  const amount = Math.round(posNum(rec.priceAmount) || 0);
  if (rec.listingType === "sale") {
    const method = SALE_METHODS.has(rec.saleMethod) ? rec.saleMethod : "asking_price";
    const price = { amount, type: "total", method, negotiable: method === "negotiation" };
    if (method === "auction") price.auctionDate = isoLocal(weekendDate(rng, 12, 30, 11));
    else if (method === "tender") { const d = new Date(NOW + rint(rng, 14, 28) * 86400000); d.setHours(16, 0, 0, 0); price.tenderClosesAt = isoLocal(d); }
    else if (method === "deadline_sale") { const d = new Date(NOW + rint(rng, 14, 28) * 86400000); d.setHours(16, 0, 0, 0); price.deadlineAt = isoLocal(d); }
    if (rng() < 0.5) price.deposit = Math.round((amount * 0.1) / 1000) * 1000;
    return price;
  }
  return { amount, type: "monthly", negotiable: false };
}

/* ── record -> ListingDoc ──────────────────────────────────────────────────── */
function toDoc(rec, ownerId, idx, images, createdAt) {
  const rng = mulberry32(hashStr(`${rec.account}|${rec.title}|${idx}`));
  const loc = SUBURB_TABLE.get(rec.suburb);
  if (!loc) return null;
  const title = clean(rec.title, 150);
  const description = clean(rec.description, 5000);
  if (!title || title.length < 5 || !description || description.length < 10) return null;
  const price = buildPrice(rng, rec);
  if (!price.amount) return null;

  const config = {};
  for (const k of ["bedrooms", "bathrooms", "carSpaces", "garageSpaces", "yearBuilt"]) {
    if (typeof rec[k] === "number") config[k] = rec[k];
  }
  if (rec.furnishing) config.furnishing = rec.furnishing;

  const doc = {
    listingType: rec.listingType,
    category: rec.category || "residential",
    propertyType: rec.propertyType,
    title,
    description,
    price,
    location: {
      address: `${rint(rng, 1, 250)} ${pick(rng, STREETS)}`,
      locality: loc.suburb,
      city: loc.district,
      state: loc.region,
      pincode: loc.postcode,
      geo: {
        lat: +(loc.lat + (rng() - 0.5) * 0.02).toFixed(5),
        lng: +(loc.lng + (rng() - 0.5) * 0.02).toFixed(5),
      },
    },
    openHomes: rec.hasOpenHome && rec.listingType !== "pg"
      ? [openHomeWindow(rint(rng, 2, 6), 11), openHomeWindow(rint(rng, 8, 13), 13)]
      : [],
    amenities: Array.isArray(rec.amenities) ? rec.amenities.map((a) => clean(a, 60)).filter(Boolean).slice(0, 50) : [],
    media: { images },
    contactPhone: `021 ${rint(rng, 200, 999)} ${rint(rng, 1000, 9999)}`,
  };
  if (posNum(rec.areaSqm) && rec.category !== "land") doc.area = { value: Math.round(rec.areaSqm), unit: "sqm" };
  if (posNum(rec.landAreaSqm)) doc.landArea = { value: Math.round(rec.landAreaSqm), unit: "sqm" };
  if (Object.keys(config).length) doc.config = config;
  if (rec.listingType === "sale") {
    doc.saleType = rec.saleType || "ready";
    doc.titleType = rec.titleType || "freehold";
    doc.rateableValue = posNum(rec.rateableValue) ? Math.round(rec.rateableValue) : Math.round(price.amount * 0.92);
  }
  if (rec.listingType === "pg") {
    doc.pgDetails = { gender: rec.pgGender || "coliving", occupancy: rint(rng, 2, 4), mealsIncluded: Boolean(rec.mealsIncluded), rules: ["No smoking indoors", "Keep shared spaces tidy"] };
  }

  doc.ownerId = ownerId;
  doc.status = "active";
  doc.isVerified = true;
  doc.isFeatured = true; // these are the spotlight listings for the new sellers
  doc.createdAt = createdAt;
  doc.updatedAt = createdAt;
  doc.seedSource = SEED_SOURCE;
  doc.seedSellerEmail = rec.account;
  return doc;
}

/** Interleave records by account so the newest few (the Featured row) show a mix. */
function interleaveByAccount(records) {
  const groups = new Map();
  for (const r of records) {
    if (!groups.has(r.account)) groups.set(r.account, []);
    groups.get(r.account).push(r);
  }
  const lists = [...groups.values()];
  const out = [];
  for (let i = 0; out.length < records.length; i++) {
    for (const l of lists) if (l[i]) out.push(l[i]);
  }
  return out;
}

/** Assign every listing a unique image set: 2 fresh (cover + 2nd) then originals. */
function assignImages(count) {
  const rng = mulberry32(hashStr("seller-images"));
  const fresh = shuffle(FRESH, rng);
  const orig = shuffle(ORIGINAL, rng);
  const out = [];
  for (let i = 0; i < count; i++) {
    const imgs = [photoUrl(fresh.pop()), photoUrl(fresh.pop())];
    const extra = i < ORIGINAL.length - count ? 2 : 1; // spread originals; no repeats
    for (let j = 0; j < extra && orig.length; j++) imgs.push(photoUrl(orig.pop()));
    out.push(imgs);
  }
  return out;
}

async function main() {
  const records = interleaveByAccount(
    JSON.parse(readFileSync(join(__dirname, "seed-data", "seller-listings.json"), "utf8")),
  );
  console.log(`• Loaded ${records.length} seller listings.`);

  const images = assignImages(records.length);
  const allImgs = images.flat();
  console.log(`• Images: ${allImgs.length} total, ${new Set(allImgs).size} unique` +
    (allImgs.length === new Set(allImgs).size ? " (no repeats ✓)" : " (REPEATS!)"));

  if (DRY_RUN) {
    let ok = 0;
    records.forEach((r, i) => { if (toDoc(r, new ObjectId(), i, images[i], new Date(NOW - i * 2400000))) ok++; });
    console.log(`\n✓ Dry run OK — ${ok}/${records.length} valid, nothing written.`);
    return;
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB_NAME);
  const users = db.collection("user");
  const listings = db.collection("listings");
  const host = (MONGODB_URI.match(/@([^/?]+)/) || [])[1] || "?";
  console.log(`• Target: ${MONGODB_DB_NAME} @ ${host}`);

  if (!KEEP) {
    const del = await listings.deleteMany({ seedSource: SEED_SOURCE });
    console.log(`• Cleared previous seller batch: ${del.deletedCount} listings.`);
  }

  // resolve seller accounts by email
  const ownerByEmail = new Map();
  for (const email of new Set(records.map((r) => r.account))) {
    const u = await users.findOne({ email }, { projection: { _id: 1, role: 1, name: 1 } });
    if (u) { ownerByEmail.set(email, u._id); console.log(`• Seller ${email} → ${u._id} (role: ${u.role}, ${u.name ?? ""})`); }
    else console.warn(`  ! seller ${email} not found — its listings will be skipped.`);
  }

  // Newest first (idx 0 = most recent) so they head the Featured/newest row.
  const docs = [];
  records.forEach((rec, i) => {
    const ownerId = ownerByEmail.get(rec.account);
    if (!ownerId) return;
    const createdAt = new Date(NOW - (i * 40 + 5) * 60000); // staggered, all < 1 day old
    const doc = toDoc(rec, ownerId, i, images[i], createdAt);
    if (doc) docs.push(doc);
  });

  if (docs.length) await listings.insertMany(docs);
  const byAcct = docs.reduce((m, d) => ((m[d.seedSellerEmail] = (m[d.seedSellerEmail] || 0) + 1), m), {});
  console.log(`\n✓ Added ${docs.length} active, featured listings:`, byAcct);
  console.log("  They are the newest active listings → they appear in the home Featured row.");
  await client.close();
}

main().catch((err) => {
  console.error("\n✖ Failed:", err?.message || err);
  process.exit(1);
});

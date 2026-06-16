/**
 * Tread House — demo listings seeder.
 *
 * Loads the generated, fully-fictional NZ dataset (scripts/seed-data/nz-listings.json),
 * creates demo owner/agent accounts in the `user` collection, maps each record into
 * the exact `ListingDoc` shape the app reads, and inserts them into `listings`.
 *
 * Everything it writes is tagged `seedSource: "nz-seed"`, so re-running it only ever
 * replaces its own seed data — it never touches real users or listings.
 *
 * Usage (from the project root):
 *   node scripts/seed-listings.mjs            # replace existing seed data, then insert
 *   node scripts/seed-listings.mjs --keep     # append without clearing previous seed data
 *   node scripts/seed-listings.mjs --dry-run  # build + validate everything, write nothing
 *
 * Dependency-free: uses only the installed `mongodb` driver + Node built-ins, and
 * reads MONGODB_URI / MONGODB_DB_NAME from .env.local (or the real environment).
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { MongoClient, ObjectId } from "mongodb";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SEED_SOURCE = "nz-seed";

const argv = new Set(process.argv.slice(2));
const KEEP = argv.has("--keep");
const DRY_RUN = argv.has("--dry-run");

/* ── env ────────────────────────────────────────────────────────────────── */

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
  console.error(
    "✖ MONGODB_URI and MONGODB_DB_NAME must be set (in .env.local or the environment).",
  );
  process.exit(1);
}

/* ── canonical NZ reference data ───────────────────────────────────────────
 * suburb -> district (location.city) / region (location.state) / 4-digit
 * postcode / approx centroid. The generator only ever emits a `suburb`; we
 * resolve everything else here so postcodes + geo are always consistent.       */

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
    suburb,
    { suburb, district, region, postcode, lat, lng },
  ]),
);
const FALLBACK_SUBURB = SUBURB_TABLE.get("Ponsonby");

const STREETS = [
  "Kauri Lane", "Rimu Street", "Victoria Road", "Beach Road", "Hill Crescent",
  "Marine Parade", "Queen Street", "Tui Place", "Park Avenue", "Sunset Terrace",
  "Harbour View Road", "Totara Drive", "Manuka Way", "Seaview Road", "Church Street",
  "Coronation Avenue", "Domain Road", "Riverside Drive", "Puriri Street", "Anzac Avenue",
  "Grafton Road", "Garden Place", "Highbury Crescent", "Lakeside Drive",
];

// Confirmed-loading Unsplash photos (images.unsplash.com is whitelisted in next.config.ts).
const EXTERIOR = [
  "1600596542815-ffad4c1539a9", "1568605114967-8130f3a36994", "1570129477492-45c003edd2be",
  "1605276374104-dee2a0ed3cd6", "1564013799919-ab600027ffc6", "1600585154340-be6161a56a0c",
  "1512917774080-9991f1c4c750", "1600607687939-ce8a6c25118c", "1600566753086-00f18fb6b3ea",
];
const INTERIOR = [
  "1502672260266-1c1ef2d93688", "1522708323590-d24dbb6b0267", "1493809842364-78817add7ffb",
  "1556911220-bff31c812dba", "1484154218962-a197022b5858", "1560448204-603b3fc33ddc",
  "1505873242700-f289a29e1e0f", "1586023492125-27b2c045efd7", "1617806118233-18e1de247200",
  "1583847268964-b28dc8f51f92", "1556909114-f6e7ad7d3136", "1565182999561-18d7dc61c393",
  "1502005229762-cf1b2da7c5d6",
];
const photoUrl = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=70`;

const PG_RULES = [
  "No smoking indoors", "Keep shared spaces tidy", "Quiet hours after 10pm",
  "No parties", "References required", "Bond: two weeks' rent",
];

const FALLBACK_AMENITIES = [
  "Heat pump", "Off-street parking", "Modern kitchen", "Insulated", "Sunny aspect",
];

/* ── deterministic RNG (stable, varied output without Math.random) ─────────── */

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rint = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const chance = (rng, p) => rng() < p;

/* ── date helpers (NZ datetime-local string format) ────────────────────────── */

const NOW = Date.now();
const DAY = 86400000;
const pad = (n) => String(n).padStart(2, "0");
/** -> "2026-06-20T11:00" (matches the app's isoDateTime fields). */
function isoLocal(date) {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
/** A future weekend open-home window `daysAhead` from now at `hour`. */
function openHomeWindow(daysAhead, hour) {
  const start = new Date(NOW + daysAhead * DAY);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start.getTime() + 30 * 60000);
  return { start: isoLocal(start), end: isoLocal(end) };
}

/* ── enum value sets (mirror lib/enums.ts) ─────────────────────────────────── */

const PROPERTY_TYPES = new Set([
  "house", "apartment", "townhouse", "unit", "villa", "studio",
  "section", "lifestyle", "plot", "office", "shop", "pg_bed",
]);
const CATEGORIES = new Set(["residential", "commercial", "land"]);
const SALE_TYPES = new Set(["ready", "under_construction", "resale"]);
const SALE_METHODS = new Set([
  "asking_price", "negotiation", "enquiries_over", "auction",
  "tender", "deadline_sale", "price_withheld",
]);
const TITLE_TYPES = new Set(["freehold", "leasehold", "cross_lease", "unit_title"]);
const FURNISHINGS = new Set(["unfurnished", "semi_furnished", "furnished"]);
const PG_GENDERS = new Set(["boys", "girls", "coliving"]);

const clean = (s, max) =>
  typeof s === "string" ? s.trim().slice(0, max) : undefined;
const posNum = (n) => (typeof n === "number" && n > 0 ? n : undefined);
const intIn = (n, lo, hi) =>
  typeof n === "number" && Number.isFinite(n)
    ? Math.min(hi, Math.max(lo, Math.round(n)))
    : undefined;

/* ── record -> ListingDoc ──────────────────────────────────────────────────── */

function buildImages(rng, propertyType) {
  const interiorLed = ["apartment", "unit", "studio", "pg_bed"].includes(propertyType);
  const lead = interiorLed ? INTERIOR : EXTERIOR;
  const count = rint(rng, 4, 6);
  const out = [photoUrl(pick(rng, lead))];
  for (let i = 1; i < count; i++) {
    // alternate the gallery so it always mixes interior + exterior shots
    out.push(photoUrl(pick(rng, i % 2 === 1 ? INTERIOR : EXTERIOR)));
  }
  return [...new Set(out)];
}

function buildPrice(rng, rec) {
  const amount = posNum(rec.priceAmount);
  if (!amount) return null;

  if (rec.listingType === "sale") {
    const method = SALE_METHODS.has(rec.saleMethod) ? rec.saleMethod : "asking_price";
    const price = {
      amount: Math.round(amount),
      type: "total",
      method,
      negotiable: method === "negotiation" || chance(rng, 0.25),
    };
    if (method === "auction") price.auctionDate = isoLocal(weekendDate(rng, 14, 35, 11));
    else if (method === "tender") price.tenderClosesAt = isoLocal(weekday4pm(rng, 14, 30));
    else if (method === "deadline_sale") price.deadlineAt = isoLocal(weekday4pm(rng, 14, 30));
    if (chance(rng, 0.5)) price.deposit = Math.round((amount * 0.1) / 1000) * 1000;
    return price;
  }
  // rent + pg: weekly figure, rendered as "$x/wk" by the app (PriceType.Monthly).
  return { amount: Math.round(amount), type: "monthly", negotiable: false };
}

function weekendDate(rng, lo, hi, hour) {
  const d = new Date(NOW + rint(rng, lo, hi) * DAY);
  // nudge to the nearest Saturday
  const add = (6 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + add);
  d.setHours(hour, 0, 0, 0);
  return d;
}
function weekday4pm(rng, lo, hi) {
  const d = new Date(NOW + rint(rng, lo, hi) * DAY);
  d.setHours(16, 0, 0, 0);
  return d;
}

function toDoc(rec, assign, idx) {
  const rng = mulberry32(hashStr(`${rec.suburb}|${rec.title}|${idx}`));

  const listingType = ["sale", "rent", "pg"].includes(rec.listingType)
    ? rec.listingType
    : "sale";
  const loc = SUBURB_TABLE.get(rec.suburb) ?? FALLBACK_SUBURB;

  let propertyType = PROPERTY_TYPES.has(rec.propertyType) ? rec.propertyType : null;
  if (!propertyType) propertyType = listingType === "pg" ? "pg_bed" : "house";

  let category = CATEGORIES.has(rec.category) ? rec.category : "residential";
  if (["section", "plot"].includes(propertyType)) category = "land";
  if (["office", "shop"].includes(propertyType)) category = "commercial";

  const title = clean(rec.title, 150);
  const description = clean(rec.description, 5000);
  if (!title || title.length < 5 || !description || description.length < 10) return null;

  const price = buildPrice(rng, rec);
  if (!price) return null;

  // config
  const config = {};
  const beds = intIn(rec.bedrooms, 0, 10);
  const baths = intIn(rec.bathrooms, 0, 10);
  const cars = intIn(rec.carSpaces, 0, 10);
  const garages = intIn(rec.garageSpaces, 0, 10);
  const year = intIn(rec.yearBuilt, 1800, 2026);
  if (beds != null) config.bedrooms = beds;
  if (baths != null) config.bathrooms = baths;
  if (cars != null) config.carSpaces = cars;
  if (garages != null) config.garageSpaces = garages;
  if (year != null) config.yearBuilt = year;
  if (FURNISHINGS.has(rec.furnishing)) config.furnishing = rec.furnishing;

  // areas (sqm)
  const area = category !== "land" && posNum(rec.areaSqm)
    ? { value: Math.round(rec.areaSqm), unit: "sqm" }
    : undefined;
  const landArea = posNum(rec.landAreaSqm)
    ? { value: Math.round(rec.landAreaSqm), unit: "sqm" }
    : undefined;

  // amenities
  let amenities = Array.isArray(rec.amenities)
    ? rec.amenities.map((a) => clean(a, 60)).filter(Boolean).slice(0, 50)
    : [];
  if (amenities.length === 0) amenities = [...FALLBACK_AMENITIES];

  // open homes
  const openHomes = [];
  if (rec.hasOpenHome && listingType !== "pg") {
    openHomes.push(openHomeWindow(rint(rng, 2, 6), 11));
    if (chance(rng, 0.5)) openHomes.push(openHomeWindow(rint(rng, 8, 13), 13));
  }

  const doc = {
    listingType,
    category,
    propertyType,
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
    openHomes,
    amenities,
    media: { images: buildImages(rng, propertyType) },
    contactPhone: `021 ${rint(rng, 200, 999)} ${rint(rng, 1000, 9999)}`,
  };
  if (area) doc.area = area;
  if (landArea) doc.landArea = landArea;
  if (Object.keys(config).length) doc.config = config;

  if (listingType === "sale") {
    doc.saleType = SALE_TYPES.has(rec.saleType) ? rec.saleType : "ready";
    if (TITLE_TYPES.has(rec.titleType)) doc.titleType = rec.titleType;
    else doc.titleType = "freehold";
    const rv = posNum(rec.rateableValue);
    doc.rateableValue = rv ? Math.round(rv) : Math.round(price.amount * 0.92);
  }
  if (listingType === "pg") {
    doc.pgDetails = {
      gender: PG_GENDERS.has(rec.pgGender) ? rec.pgGender : "coliving",
      occupancy: rint(rng, 2, 5),
      mealsIncluded: Boolean(rec.mealsIncluded),
      rules: [pick(rng, PG_RULES), pick(rng, PG_RULES)].filter(
        (v, i, a) => a.indexOf(v) === i,
      ),
    };
  }

  // server-owned fields
  doc.ownerId = assign.ownerId;
  doc.status = assign.status || "active";
  doc.isVerified = chance(rng, 0.85);
  // featured only makes sense on a live listing
  doc.isFeatured = doc.status === "active" ? Boolean(rec.featured) : false;
  // sold/expired listings are dated further in the past
  const past = doc.status === "rented_sold" || doc.status === "expired";
  const ageDays = past ? rint(rng, 45, 300) : rint(rng, 1, 120);
  doc.createdAt = new Date(NOW - ageDays * DAY);
  doc.updatedAt = new Date(NOW - rint(rng, 0, Math.min(ageDays, 30)) * DAY);
  if (assign.portfolioEmail) doc.seedPortfolio = assign.portfolioEmail;
  doc.seedSource = SEED_SOURCE;
  return doc;
}

/* ── owners ────────────────────────────────────────────────────────────────── */

const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

function listerKey(rec) {
  const name = clean(rec.listerName, 80) || "Tread House Owner";
  const agency = clean(rec.agency, 60) || "";
  const kind = rec.listerKind === "agent" ? "agent" : "owner";
  return { key: `${name}|${agency}`, name, agency, kind };
}

/* ── owner portfolios (mixed-status listings on real accounts) ────────────────
 * A slice of the dataset is attached to real, logged-in owner accounts with a
 * realistic spread of lifecycle states, so the "Your properties" manager and its
 * status filters have draft / pending / sold / expired listings to show — not
 * just active ones. Edit PORTFOLIO_OWNERS to target different accounts.          */
// Resolved BY EMAIL at runtime against whatever DB is connected, so the same
// script works across environments: only the emails that exist in the connected
// DB get a portfolio (the rest are ignored). We never create real login accounts.
const PORTFOLIO_OWNERS = [
  { email: "mahimalik7043@gmail.com" }, // local owner
  { email: "mahin.malek@decoded.digital" }, // local owner
  { email: "dipenacharya07@gmail.com" }, // live owner (decoded-tradehouse.vercel.app)
  { email: "shahnawaz.tariq@decoded.digital" }, // live owner
];
const PORTFOLIO_SIZE = 16;
// One status per portfolio listing (cycled). Active + pending count toward the
// owner active-slot cap, so we keep those low; the rest show listing history.
const PORTFOLIO_STATUSES = [
  "active", "active", "pending_review",
  "draft", "draft", "draft", "draft", "draft",
  "rented_sold", "rented_sold", "rented_sold", "rented_sold", "rented_sold", "rented_sold",
  "expired", "expired",
];

/** record-index -> { ownerId, status, portfolioEmail }. `resolved` is the list of
 *  portfolio owners that actually exist in the DB: [{ email, ownerId }]. */
function buildPortfolioMap(count, resolved) {
  const map = new Map();
  if (!resolved.length || count < resolved.length * PORTFOLIO_SIZE) return map;
  const order = Array.from({ length: count }, (_, i) => i);
  const rng = mulberry32(hashStr("portfolio-order")); // deterministic shuffle
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  resolved.forEach((owner, oi) => {
    const slice = order.slice(oi * PORTFOLIO_SIZE, (oi + 1) * PORTFOLIO_SIZE);
    slice.forEach((recIdx, k) => {
      map.set(recIdx, {
        ownerId: owner.ownerId,
        status: PORTFOLIO_STATUSES[k % PORTFOLIO_STATUSES.length],
        portfolioEmail: owner.email,
      });
    });
  });
  return map;
}

/* ── main ──────────────────────────────────────────────────────────────────── */

function loadRecords() {
  const path = join(__dirname, "seed-data", "nz-listings.json");
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  const records = Array.isArray(parsed) ? parsed : parsed.records;
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error(`No records found in ${path}`);
  }
  return records;
}

function buildDocs(records, ownerIdByKey, portfolioMap) {
  const docs = [];
  let skipped = 0;
  records.forEach((rec, i) => {
    const assign =
      portfolioMap.get(i) ?? {
        ownerId: ownerIdByKey.get(listerKey(rec).key),
        status: "active",
      };
    const doc = toDoc(rec, assign, i);
    if (doc) docs.push(doc);
    else skipped++;
  });
  return { docs, skipped };
}

function printSummary(docs, skipped) {
  if (skipped) console.log(`• Skipped ${skipped} records that failed validation.`);
  const by = (fn) =>
    docs.reduce((m, d) => ((m[fn(d)] = (m[fn(d)] || 0) + 1), m), {});
  console.log("• By type:", by((d) => d.listingType));
  console.log("• By status:", by((d) => d.status));
  console.log("• By region:", by((d) => d.location.state));
  console.log(
    `• Featured: ${docs.filter((d) => d.isFeatured).length}, with open homes: ${docs.filter((d) => d.openHomes.length).length}`,
  );
}

async function main() {
  const records = loadRecords();
  console.log(`• Loaded ${records.length} generated records.`);

  // resolve distinct listers -> owner identities
  const listers = new Map();
  for (const rec of records) {
    const l = listerKey(rec);
    if (!listers.has(l.key)) listers.set(l.key, l);
  }

  // Dry run: build + validate everything offline, no DB connection required.
  if (DRY_RUN) {
    const ownerIdByKey = new Map(
      [...listers.values()].map((l) => [l.key, new ObjectId()]),
    );
    const resolved = PORTFOLIO_OWNERS.map((o) => ({ email: o.email, ownerId: new ObjectId() }));
    const portfolioMap = buildPortfolioMap(records.length, resolved);
    const { docs, skipped } = buildDocs(records, ownerIdByKey, portfolioMap);
    console.log(
      `• Prepared ${ownerIdByKey.size} demo owner accounts; ${portfolioMap.size} listings carved into portfolios for ${resolved.length} owners.`,
    );
    printSummary(docs, skipped);
    console.log(`\n✓ Dry run OK — ${docs.length} valid listings, nothing written.`);
    return;
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB_NAME);
  const users = db.collection("user");
  const listings = db.collection("listings");

  if (!KEEP) {
    const dl = await listings.deleteMany({ seedSource: SEED_SOURCE });
    const du = await users.deleteMany({ seedSource: SEED_SOURCE });
    console.log(`• Cleared previous seed data: ${dl.deletedCount} listings, ${du.deletedCount} owners.`);
  }

  // upsert owners -> map lister key to its user _id
  const ownerIdByKey = new Map();
  for (const l of listers.values()) {
    const email = `${slug(l.name)}.${hashStr(l.key) % 100000}@seed.treadhouse.test`;
    const now = new Date();
    const res = await users.findOneAndUpdate(
      { email },
      {
        $setOnInsert: {
          _id: new ObjectId(),
          email,
          name: l.name,
          emailVerified: true,
          role: l.kind === "agent" ? "agent" : "owner",
          status: "active",
          ...(l.agency ? { agency: l.agency } : {}),
          createdAt: now,
          updatedAt: now,
          seedSource: SEED_SOURCE,
        },
      },
      { upsert: true, returnDocument: "after" },
    );
    ownerIdByKey.set(l.key, res._id);
  }
  console.log(`• Prepared ${ownerIdByKey.size} demo owner/agent accounts.`);

  // Portfolio: resolve owners BY EMAIL against the connected DB (works on any
  // environment). Missing emails simply get no portfolio.
  const resolved = [];
  for (const o of PORTFOLIO_OWNERS) {
    const u = await users.findOne(
      { email: o.email },
      { projection: { _id: 1, role: 1 } },
    );
    if (u) {
      resolved.push({ email: o.email, ownerId: u._id });
      console.log(`• Portfolio owner ${o.email} → ${u._id} (role: ${u.role ?? "?"})`);
    } else {
      console.warn(`  ! portfolio owner ${o.email} not found in this DB — skipping its portfolio.`);
    }
  }
  const portfolioMap = buildPortfolioMap(records.length, resolved);

  const { docs, skipped } = buildDocs(records, ownerIdByKey, portfolioMap);
  printSummary(docs, skipped);

  if (docs.length) await listings.insertMany(docs);
  const activeCount = docs.filter((d) => d.status === "active").length;
  console.log(`\n✓ Seeded ${docs.length} listings (${activeCount} active) into "${MONGODB_DB_NAME}".`);
  console.log("  Public: browse /buy, /rent, /flatmates and the home page.");
  console.log(
    resolved.length
      ? `  Owner dashboard: log in as ${resolved.map((o) => o.email).join(" or ")} → "Your properties".`
      : "  Owner dashboard: no portfolio owners resolved in this DB.",
  );
  await client.close();
}

main().catch((err) => {
  console.error("\n✖ Seed failed:", err?.message || err);
  if (String(err?.message || err).match(/ECONNREFUSED|ETIMEDOUT|getaddrinfo/)) {
    console.error("  Is MongoDB running and MONGODB_URI correct? (default mongodb://localhost:27017)");
  }
  process.exit(1);
});

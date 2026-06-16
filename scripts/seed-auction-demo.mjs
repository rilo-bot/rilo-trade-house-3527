/**
 * Tread House — live-auction DEMO seeder.
 *
 * Inserts ONE clearly-labelled auction listing whose `auctionDate` is set to a
 * couple of minutes ago, so it is immediately "live" (an auction is live from its
 * start time until +1h — see features/auctions/auction-window.ts). Use it to test
 * the Live auctions page (/auctions → "Live now"), the auction detail block
 * (countdown, vendor fields, livestream button) and "Register to bid".
 *
 * It's owned by a dedicated demo AGENT account (auction-demo@seed.treadhouse.test)
 * so you can register to bid on it from your own signed-in account.
 *
 * Everything it writes is tagged `seedSource: "auction-demo"`, so re-running only
 * ever replaces its own demo row — it never touches real or other seed data.
 *
 * "Always live" caveat: an auction is live for ~1 hour after its start. Re-run
 * this one-liner whenever you want it back in the live window:
 *
 *   npm run seed:auction          # refresh the live demo auction once
 *
 * To keep ONE dummy auction live CONTINUOUSLY (e.g. while testing), use watch
 * mode — it seeds once, then nudges the SAME listing's start time back into the
 * live window on an interval (default every 50 min, below the 1h window) so it
 * never goes "ended". Leave it running in a terminal; Ctrl-C to stop:
 *
 *   npm run seed:auction:watch                 # refresh every 50 min
 *   node scripts/seed-auction-demo.mjs --watch --interval=30
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
const SEED_SOURCE = "auction-demo";
const DEMO_OWNER_EMAIL = "auction-demo@seed.treadhouse.test";

/* ── env (minimal .env.local loader; real env vars win) ─────────────────────── */

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

/* ── helpers ───────────────────────────────────────────────────────────────── */

/** Format an absolute instant as Pacific/Auckland wall-clock "YYYY-MM-DDTHH:mm"
 *  — the app interprets auctionDate as NZ time, so the demo stays "live" on any
 *  host timezone (e.g. a UTC CI/prod box). */
function nzWallClock(date) {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const p = Object.fromEntries(dtf.formatToParts(date).map((x) => [x.type, x.value]));
  const hour = p.hour === "24" ? "00" : p.hour;
  return `${p.year}-${p.month}-${p.day}T${hour}:${p.minute}`;
}
const photoUrl = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=70`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Start the auction a couple of minutes ago so it is unambiguously live now. */
const liveAuctionDate = (now) =>
  nzWallClock(new Date(now.getTime() - 2 * 60 * 1000));

/* ── CLI args ──────────────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
const WATCH = argv.includes("--watch");
const intervalArg = argv.find((a) => a.startsWith("--interval="));
// Refresh cadence for watch mode. Must stay below the 1h live window (default 50
// min) so there is no gap where the auction reads "ended".
const INTERVAL_MIN = Math.max(1, Number(intervalArg?.split("=")[1]) || 50);

/* ── refresh (watch mode) ────────────────────────────────────────────────────
 * Nudge the EXISTING demo listing's start time back into the live window, in
 * place — same listingId, so an open detail page just keeps working. Returns the
 * listing id, or null if there's no demo auction yet (caller seeds first).      */

async function refreshLive(db, now) {
  const listings = db.collection("listings");
  const res = await listings.findOneAndUpdate(
    { seedSource: SEED_SOURCE },
    {
      $set: {
        "price.auctionDate": liveAuctionDate(now),
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );
  if (!res) return null;
  // Clear any anti-snipe close extension so close resets to newStart + 1h.
  await db.collection("auction_state").deleteOne({ _id: res._id });
  return res._id;
}

/* ── seed (full) ─────────────────────────────────────────────────────────────
 * Idempotently replaces the single demo auction + its child docs and returns the
 * new listing id.                                                                */

async function seedFull(db, now) {
  const users = db.collection("user");
  const listings = db.collection("listings");

  // Dedicated demo owner (agent) so you can register to bid from your own account.
  const ownerRes = await users.findOneAndUpdate(
    { email: DEMO_OWNER_EMAIL },
    {
      $setOnInsert: {
        _id: new ObjectId(),
        email: DEMO_OWNER_EMAIL,
        name: "Auction Demo Agency",
        emailVerified: true,
        role: "agent",
        status: "active",
        agency: "Trade House Demo Auctions",
        createdAt: now,
        updatedAt: now,
        seedSource: SEED_SOURCE,
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  const ownerId = ownerRes._id;

  const doc = {
    listingType: "sale",
    saleType: "ready",
    category: "residential",
    propertyType: "house",
    title: "DEMO — Live Auction: Harbourview Villa, Ponsonby",
    description:
      "Demo listing for testing the live auction experience. This auction is happening right now — open the page to see the live countdown, register to bid, and the auction details block. Sells unconditionally on the fall of the hammer.",
    price: {
      amount: 1450000,
      type: "total",
      method: "auction",
      negotiable: false,
      // Start a couple of minutes ago so it is unambiguously "live" right now and
      // the countdown reads "Auction is on now". Live for ~58 more minutes.
      auctionDate: liveAuctionDate(now),
      // Vendor auction fields (Phase A) — exercise the detail block.
      priceGuide: 1400000,
      auctionVenue: "On-site, 23 Harbourview Road · also online",
      livestreamUrl: "https://www.youtube.com/live/jfKfPfyJRdk",
      // SECRET reserve — never sent to the public; the top demo bid clears it so
      // the panel shows "RESERVE MET".
      reserve: 1650000,
    },
    area: { value: 180, unit: "sqm" },
    landArea: { value: 405, unit: "sqm" },
    config: {
      bedrooms: 4,
      bathrooms: 2,
      carSpaces: 1,
      garageSpaces: 1,
      yearBuilt: 1925,
      furnishing: "unfurnished",
    },
    location: {
      address: "23 Harbourview Road",
      locality: "Ponsonby",
      city: "Auckland City",
      state: "Auckland",
      pincode: "1011",
      geo: { lat: -36.8575, lng: 174.7456 },
    },
    rateableValue: 1380000,
    titleType: "freehold",
    openHomes: [],
    amenities: [
      "Heat pump",
      "Off-street parking",
      "Renovated kitchen",
      "Sea view",
      "Deck",
    ],
    media: {
      images: [
        photoUrl("1600596542815-ffad4c1539a9"),
        photoUrl("1600585154340-be6161a56a0c"),
        photoUrl("1522708323590-d24dbb6b0267"),
        photoUrl("1493809842364-78817add7ffb"),
      ],
    },
    contactPhone: "021 555 0123",
    // server-owned fields
    ownerId,
    status: "active",
    isVerified: true,
    isFeatured: false,
    createdAt: now,
    updatedAt: now,
    seedSource: SEED_SOURCE,
  };

  // Idempotent: clear any previous demo auction + its child docs, then insert.
  const bids = db.collection("bids");
  const registrations = db.collection("auction_registrations");
  const autoBids = db.collection("auto_bids");
  const auctionState = db.collection("auction_state");
  const favorites = db.collection("favorites");

  const cleared = await listings.deleteMany({ seedSource: SEED_SOURCE });
  await Promise.all([
    bids.deleteMany({ seedSource: SEED_SOURCE }),
    registrations.deleteMany({ seedSource: SEED_SOURCE }),
    autoBids.deleteMany({ seedSource: SEED_SOURCE }),
    favorites.deleteMany({ seedSource: SEED_SOURCE }),
  ]);

  const res = await listings.insertOne(doc);
  const listingId = res.insertedId;
  // The default close is start + 1h; remove any stale extension for this listing.
  await auctionState.deleteOne({ _id: listingId });

  // A stable bidder identity per name (so the leader is consistent across bids).
  const bidderIds = new Map();
  const bidderId = (name) => {
    if (!bidderIds.has(name)) bidderIds.set(name, new ObjectId());
    return bidderIds.get(name);
  };
  const minsAgo = (m) => new Date(now.getTime() - m * 60 * 1000);

  // Demo bid history (oldest → newest); the top bid clears the reserve.
  const DEMO_BIDS = [
    { name: "Aroha Ngata", amount: 1_660_000, min: 12 },
    { name: "Tina Reweti", amount: 1_680_000, min: 9 },
    { name: "Mike & Jess", amount: 1_700_000, min: 6 },
    { name: "Sam Patel", amount: 1_720_000, min: 3 },
    { name: "Tina Reweti", amount: 1_740_000, min: 1 },
  ];
  await bids.insertMany(
    DEMO_BIDS.map((b) => ({
      _id: new ObjectId(),
      listingId,
      bidderId: bidderId(b.name),
      bidderName: b.name,
      amount: b.amount,
      auto: false,
      createdAt: minsAgo(b.min),
      seedSource: SEED_SOURCE,
    })),
  );

  // Registered bidders (distinct names from the bid history) — all approved.
  const regNames = [...new Set(DEMO_BIDS.map((b) => b.name))];
  await registrations.insertMany(
    regNames.map((name) => ({
      _id: new ObjectId(),
      listingId,
      ownerId,
      bidderId: bidderId(name),
      name,
      phone: "021 555 0000",
      bidMethod: "online",
      status: "approved",
      listingTitle: doc.title,
      listingLocality: doc.location.locality,
      listingCity: doc.location.city,
      createdAt: minsAgo(30),
      updatedAt: minsAgo(30),
      seedSource: SEED_SOURCE,
    })),
  );

  // A few watchers so the "N watching" stat isn't zero.
  await favorites.insertMany(
    Array.from({ length: 12 }, () => ({
      _id: new ObjectId(),
      userId: new ObjectId(),
      listingId,
      createdAt: minsAgo(20),
      seedSource: SEED_SOURCE,
    })),
  );

  console.log(
    `✓ Live auction demo ready (cleared ${cleared.deletedCount}, inserted 1).`,
  );
  console.log(`  Listing id: ${listingId}`);
  console.log(`  Auction start: ${doc.price.auctionDate} (live until ~+1h)`);
  console.log(
    `  Seeded ${DEMO_BIDS.length} bids (top $1,740,000 · reserve met), ${regNames.length} registered bidders, 12 watching.`,
  );
  console.log("  See it: /auctions → 'Live now', or open the listing directly.");
  console.log(`  Owner: ${DEMO_OWNER_EMAIL} (register + bid from any OTHER account).`);
  console.log("  Re-run anytime to refresh the live window: npm run seed:auction");

  return listingId;
}

/* ── main ──────────────────────────────────────────────────────────────────── */

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB_NAME);

  // Seed (or replace) the single demo auction up front, in both modes.
  const listingId = await seedFull(db, new Date());

  if (!WATCH) {
    await client.close();
    return;
  }

  // Watch mode: keep ONE auction live forever by re-entering the live window
  // before the 1h expires. Same listingId every cycle (refresh in place).
  console.log(
    `\n↻ Watch mode: keeping this auction live — refresh every ${INTERVAL_MIN} min. Ctrl-C to stop.`,
  );
  let stopping = false;
  process.on("SIGINT", () => {
    stopping = true;
    console.log("\n…stopping watch; the auction stays live until its window ends.");
    client.close().finally(() => process.exit(0));
  });

  while (!stopping) {
    await sleep(INTERVAL_MIN * 60 * 1000);
    if (stopping) break;
    const id = (await refreshLive(db, new Date())) ?? listingId;
    console.log(
      `  ↻ refreshed live window @ ${new Date().toISOString()} (listing ${id})`,
    );
  }
}

main().catch((err) => {
  console.error("\n✖ Demo seed failed:", err?.message || err);
  if (String(err?.message || err).match(/ECONNREFUSED|ETIMEDOUT|getaddrinfo/)) {
    console.error(
      "  Is MongoDB running and MONGODB_URI correct? (default mongodb://localhost:27017)",
    );
  }
  process.exit(1);
});

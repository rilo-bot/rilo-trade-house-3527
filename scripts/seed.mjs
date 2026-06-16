/**
 * Local development seed — populates MongoDB with realistic sample data so every
 * data-driven screen (dashboard, my-listings, leads inbox, search, wishlist,
 * home tiles, suburb insights) has something to show.
 *
 * This is a personal dev utility and is gitignored. It talks to MongoDB directly
 * via the `mongodb` driver (no `@/` app imports, no build step) and hardcodes the
 * enum string literals that live in `lib/enums.ts` — keep them in sync if those
 * values ever change (they are the exact strings persisted in the DB).
 *
 *   Run:  node --env-file=.env.local scripts/seed.mjs
 *
 * Re-runnable: each run deletes ONLY what the previous run inserted (tracked in a
 * `_seed_meta` manifest) plus the demo seeker users, then re-inserts. It upserts
 * the owner account but never deletes it, so your real data is never touched.
 */
import { MongoClient, ObjectId } from "mongodb";

// ── Config ──────────────────────────────────────────────────────────────────
const OWNER_EMAIL = "mahin.malek@decoded.digital"; // the account you log in as
const OWNER_NAME = "Mahin Malek";
const SEEKER_DOMAIN = "@seed.tradehouse.test"; // demo seekers (deletable marker)

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;
if (!MONGODB_URI || !MONGODB_DB_NAME) {
  console.error(
    "❌ MONGODB_URI / MONGODB_DB_NAME missing. Run with: node --env-file=.env.local scripts/seed.mjs",
  );
  process.exit(1);
}

// ── Enum literals (mirror lib/enums.ts) ───────────────────────────────────────
const ListingType = { Sale: "sale", Rent: "rent", Pg: "pg" };
const ListingStatus = {
  Draft: "draft",
  PendingReview: "pending_review",
  Active: "active",
};
const PriceType = { Total: "total", Monthly: "monthly" };
const SaleMethod = {
  AskingPrice: "asking_price",
  Negotiation: "negotiation",
  Auction: "auction",
};
const SaleType = { Ready: "ready", Resale: "resale" };
const PropertyCategory = { Residential: "residential" };
const PropertyType = {
  House: "house",
  Apartment: "apartment",
  Townhouse: "townhouse",
  Unit: "unit",
  Villa: "villa",
  PgBed: "pg_bed",
};
const Furnishing = {
  Unfurnished: "unfurnished",
  SemiFurnished: "semi_furnished",
  Furnished: "furnished",
};
const PgGender = { Boys: "boys", Girls: "girls", CoLiving: "coliving" };
const AreaUnit = { Sqm: "sqm" };
const LeadKind = { Enquiry: "enquiry", Viewing: "viewing" };
const LeadStatus = {
  New: "new",
  Contacted: "contacted",
  ClosedWon: "closed_won",
  ClosedLost: "closed_lost",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const NOW = new Date();
const daysAgo = (n) => new Date(NOW.getTime() - n * 86_400_000);
const daysAhead = (n) => new Date(NOW.getTime() + n * 86_400_000);

// Whitelisted host (next.config.ts → images.unsplash.com). Stable photo ids.
const PHOTO_IDS = [
  "1568605114967-8130f3a36994",
  "1570129477492-45c003edd2be",
  "1512917774080-9991f1c4c750",
  "1600596542815-ffad4c1539a9",
  "1600585154340-be6161a56a0c",
  "1605276374104-dee2a0ed3cd6",
  "1600607687939-ce8a6c25118c",
  "1493809842364-78817add7ffb",
  "1522708323590-d24dbb6b0267",
  "1502672260266-1c1ef2d93688",
];
let photoCursor = 0;
function pickImages(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const id = PHOTO_IDS[photoCursor++ % PHOTO_IDS.length];
    out.push(`https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=70`);
  }
  return out;
}

const AMENITY_POOL = [
  "Heat pump", "Internal garage", "Dishwasher", "Deck", "Off-street parking",
  "Established garden", "Solar panels", "Fibre broadband", "Walk-in wardrobe",
  "Double glazing", "Open-plan living", "HRV system",
];
function pickAmenities(seed, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(AMENITY_POOL[(seed + i * 3) % AMENITY_POOL.length]);
  return [...new Set(out)];
}

// Next open Saturday 11:00–11:30, as the form-style ISO (local, no Z).
function nextOpenHome() {
  const d = daysAhead(((6 - NOW.getDay() + 7) % 7) || 7);
  const pad = (x) => String(x).padStart(2, "0");
  const base = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { start: `${base}T11:00`, end: `${base}T11:30` };
}

/** Build a full ListingDoc body (without _id/ownerId — added at insert time). */
function L(o) {
  const isSale = o.type === ListingType.Sale;
  const isPg = o.type === ListingType.Pg;

  const price = {
    amount: o.price,
    type: isSale ? PriceType.Total : PriceType.Monthly, // rent/pg amount is weekly
    negotiable: !!o.negotiable,
  };
  if (isSale) price.method = o.method ?? SaleMethod.Negotiation;

  const config = {};
  if (o.beds != null) config.bedrooms = o.beds;
  if (o.baths != null) config.bathrooms = o.baths;
  if (o.cars != null) config.carSpaces = o.cars;
  if (o.cars != null && o.cars >= 2) config.garageSpaces = 1;
  if (o.furnishing) config.furnishing = o.furnishing;
  if (o.yearBuilt) config.yearBuilt = o.yearBuilt;

  const doc = {
    listingType: o.type,
    category: PropertyCategory.Residential,
    propertyType: o.propertyType,
    title: o.title,
    description:
      o.description ??
      `${o.title}. A well-presented property in ${o.suburb}, close to schools, transport and shops. Enquire today to arrange a viewing.`,
    price,
    config,
    location: {
      address: o.address ?? `${10 + (o.idx % 80)} Sample Street`,
      locality: o.suburb,
      city: o.district,
      state: o.region,
      pincode: o.postcode,
    },
    openHomes: o.openHome ? [nextOpenHome()] : [],
    amenities: pickAmenities(o.idx, 4),
    media: { images: pickImages(o.images ?? 2) },
    contactPhone: "021 555 0142",
    status: o.status ?? ListingStatus.Active,
    isVerified: false,
    isFeatured: !!o.featured,
    createdAt: daysAgo(o.daysAgo ?? 30),
    updatedAt: daysAgo(o.daysAgo ?? 30),
  };
  if (o.area) doc.area = { value: o.area, unit: AreaUnit.Sqm };
  if (o.land) doc.landArea = { value: o.land, unit: AreaUnit.Sqm };
  if (isSale) doc.saleType = o.saleType ?? SaleType.Resale;
  if (isPg) {
    doc.pgDetails = {
      gender: o.pgGender ?? PgGender.CoLiving,
      occupancy: o.occupancy ?? 2,
      mealsIncluded: !!o.meals,
      rules: ["No smoking indoors", "Quiet hours after 10pm"],
    };
  }
  return doc;
}

// ── Listing specs ─────────────────────────────────────────────────────────────
// Auckland → "Auckland City" is the insights default district (Mount Albert),
// so it's deliberately dense. PG listings are kept OUT of Auckland City to avoid
// the known PG-into-sale-price skew in the insights aggregation.
const AKL = (suburb, postcode) => ({ region: "Auckland", district: "Auckland City", suburb, postcode });

const specs = [
  // ── Auckland City (insights focus) ──
  { ...AKL("Mount Albert", "1025"), type: ListingType.Sale, propertyType: PropertyType.Villa, title: "Sunny 3-bedroom villa with character", price: 1450000, beds: 3, baths: 2, cars: 1, area: 142, land: 506, yearBuilt: 1925, method: SaleMethod.Auction, daysAgo: 6, openHome: true, featured: true },
  { ...AKL("Mount Albert", "1025"), type: ListingType.Sale, propertyType: PropertyType.House, title: "Renovated family home near the mountain", price: 1720000, beds: 4, baths: 2, cars: 2, area: 188, land: 612, yearBuilt: 1998, method: SaleMethod.Negotiation, daysAgo: 34 },
  { ...AKL("Mount Albert", "1025"), type: ListingType.Rent, propertyType: PropertyType.Townhouse, title: "Modern 3-bed townhouse for rent", price: 780, beds: 3, baths: 2, cars: 1, area: 120, furnishing: Furnishing.Unfurnished, daysAgo: 90 },
  { ...AKL("Mount Albert", "1025"), type: ListingType.Sale, propertyType: PropertyType.Unit, title: "Tidy 2-bedroom unit, handy to transport", price: 845000, beds: 2, baths: 1, cars: 1, area: 78, method: SaleMethod.AskingPrice, daysAgo: 160 },
  { ...AKL("Auckland Central", "1010"), type: ListingType.Sale, propertyType: PropertyType.Apartment, title: "City-fringe apartment with harbour glimpses", price: 720000, beds: 2, baths: 1, cars: 1, area: 68, yearBuilt: 2015, method: SaleMethod.Negotiation, daysAgo: 20, openHome: true },
  { ...AKL("Auckland Central", "1010"), type: ListingType.Rent, propertyType: PropertyType.Apartment, title: "Furnished CBD studio apartment", price: 560, beds: 1, baths: 1, cars: 0, area: 42, furnishing: Furnishing.Furnished, daysAgo: 220 },
  { ...AKL("Ponsonby", "1011"), type: ListingType.Sale, propertyType: PropertyType.Villa, title: "Classic Ponsonby villa, walk to Three Lamps", price: 2150000, beds: 4, baths: 3, cars: 1, area: 210, land: 405, yearBuilt: 1910, method: SaleMethod.Auction, daysAgo: 12, featured: true },
  { ...AKL("Ponsonby", "1011"), type: ListingType.Rent, propertyType: PropertyType.House, title: "Character bungalow for rent in Ponsonby", price: 950, beds: 3, baths: 2, cars: 1, area: 150, furnishing: Furnishing.SemiFurnished, daysAgo: 120 },
  { ...AKL("Grey Lynn", "1021"), type: ListingType.Sale, propertyType: PropertyType.House, title: "Sun-soaked Grey Lynn family home", price: 1680000, beds: 4, baths: 2, cars: 2, area: 176, land: 480, yearBuilt: 2005, method: SaleMethod.Negotiation, daysAgo: 48 },
  { ...AKL("Grey Lynn", "1021"), type: ListingType.Rent, propertyType: PropertyType.Townhouse, title: "Three-bed townhouse, double glazed", price: 820, beds: 3, baths: 2, cars: 1, area: 128, furnishing: Furnishing.Unfurnished, daysAgo: 75 },
  { ...AKL("Freemans Bay", "1011"), type: ListingType.Sale, propertyType: PropertyType.Apartment, title: "Stylish two-bed apartment, secure parking", price: 980000, beds: 2, baths: 2, cars: 1, area: 84, yearBuilt: 2019, method: SaleMethod.AskingPrice, daysAgo: 200, openHome: true },
  { ...AKL("Herne Bay", "1011"), type: ListingType.Sale, propertyType: PropertyType.House, title: "Premium Herne Bay residence", price: 2950000, beds: 5, baths: 3, cars: 2, area: 280, land: 620, yearBuilt: 2012, method: SaleMethod.Auction, daysAgo: 270, featured: true },
  { ...AKL("Mount Eden", "1024"), type: ListingType.Sale, propertyType: PropertyType.House, title: "Mount Eden home in zone for top schools", price: 1890000, beds: 4, baths: 2, cars: 1, area: 198, land: 540, yearBuilt: 1990, method: SaleMethod.Negotiation, daysAgo: 305 },
  { ...AKL("Remuera", "1050"), type: ListingType.Sale, propertyType: PropertyType.House, title: "Grand Remuera family home, north-facing", price: 3250000, beds: 5, baths: 4, cars: 2, area: 320, land: 810, yearBuilt: 2008, method: SaleMethod.Negotiation, daysAgo: 15 },

  // ── Auckland — North Shore City ──
  { region: "Auckland", district: "North Shore City", suburb: "Takapuna", postcode: "0622", type: ListingType.Sale, propertyType: PropertyType.Apartment, title: "Takapuna beachside apartment", price: 1250000, beds: 2, baths: 2, cars: 1, area: 96, yearBuilt: 2017, method: SaleMethod.AskingPrice, daysAgo: 25, openHome: true },
  { region: "Auckland", district: "North Shore City", suburb: "Devonport", postcode: "0624", type: ListingType.Sale, propertyType: PropertyType.Villa, title: "Historic Devonport villa near the village", price: 2050000, beds: 4, baths: 2, cars: 1, area: 190, land: 455, yearBuilt: 1905, method: SaleMethod.Auction, daysAgo: 60 },
  { region: "Auckland", district: "North Shore City", suburb: "Milford", postcode: "0620", type: ListingType.Rent, propertyType: PropertyType.House, title: "Family home for rent, walk to Milford Beach", price: 890, beds: 4, baths: 2, cars: 2, area: 180, furnishing: Furnishing.Unfurnished, daysAgo: 110 },
  { region: "Auckland", district: "North Shore City", suburb: "Takapuna", postcode: "0622", type: ListingType.Sale, propertyType: PropertyType.Townhouse, title: "Low-maintenance townhouse, Takapuna", price: 1100000, beds: 3, baths: 2, cars: 1, area: 134, yearBuilt: 2020, method: SaleMethod.Negotiation, daysAgo: 140, status: ListingStatus.Draft },

  // ── Auckland — Waitakere City ──
  { region: "Auckland", district: "Waitakere City", suburb: "Titirangi", postcode: "0604", type: ListingType.Sale, propertyType: PropertyType.House, title: "Bush-clad retreat in Titirangi", price: 1295000, beds: 3, baths: 2, cars: 2, area: 165, land: 1100, yearBuilt: 1996, method: SaleMethod.Negotiation, daysAgo: 40, openHome: true },
  { region: "Auckland", district: "Waitakere City", suburb: "Henderson", postcode: "0612", type: ListingType.Rent, propertyType: PropertyType.House, title: "Spacious 4-bed in Henderson", price: 720, beds: 4, baths: 2, cars: 2, area: 170, furnishing: Furnishing.Unfurnished, daysAgo: 95 },
  { region: "Auckland", district: "Waitakere City", suburb: "New Lynn", postcode: "0600", type: ListingType.Sale, propertyType: PropertyType.Unit, title: "Affordable starter unit, New Lynn", price: 695000, beds: 2, baths: 1, cars: 1, area: 70, method: SaleMethod.AskingPrice, daysAgo: 230 },

  // ── Auckland — Manukau City ──
  { region: "Auckland", district: "Manukau City", suburb: "Howick", postcode: "2014", type: ListingType.Sale, propertyType: PropertyType.House, title: "Family home in Howick, double garage", price: 1180000, beds: 4, baths: 2, cars: 2, area: 195, land: 600, yearBuilt: 2003, method: SaleMethod.Negotiation, daysAgo: 18 },
  { region: "Auckland", district: "Manukau City", suburb: "Botany Downs", postcode: "2010", type: ListingType.Rent, propertyType: PropertyType.Townhouse, title: "Modern townhouse near Botany Town Centre", price: 740, beds: 3, baths: 2, cars: 1, area: 130, furnishing: Furnishing.Unfurnished, daysAgo: 130 },
  { region: "Auckland", district: "Manukau City", suburb: "Howick", postcode: "2014", type: ListingType.Sale, propertyType: PropertyType.Apartment, title: "Sea-view apartment, Howick", price: 920000, beds: 2, baths: 2, cars: 1, area: 88, yearBuilt: 2018, method: SaleMethod.AskingPrice, daysAgo: 175, status: ListingStatus.PendingReview },

  // ── Waikato — Hamilton (incl. one PG) ──
  { region: "Waikato", district: "Hamilton", suburb: "Hamilton East", postcode: "3216", type: ListingType.Sale, propertyType: PropertyType.House, title: "Renovated villa in Hamilton East", price: 845000, beds: 3, baths: 1, cars: 1, area: 140, land: 620, yearBuilt: 1935, method: SaleMethod.Negotiation, daysAgo: 22, openHome: true },
  { region: "Waikato", district: "Hamilton", suburb: "Rototuna", postcode: "3210", type: ListingType.Sale, propertyType: PropertyType.House, title: "Near-new home in Rototuna", price: 995000, beds: 4, baths: 2, cars: 2, area: 210, land: 540, yearBuilt: 2021, method: SaleMethod.AskingPrice, daysAgo: 70 },
  { region: "Waikato", district: "Hamilton", suburb: "Hamilton East", postcode: "3216", type: ListingType.Pg, propertyType: PropertyType.PgBed, title: "Student room near Waikato University", price: 230, beds: 1, baths: 1, cars: 0, area: 14, pgGender: PgGender.CoLiving, occupancy: 1, meals: false, furnishing: Furnishing.Furnished, daysAgo: 45 },

  // ── Bay of Plenty — Tauranga ──
  { region: "Bay of Plenty", district: "Tauranga", suburb: "Mount Maunganui", postcode: "3116", type: ListingType.Sale, propertyType: PropertyType.Apartment, title: "Beachside apartment at the Mount", price: 1390000, beds: 3, baths: 2, cars: 1, area: 105, yearBuilt: 2016, method: SaleMethod.Auction, daysAgo: 30, openHome: true, featured: true },
  { region: "Bay of Plenty", district: "Tauranga", suburb: "Papamoa", postcode: "3118", type: ListingType.Sale, propertyType: PropertyType.House, title: "Modern coastal home in Papamoa", price: 1090000, beds: 4, baths: 2, cars: 2, area: 200, land: 480, yearBuilt: 2019, method: SaleMethod.Negotiation, daysAgo: 85 },
  { region: "Bay of Plenty", district: "Tauranga", suburb: "Bethlehem", postcode: "3110", type: ListingType.Rent, propertyType: PropertyType.House, title: "Family rental in Bethlehem", price: 690, beds: 3, baths: 2, cars: 2, area: 160, furnishing: Furnishing.Unfurnished, daysAgo: 150 },

  // ── Wellington (incl. one PG) ──
  { region: "Wellington", district: "Wellington", suburb: "Te Aro", postcode: "6011", type: ListingType.Sale, propertyType: PropertyType.Apartment, title: "Inner-city apartment in Te Aro", price: 640000, beds: 1, baths: 1, cars: 0, area: 55, yearBuilt: 2014, method: SaleMethod.AskingPrice, daysAgo: 28 },
  { region: "Wellington", district: "Wellington", suburb: "Kelburn", postcode: "6012", type: ListingType.Sale, propertyType: PropertyType.House, title: "Character home in Kelburn, city views", price: 1380000, beds: 4, baths: 2, cars: 1, area: 175, land: 410, yearBuilt: 1928, method: SaleMethod.Negotiation, daysAgo: 55, openHome: true },
  { region: "Wellington", district: "Wellington", suburb: "Island Bay", postcode: "6023", type: ListingType.Rent, propertyType: PropertyType.House, title: "Seaside rental in Island Bay", price: 820, beds: 3, baths: 1, cars: 1, area: 140, furnishing: Furnishing.SemiFurnished, daysAgo: 100 },
  { region: "Wellington", district: "Wellington", suburb: "Te Aro", postcode: "6011", type: ListingType.Pg, propertyType: PropertyType.PgBed, title: "Furnished room in central flat", price: 280, beds: 1, baths: 1, cars: 0, area: 16, pgGender: PgGender.Girls, occupancy: 1, meals: false, furnishing: Furnishing.Furnished, daysAgo: 38 },

  // ── Wellington — Porirua ──
  { region: "Wellington", district: "Porirua", suburb: "Whitby", postcode: "5024", type: ListingType.Sale, propertyType: PropertyType.House, title: "Spacious family home in Whitby", price: 880000, beds: 4, baths: 2, cars: 2, area: 205, land: 700, yearBuilt: 2001, method: SaleMethod.Negotiation, daysAgo: 65 },
  { region: "Wellington", district: "Porirua", suburb: "Plimmerton", postcode: "5026", type: ListingType.Sale, propertyType: PropertyType.House, title: "Beachfront opportunity in Plimmerton", price: 1250000, beds: 3, baths: 2, cars: 2, area: 160, land: 520, yearBuilt: 1985, method: SaleMethod.Auction, daysAgo: 190, status: ListingStatus.Draft },

  // ── Canterbury — Selwyn ──
  { region: "Canterbury", district: "Selwyn", suburb: "Rolleston", postcode: "7614", type: ListingType.Sale, propertyType: PropertyType.House, title: "Brand-new home in Rolleston", price: 760000, beds: 4, baths: 2, cars: 2, area: 200, land: 600, yearBuilt: 2023, method: SaleMethod.AskingPrice, daysAgo: 33, openHome: true },
  { region: "Canterbury", district: "Selwyn", suburb: "Lincoln", postcode: "7608", type: ListingType.Rent, propertyType: PropertyType.House, title: "Family rental in Lincoln", price: 600, beds: 3, baths: 2, cars: 2, area: 150, furnishing: Furnishing.Unfurnished, daysAgo: 125 },

  // ── Otago — Dunedin (incl. one PG) ──
  { region: "Otago", district: "Dunedin", suburb: "Saint Clair", postcode: "9012", type: ListingType.Sale, propertyType: PropertyType.House, title: "Coastal home steps from St Clair Beach", price: 950000, beds: 3, baths: 2, cars: 1, area: 155, land: 450, yearBuilt: 1965, method: SaleMethod.Negotiation, daysAgo: 42 },
  { region: "Otago", district: "Dunedin", suburb: "Roslyn", postcode: "9010", type: ListingType.Sale, propertyType: PropertyType.Villa, title: "Elegant villa in Roslyn", price: 820000, beds: 4, baths: 2, cars: 1, area: 180, land: 500, yearBuilt: 1915, method: SaleMethod.AskingPrice, daysAgo: 240, status: ListingStatus.Draft },
  { region: "Otago", district: "Dunedin", suburb: "Roslyn", postcode: "9010", type: ListingType.Pg, propertyType: PropertyType.PgBed, title: "Room in shared student house", price: 195, beds: 1, baths: 1, cars: 0, area: 13, pgGender: PgGender.Boys, occupancy: 1, meals: true, furnishing: Furnishing.Furnished, daysAgo: 50 },
];

// ── Demo seekers + lead/favorite source data ──────────────────────────────────
const SEEKERS = [
  { name: "Aroha Williams", email: `aroha.williams${SEEKER_DOMAIN}` },
  { name: "James Chen", email: `james.chen${SEEKER_DOMAIN}` },
  { name: "Priya Sharma", email: `priya.sharma${SEEKER_DOMAIN}` },
];

const LEAD_NAMES = [
  ["Olivia Brown", "021 234 5567"], ["Liam Wilson", "022 998 1142"],
  ["Sophie Taylor", "027 445 7781"], ["Noah Patel", "021 776 3320"],
  ["Emma Singh", "022 110 6654"], ["Mason Lee", "027 889 2201"],
  ["Isla Murphy", "021 553 9987"], ["Lucas Kaur", "022 667 1130"],
];
const LEAD_MESSAGES = [
  "Hi, is this property still available? I'd love to know more.",
  "Could I arrange a viewing this weekend please?",
  "What are the weekly costs and is it pet-friendly?",
  "Interested — is the price negotiable?",
  "Is there off-street parking included?",
  "We're a family of four, would this suit a long-term lease?",
];

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB_NAME);

  const users = db.collection("user");
  const listings = db.collection("listings");
  const leads = db.collection("leads");
  const favorites = db.collection("favorites");
  const meta = db.collection("_seed_meta");

  // 1) Reset only what a previous run inserted.
  const prev = await meta.findOne({ _id: "manifest" });
  if (prev) {
    await Promise.all([
      listings.deleteMany({ _id: { $in: (prev.listingIds ?? []).map((x) => new ObjectId(x)) } }),
      leads.deleteMany({ _id: { $in: (prev.leadIds ?? []).map((x) => new ObjectId(x)) } }),
      favorites.deleteMany({ _id: { $in: (prev.favoriteIds ?? []).map((x) => new ObjectId(x)) } }),
      users.deleteMany({ _id: { $in: (prev.seekerUserIds ?? []).map((x) => new ObjectId(x)) } }),
    ]);
  }
  // Also clear any stray demo seekers from older runs (by email marker).
  await users.deleteMany({ email: { $regex: `${SEEKER_DOMAIN.replace(/\./g, "\\.")}$` } });

  // 2) Upsert the owner (never deleted) and ensure the owner role.
  let ownerId;
  const existingOwner = await users.findOne({ email: OWNER_EMAIL });
  if (existingOwner) {
    ownerId = existingOwner._id;
    await users.updateOne(
      { _id: ownerId },
      { $set: { role: "owner", status: "active", emailVerified: true, updatedAt: NOW } },
    );
  } else {
    ownerId = new ObjectId();
    await users.insertOne({
      _id: ownerId, name: OWNER_NAME, email: OWNER_EMAIL, emailVerified: true,
      role: "owner", status: "active", createdAt: NOW, updatedAt: NOW,
    });
  }

  // 3) Insert demo seekers.
  const seekerDocs = SEEKERS.map((s) => ({
    _id: new ObjectId(), name: s.name, email: s.email, emailVerified: true,
    role: "seeker", status: "active", createdAt: daysAgo(120), updatedAt: NOW,
  }));
  await users.insertMany(seekerDocs);
  const seekerIds = seekerDocs.map((d) => d._id);

  // 4) Insert listings (owned by the owner).
  const listingDocs = specs.map((spec, idx) => ({
    _id: new ObjectId(),
    ownerId,
    ...L({ ...spec, idx }),
  }));
  await listings.insertMany(listingDocs);

  // 5) Leads — against ACTIVE listings, mix of kinds/statuses/seekers/guests.
  const activeListings = listingDocs.filter((l) => l.status === ListingStatus.Active);
  const statuses = [
    LeadStatus.New, LeadStatus.New, LeadStatus.New, LeadStatus.Contacted,
    LeadStatus.Contacted, LeadStatus.ClosedWon, LeadStatus.ClosedLost,
  ];
  const leadDocs = [];
  const LEAD_COUNT = 20;
  for (let i = 0; i < LEAD_COUNT; i++) {
    const listing = activeListings[(i * 3 + 1) % activeListings.length];
    const [name, phone] = LEAD_NAMES[i % LEAD_NAMES.length];
    const kind = i % 3 === 0 ? LeadKind.Viewing : LeadKind.Enquiry;
    // First 3 are guests (no seekerId); rest are signed-in seekers.
    const seekerId = i < 3 ? null : seekerIds[i % seekerIds.length];
    const created = daysAgo((i * 2) % 40);
    const doc = {
      _id: new ObjectId(),
      listingId: listing._id,
      ownerId,
      seekerId,
      name,
      phone,
      email: i % 4 === 0 ? undefined : `${name.split(" ")[0].toLowerCase()}@example.com`,
      message: LEAD_MESSAGES[i % LEAD_MESSAGES.length],
      kind,
      preferredTime: kind === LeadKind.Viewing ? daysAhead(2 + (i % 5)).toISOString() : undefined,
      listingTitle: listing.title,
      listingLocality: listing.location.locality,
      listingCity: listing.location.city,
      status: statuses[i % statuses.length],
      createdAt: created,
      updatedAt: created,
    };
    // Drop undefined optionals so the docs match real inserts.
    if (doc.email === undefined) delete doc.email;
    if (doc.preferredTime === undefined) delete doc.preferredTime;
    leadDocs.push(doc);
  }
  await leads.insertMany(leadDocs);

  // 6) Favorites — seekers shortlisting active listings (unique per pair).
  const favDocs = [];
  const seen = new Set();
  let fi = 0;
  for (const sid of seekerIds) {
    for (let k = 0; k < 4; k++) {
      const listing = activeListings[(fi * 5 + 2) % activeListings.length];
      const key = `${sid}-${listing._id}`;
      fi++;
      if (seen.has(key)) continue;
      seen.add(key);
      favDocs.push({
        _id: new ObjectId(),
        userId: sid,
        listingId: listing._id,
        createdAt: daysAgo(fi * 3),
      });
    }
  }
  await favorites.insertMany(favDocs);

  // 7) Record the manifest for the next reset.
  await meta.replaceOne(
    { _id: "manifest" },
    {
      _id: "manifest",
      seededAt: NOW.toISOString(),
      ownerEmail: OWNER_EMAIL,
      listingIds: listingDocs.map((d) => d._id.toString()),
      leadIds: leadDocs.map((d) => d._id.toString()),
      favoriteIds: favDocs.map((d) => d._id.toString()),
      seekerUserIds: seekerIds.map((d) => d.toString()),
    },
    { upsert: true },
  );

  const activeCount = activeListings.length;
  console.log(`
✓ Seed complete (database: ${MONGODB_DB_NAME})
  owner:      ${OWNER_EMAIL} (role=owner)  — log in with this email, OTP prints to the dev console
  seekers:    ${seekerIds.length}
  listings:   ${listingDocs.length} (${activeCount} active)
  leads:      ${leadDocs.length}
  favorites:  ${favDocs.length}
  insights:   Auckland → Auckland City has live data (default page: Mount Albert)
`);

  await client.close();
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});

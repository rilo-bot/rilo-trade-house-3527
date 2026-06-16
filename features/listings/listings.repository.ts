import { Collection, ObjectId, type Filter, type Sort } from "mongodb";
import { getDb } from "@/lib/db";
import { ListingStatus, ListingType, PriceType } from "@/lib/enums";
import { withSqm } from "./area";
import type {
  CreateListingInput,
  ListingQuery,
  UpdateListingInput,
} from "./listings.schema";

/**
 * Data-access layer for listings. No HTTP, no business rules — just Mongo reads
 * and writes. Documents are stored with native `_id` / `ownerId` ObjectIds and
 * serialized to plain `Listing` objects (string ids) before leaving here.
 */

/** Shape persisted in the `listings` collection. */
export interface ListingDoc extends Omit<CreateListingInput, "status"> {
  _id: ObjectId;
  ownerId: ObjectId;
  status: ListingStatus;
  isVerified: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** API-facing listing (ids as strings, dates as ISO). */
export type Listing = Omit<ListingDoc, "_id" | "ownerId" | "createdAt" | "updatedAt"> & {
  id: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  /**
   * Whether the CURRENT request's user has saved this listing. Not stored in
   * the DB — decorated per-request in the service when a user is present, so
   * the listing payload carries its own wishlist state (no separate call).
   */
  isFavorite?: boolean;
};

async function collection(): Promise<Collection<ListingDoc>> {
  const db = await getDb();
  return db.collection<ListingDoc>("listings");
}

export function toListing(doc: ListingDoc): Listing {
  const { _id, ownerId, createdAt, updatedAt, ...rest } = doc;
  return {
    ...rest,
    id: _id.toString(),
    ownerId: ownerId.toString(),
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

/**
 * Remove server-only auction fields (the SECRET reserve) before a listing goes
 * to a public surface. The owner's own views keep it (so the edit wizard can
 * pre-fill); only the public detail/search/wishlist paths call this.
 */
export function toPublicListing(listing: Listing): Listing {
  if (listing.price && listing.price.reserve != null) {
    const price = { ...listing.price };
    delete price.reserve;
    return { ...listing, price };
  }
  return listing;
}

export interface NewListing extends Omit<CreateListingInput, "status"> {
  ownerId: string;
  status: ListingStatus;
}

export async function insertListing(input: NewListing): Promise<Listing> {
  const col = await collection();
  const now = new Date();
  const { ownerId, area, landArea, ...rest } = input;
  const doc: ListingDoc = {
    _id: new ObjectId(),
    ownerId: new ObjectId(ownerId),
    isVerified: false,
    isFeatured: false,
    createdAt: now,
    updatedAt: now,
    ...rest,
    // Stamp the canonical m² value so area range filters/sorts work.
    ...(area ? { area: withSqm(area) } : {}),
    ...(landArea ? { landArea: withSqm(landArea) } : {}),
  };
  await col.insertOne(doc);
  return toListing(doc);
}

export async function findListingById(id: string): Promise<Listing | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await collection();
  const doc = await col.findOne({ _id: new ObjectId(id) });
  return doc ? toListing(doc) : null;
}

/**
 * Fetch active listings by id, preserving the order of `ids` (so a wishlist can
 * render newest-saved-first). Missing or non-active listings are simply omitted.
 */
export async function findActiveListingsByIds(
  ids: string[],
): Promise<Listing[]> {
  const objIds = ids
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));
  if (objIds.length === 0) return [];
  const col = await collection();
  const docs = await col
    .find({ _id: { $in: objIds }, status: ListingStatus.Active })
    .toArray();
  const byId = new Map(
    docs.map((d) => [d._id.toString(), toPublicListing(toListing(d))]),
  );
  return ids.map((id) => byId.get(id)).filter((l): l is Listing => Boolean(l));
}

export async function findListingsByOwner(ownerId: string): Promise<Listing[]> {
  const col = await collection();
  const docs = await col
    .find({ ownerId: new ObjectId(ownerId) })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(toListing);
}

/** Lightweight listing summary — just what a reference list (e.g. the seeker's
 *  enquiries) needs to show a thumbnail and decide if the listing is still live. */
export interface ListingSummary {
  id: string;
  coverImage?: string;
  status: ListingStatus;
}

/**
 * Map of listingId → {coverImage, status} for the given ids, ANY status (unlike
 * `findActiveListingsByIds`). Lets a reference list render a cover image and tell
 * whether the listing is still active (so it can avoid linking to a dead/sold
 * detail page). Missing ids are simply absent from the map.
 */
export async function findListingSummariesByIds(
  ids: string[],
): Promise<Record<string, ListingSummary>> {
  const objIds = ids
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));
  if (objIds.length === 0) return {};
  const col = await collection();
  const docs = await col
    .find(
      { _id: { $in: objIds } },
      { projection: { "media.images": { $slice: 1 }, status: 1 } },
    )
    .toArray();
  const map: Record<string, ListingSummary> = {};
  for (const d of docs) {
    map[d._id.toString()] = {
      id: d._id.toString(),
      coverImage: d.media?.images?.[0],
      status: d.status,
    };
  }
  return map;
}

/** Escape a user string so it's used as a literal in a Mongo `$regex`. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface OwnerListingQuery {
  q?: string;
  status?: ListingStatus;
  listingType?: ListingType;
  page: number;
  limit: number;
}

/**
 * Paginated owner listings with optional title search + status/type filters.
 * Powers the "Your properties" manager (search + infinite scroll).
 */
export async function searchListingsByOwner(
  ownerId: string,
  query: OwnerListingQuery,
): Promise<SearchResult> {
  const col = await collection();
  const filter: Filter<ListingDoc> = { ownerId: new ObjectId(ownerId) };
  if (query.status) filter.status = query.status;
  if (query.listingType) filter.listingType = query.listingType;
  if (query.q) filter.title = { $regex: escapeRegex(query.q), $options: "i" };

  const skip = (query.page - 1) * query.limit;
  const [docs, total] = await Promise.all([
    col
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .toArray(),
    col.countDocuments(filter),
  ]);
  return {
    items: docs.map(toListing),
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
}

/** Count of ALL listings grouped by status (admin platform overview). */
export async function countListingsByStatus(): Promise<Record<string, number>> {
  const col = await collection();
  const rows = await col
    .aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ])
    .toArray();
  const out: Record<string, number> = {};
  for (const r of rows) out[r._id] = r.count;
  return out;
}

/** Newest listings across all owners and statuses (admin activity feed). */
export async function findRecentListings(limit = 5): Promise<Listing[]> {
  const col = await collection();
  const docs = await col
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map(toListing);
}

export async function countActiveByOwner(ownerId: string): Promise<number> {
  const col = await collection();
  return col.countDocuments({
    ownerId: new ObjectId(ownerId),
    status: { $in: [ListingStatus.Active, ListingStatus.PendingReview] },
  });
}

export async function updateListingById(
  id: string,
  patch: UpdateListingInput,
): Promise<Listing | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await collection();
  // Recompute the canonical m² value when area/landArea are part of the patch.
  const normalized: UpdateListingInput = {
    ...patch,
    ...(patch.area ? { area: withSqm(patch.area) } : {}),
    ...(patch.landArea ? { landArea: withSqm(patch.landArea) } : {}),
  };
  const doc = await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...normalized, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return doc ? toListing(doc) : null;
}

export async function deleteListingById(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const col = await collection();
  const res = await col.deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount === 1;
}

export interface SearchResult {
  items: Listing[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  /**
   * The current user's TOTAL saved-listings count (across all listings, not just
   * this page). Present only when the request is authenticated; powers the
   * navbar wishlist badge without a separate favorites call.
   */
  favoritesCount?: number;
}

/** Public search — only ACTIVE listings, with filters, sort, and pagination. */
export async function searchListings(query: ListingQuery): Promise<SearchResult> {
  const col = await collection();

  const filter: Filter<ListingDoc> = { status: ListingStatus.Active };
  if (query.listingType) filter.listingType = query.listingType;
  if (query.category) filter.category = query.category;
  if (query.saleType) filter.saleType = query.saleType;
  // Property type: multi-select wins over the single legacy param.
  if (query.propertyTypes && query.propertyTypes.length > 0)
    filter.propertyType = { $in: query.propertyTypes };
  else if (query.propertyType) filter.propertyType = query.propertyType;
  // NZ ownership title types + marketing/sale methods (auction/tender/…).
  if (query.titleTypes && query.titleTypes.length > 0)
    filter.titleType = { $in: query.titleTypes };
  if (query.priceMethods && query.priceMethods.length > 0)
    filter["price.method"] = { $in: query.priceMethods };
  // Auction-date window (string range — auctionDate is stored as an ISO string).
  // Only auction listings carry the field, so a range here also filters to them.
  if (query.minAuctionDate || query.maxAuctionDate)
    filter["price.auctionDate"] = {
      ...(query.minAuctionDate ? { $gte: query.minAuctionDate } : {}),
      ...(query.maxAuctionDate ? { $lte: query.maxAuctionDate } : {}),
    };
  // NZ region → location.state (exact, case-insensitive).
  if (query.region)
    filter["location.state"] = {
      $regex: `^${escapeRegex(query.region)}$`,
      $options: "i",
    };
  // District (location.city) takes precedence over the legacy city filters.
  if (query.district) {
    filter["location.city"] = {
      $regex: `^${escapeRegex(query.district)}$`,
      $options: "i",
    };
  } else if (query.cities && query.cities.length > 0) {
    // Multi-select: exact match on any of the chosen cities.
    filter["location.city"] = { $in: query.cities };
  } else if (query.city) {
    filter["location.city"] = { $regex: escapeRegex(query.city), $options: "i" };
  }
  // Suburb: multi-select (exact) wins over the single locality regex.
  if (query.localities && query.localities.length > 0)
    filter["location.locality"] = { $in: query.localities };
  else if (query.locality)
    filter["location.locality"] = {
      $regex: escapeRegex(query.locality),
      $options: "i",
    };
  // Bedrooms / bathrooms are minimums ("2+ beds").
  if (query.bedrooms !== undefined)
    filter["config.bedrooms"] = { $gte: query.bedrooms };
  if (query.bathrooms !== undefined)
    filter["config.bathrooms"] = { $gte: query.bathrooms };
  // Minimum parking: satisfied by open car spaces OR enclosed garage spaces.
  // Wrapped in $and so it never clobbers the keyword `$or` set below.
  if (query.minParking !== undefined && query.minParking > 0) {
    filter.$and = [
      ...(filter.$and ?? []),
      {
        $or: [
          { "config.carSpaces": { $gte: query.minParking } },
          { "config.garageSpaces": { $gte: query.minParking } },
        ],
      },
    ];
  }
  // Year-built range (config.yearBuilt).
  if (query.minYearBuilt !== undefined || query.maxYearBuilt !== undefined)
    filter["config.yearBuilt"] = {
      ...(query.minYearBuilt !== undefined ? { $gte: query.minYearBuilt } : {}),
      ...(query.maxYearBuilt !== undefined ? { $lte: query.maxYearBuilt } : {}),
    };
  if (query.furnishing) filter["config.furnishing"] = query.furnishing;
  // Open homes only: keep listings with at least one scheduled session.
  if (query.openHomes) filter["openHomes.0"] = { $exists: true };
  if (query.pgGender) {
    filter.listingType = ListingType.Pg;
    filter["pgDetails.gender"] = query.pgGender;
  }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter["price.amount"] = {
      ...(query.minPrice !== undefined ? { $gte: query.minPrice } : {}),
      ...(query.maxPrice !== undefined ? { $lte: query.maxPrice } : {}),
    };
  }
  // NZ rateable/capital value (RV/CV) range.
  if (query.minCv !== undefined || query.maxCv !== undefined)
    filter.rateableValue = {
      ...(query.minCv !== undefined ? { $gte: query.minCv } : {}),
      ...(query.maxCv !== undefined ? { $lte: query.maxCv } : {}),
    };
  // Land / floor area range, compared against the canonical m² fields.
  if (query.minLandAreaSqm !== undefined || query.maxLandAreaSqm !== undefined)
    filter["landArea.valueSqm"] = {
      ...(query.minLandAreaSqm !== undefined ? { $gte: query.minLandAreaSqm } : {}),
      ...(query.maxLandAreaSqm !== undefined ? { $lte: query.maxLandAreaSqm } : {}),
    };
  if (query.minFloorAreaSqm !== undefined || query.maxFloorAreaSqm !== undefined)
    filter["area.valueSqm"] = {
      ...(query.minFloorAreaSqm !== undefined ? { $gte: query.minFloorAreaSqm } : {}),
      ...(query.maxFloorAreaSqm !== undefined ? { $lte: query.maxFloorAreaSqm } : {}),
    };
  // Required features: listing must have ALL selected amenities. Matched as
  // case-insensitive regexes so the controlled chip values still hit free-text
  // stored amenities (e.g. "Heat pump" matches "heat pump (×2)").
  if (query.amenities && query.amenities.length > 0) {
    (filter as Record<string, unknown>).amenities = {
      $all: query.amenities.map((a) => new RegExp(escapeRegex(a), "i")),
    };
  }
  if (query.q) {
    // Free-text search spans the listing's text AND every location level, so a
    // typed suburb / district / region / postcode each filters correctly — this
    // is where the home hero search and the top-cities tiles route their place
    // name. Locality (suburb), city (district) and state (region) match as
    // substrings; the 4-digit postcode is matched EXACTLY so a partial number
    // (e.g. "10") doesn't sweep in unrelated codes like "1010"/"0100".
    const rx = escapeRegex(query.q);
    filter.$or = [
      { title: { $regex: rx, $options: "i" } },
      { description: { $regex: rx, $options: "i" } },
      { "location.locality": { $regex: rx, $options: "i" } },
      { "location.city": { $regex: rx, $options: "i" } },
      { "location.state": { $regex: rx, $options: "i" } },
      { "location.pincode": { $regex: `^${rx}$`, $options: "i" } },
    ];
  }

  const SORT_MAP: Record<string, Sort> = {
    price_asc: { "price.amount": 1 },
    price_desc: { "price.amount": -1 },
    cv_asc: { rateableValue: 1 },
    cv_desc: { rateableValue: -1 },
    land_asc: { "landArea.valueSqm": 1 },
    land_desc: { "landArea.valueSqm": -1 },
    floor_asc: { "area.valueSqm": 1 },
    floor_desc: { "area.valueSqm": -1 },
    auction_soonest: { "price.auctionDate": 1 },
    newest: { createdAt: -1 },
  };
  const sort: Sort = SORT_MAP[query.sort] ?? { createdAt: -1 };

  const skip = (query.page - 1) * query.limit;
  const [docs, total] = await Promise.all([
    col.find(filter).sort(sort).skip(skip).limit(query.limit).toArray(),
    col.countDocuments(filter),
  ]);

  return {
    items: docs.map(toListing),
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
}

/** Distinct cities that currently have at least one active listing. */
export async function distinctActiveCities(): Promise<string[]> {
  const col = await collection();
  const cities = await col.distinct("location.city", {
    status: ListingStatus.Active,
  });
  return cities.filter((c): c is string => typeof c === "string" && c.length > 0).sort();
}

/**
 * Active-listing counts keyed by lowercased place name, so callers can look up
 * case-insensitively (e.g. "auckland"). Powers the "top cities" tiles.
 *
 * The home tiles are NZ regions/main centres (Auckland, Christchurch, …) while a
 * listing stores both a district (`location.city`, e.g. "Papakura") and a region
 * (`location.state`, e.g. "Auckland"). A tile name can match either field, so we
 * tally each listing under BOTH its city and its region — de-duped per listing so
 * a property whose city and region are the same word (e.g. "Wellington") counts
 * once, not twice.
 */
export async function countActiveByCity(): Promise<Record<string, number>> {
  const col = await collection();
  // Build a per-listing de-duped set of lowercased {city, state} place names in
  // the DB, $unwind it, then group — so the tally happens server-side instead of
  // pulling every active doc into the app. `$setUnion` collapses the city==state
  // case to a single key (counted once per listing).
  const place = (field: string) => ({
    $cond: [
      {
        $and: [
          { $eq: [{ $type: `$${field}` }, "string"] },
          { $ne: [{ $trim: { input: `$${field}` } }, ""] },
        ],
      },
      [{ $toLower: { $trim: { input: `$${field}` } } }],
      [],
    ],
  });
  const rows = await col
    .aggregate<{ _id: string; n: number }>([
      { $match: { status: ListingStatus.Active } },
      {
        $project: {
          keys: { $setUnion: [place("location.city"), place("location.state")] },
        },
      },
      { $unwind: "$keys" },
      { $group: { _id: "$keys", n: { $sum: 1 } } },
    ])
    .toArray();

  const counts: Record<string, number> = {};
  for (const r of rows) if (typeof r._id === "string") counts[r._id] = r.n;
  return counts;
}

/**
 * Active-listing counts grouped by listing type ("sale" / "rent" / "pg").
 * Powers the home "Everything you need" tiles.
 */
export async function countActiveByType(): Promise<Record<string, number>> {
  const col = await collection();
  const rows = await col
    .aggregate<{ _id: string; n: number }>([
      { $match: { status: ListingStatus.Active } },
      { $group: { _id: "$listingType", n: { $sum: 1 } } },
    ])
    .toArray();

  const counts: Record<string, number> = {};
  for (const r of rows) if (typeof r._id === "string") counts[r._id] = r.n;
  return counts;
}

/**
 * Active-listing counts grouped by concrete property type ("house",
 * "apartment", …). Powers the home "Browse by property type" tiles.
 */
export async function countActiveByPropertyType(): Promise<
  Record<string, number>
> {
  const col = await collection();
  const rows = await col
    .aggregate<{ _id: string; n: number }>([
      { $match: { status: ListingStatus.Active } },
      { $group: { _id: "$propertyType", n: { $sum: 1 } } },
    ])
    .toArray();

  const counts: Record<string, number> = {};
  for (const r of rows) if (typeof r._id === "string") counts[r._id] = r.n;
  return counts;
}

/** Raw per-suburb aggregates for the insights pages (medians computed upstream). */
export interface LocalityStats {
  count: number;
  salePrices: number[];
  rentPrices: number[];
  /** ISO listing dates — for "days listed" + the monthly-listings histogram. */
  createdAts: string[];
}

/**
 * Active listings within a district, grouped by suburb (`location.locality`).
 * One query feeds both the selected suburb and its siblings on the insights
 * page. Returns `{}` when there's nothing active there.
 */
export async function aggregateActiveByLocality(
  region: string,
  district: string,
): Promise<Record<string, LocalityStats>> {
  const col = await collection();
  const rows = await col
    .find(
      {
        status: ListingStatus.Active,
        "location.state": region,
        "location.city": district,
      },
      {
        projection: {
          "location.locality": 1,
          "price.amount": 1,
          "price.type": 1,
          listingType: 1,
          createdAt: 1,
        },
      },
    )
    .toArray();

  const out: Record<string, LocalityStats> = {};
  for (const row of rows) {
    const locality = row.location?.locality;
    if (!locality) continue;
    const s = (out[locality] ??= {
      count: 0,
      salePrices: [],
      rentPrices: [],
      createdAts: [],
    });
    s.count++;
    const amount = row.price?.amount;
    // Bucket by price.type (total = sale, monthly = rent), NOT listingType.
    // PG bed rates are a weekly per-room figure — not comparable to either a
    // sale price or a whole-property rent — so they're excluded from both
    // medians (previously they leaked into salePrices and crushed the median).
    if (typeof amount === "number" && row.listingType !== ListingType.Pg) {
      if (row.price?.type === PriceType.Total) s.salePrices.push(amount);
      else s.rentPrices.push(amount);
    }
    if (row.createdAt) s.createdAts.push(new Date(row.createdAt).toISOString());
  }
  return out;
}

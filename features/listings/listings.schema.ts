import { z } from "zod";
import {
  AreaUnit,
  Furnishing,
  ListingStatus,
  ListingType,
  PgGender,
  PriceType,
  PropertyCategory,
  PropertyType,
  SaleMethod,
  SaleType,
  TitleType,
} from "@/lib/enums";

/**
 * Zod schemas for the listings feature — the single source of truth for shape
 * + validation. Types are inferred (`z.infer`) rather than declared twice.
 *
 * `createListingSchema` validates client input for POST. The stored document
 * adds server-owned fields (ownerId, status, timestamps) — see
 * listings.repository.ts.
 */

// ISO date-time string (e.g. from a datetime-local input, "2026-06-12T13:00").
// Stored as a string so it serializes cleanly over JSON; parsed where needed.
const isoDateTime = z.string().min(1).max(40);

const priceSchema = z.object({
  amount: z.number().nonnegative(),
  type: z.enum(PriceType),
  // How a for-sale property is marketed (NZ). Optional for now so the existing
  // wizard keeps working; becomes required for sale listings in Step 1.4–1.5.
  method: z.enum(SaleMethod).optional(),
  deposit: z.number().nonnegative().optional(),
  maintenance: z.number().nonnegative().optional(),
  negotiable: z.boolean().default(false),
  // Method-specific dates. Only one applies, based on `method`.
  auctionDate: isoDateTime.optional(),
  tenderClosesAt: isoDateTime.optional(),
  deadlineAt: isoDateTime.optional(),
  // Auction marketing details (NZ) — all public, shown on the listing.
  // An optional indicative figure, the venue (auction rooms / on-site / online),
  // and a livestream URL for online auctions.
  priceGuide: z.number().nonnegative().optional(),
  auctionVenue: z.string().max(160).optional(),
  livestreamUrl: z.string().url().optional(),
  // SECRET reserve price. The owner sets it; it is NEVER sent to the public
  // (stripped in getPublicListing/searchPublicListings) — only used server-side
  // to compute a `reserveMet` boolean for the live bidding panel.
  reserve: z.number().nonnegative().optional(),
});

const areaSchema = z.object({
  value: z.number().positive(),
  unit: z.enum(AreaUnit),
  carpet: z.number().positive().optional(),
  builtUp: z.number().positive().optional(),
  // Canonical square-metre value, computed server-side on write (see
  // features/listings/area.ts) so range filters/sorts compare like-for-like
  // across units. Never sent by the client; recomputed from value+unit.
  valueSqm: z.number().nonnegative().optional(),
});

const configSchema = z.object({
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  balconies: z.number().int().min(0).optional(),
  // Off-street / open car parks and enclosed garage spaces (NZ cards show 🚗).
  carSpaces: z.number().int().min(0).optional(),
  garageSpaces: z.number().int().min(0).optional(),
  furnishing: z.enum(Furnishing).optional(),
  floor: z.number().int().optional(),
  totalFloors: z.number().int().min(0).optional(),
  ageYears: z.number().int().min(0).optional(),
  // Year the dwelling was built (e.g. 2015) — shown as "Built 2015".
  yearBuilt: z.number().int().min(1800).max(2100).optional(),
});

// Land/section area, kept separate from the floor `area` above. NZ lists this
// in m² for most homes and hectares for lifestyle blocks/sections.
const landAreaSchema = z.object({
  value: z.number().positive(),
  unit: z.enum(AreaUnit),
  // Canonical square-metre value (see `areaSchema.valueSqm`).
  valueSqm: z.number().nonnegative().optional(),
});

// A scheduled open-home viewing window. Times are ISO date-time strings.
const openHomeSchema = z.object({
  start: isoDateTime,
  end: isoDateTime,
});

const locationSchema = z.object({
  address: z.string().min(1).max(300),
  locality: z.string().min(1).max(120),
  city: z.string().min(1).max(80),
  // `state` holds the NZ region (e.g. "Auckland", "Canterbury").
  state: z.string().min(1).max(80),
  // `pincode` holds the NZ 4-digit postcode.
  pincode: z.string().regex(/^\d{4}$/, "Enter a valid 4-digit postcode"),
  geo: z
    .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
    .optional(),
});

// Listing images come from our upload API, which returns a root-relative proxy
// path ("/api/uploads/..."); demo/CDN images are absolute URLs. Accept either.
const imageUrl = z
  .string()
  .refine((v) => v.startsWith("/") || /^https?:\/\//.test(v), "Invalid URL");

const mediaSchema = z.object({
  images: z.array(imageUrl).max(20).default([]),
  videoUrl: z.string().url().optional(),
  virtualTourUrl: z.string().url().optional(),
});

const pgDetailsSchema = z.object({
  gender: z.enum(PgGender),
  occupancy: z.number().int().min(1).max(10).optional(),
  mealsIncluded: z.boolean().default(false),
  rules: z.array(z.string().max(120)).max(20).default([]),
});

/** Input accepted when creating a listing. */
export const createListingSchema = z
  .object({
    listingType: z.enum(ListingType),
    saleType: z.enum(SaleType).optional(),
    category: z.enum(PropertyCategory),
    propertyType: z.enum(PropertyType),
    title: z.string().min(5).max(150),
    description: z.string().min(10).max(5000),
    price: priceSchema,
    // Floor area of any building. Optional because bare land/sections have none
    // — the form requires it for dwellings/commercial but not for land.
    area: areaSchema.optional(),
    // Section/land size, separate from floor area.
    landArea: landAreaSchema.optional(),
    config: configSchema.optional(),
    location: locationSchema,
    // NZ rateable/capital value (RV/CV), e.g. 920000.
    rateableValue: z.number().nonnegative().optional(),
    // NZ ownership title type.
    titleType: z.enum(TitleType).optional(),
    // Scheduled open-home viewing windows.
    openHomes: z.array(openHomeSchema).max(30).default([]),
    amenities: z.array(z.string().max(60)).max(50).default([]),
    media: mediaSchema.default({ images: [] }),
    pgDetails: pgDetailsSchema.optional(),
    // Optional public contact number for enquiries/viewings — revealed on the
    // listing via a "Show number" button.
    contactPhone: z
      .string()
      .regex(/^[0-9+\-\s]{7,15}$/, "Enter a valid phone number")
      .optional(),
    // Owner submits as DRAFT or ACTIVE (published). Other states are server-set.
    status: z
      .enum([ListingStatus.Draft, ListingStatus.Active])
      .default(ListingStatus.Active),
  })
  .refine(
    (v) => v.listingType !== ListingType.Pg || v.pgDetails !== undefined,
    { message: "PG listings require pgDetails", path: ["pgDetails"] },
  )
  .refine(
    (v) => v.listingType !== ListingType.Sale || v.saleType !== undefined,
    { message: "Sale listings require a saleType", path: ["saleType"] },
  )
  // Method-specific dates: when a sale method needs a date, require it.
  .refine(
    (v) => v.price.method !== SaleMethod.Auction || !!v.price.auctionDate,
    { message: "Auction listings require an auction date", path: ["price", "auctionDate"] },
  )
  .refine(
    (v) => v.price.method !== SaleMethod.Tender || !!v.price.tenderClosesAt,
    { message: "Tender listings require a closing date", path: ["price", "tenderClosesAt"] },
  )
  .refine(
    (v) => v.price.method !== SaleMethod.DeadlineSale || !!v.price.deadlineAt,
    { message: "Deadline sales require a deadline date", path: ["price", "deadlineAt"] },
  );

/**
 * Input accepted when editing — all fields optional. The edit wizard reuses the
 * same full payload as create, so we accept `listingType` here too (it can be
 * changed on edit), and we DON'T use `.strict()`: any extra keys are stripped
 * rather than rejected, so the form never 422s over a field the update path
 * doesn't care about.
 */
export const updateListingSchema = z.object({
  listingType: z.enum(ListingType).optional(),
  saleType: z.enum(SaleType).optional(),
  category: z.enum(PropertyCategory).optional(),
  propertyType: z.enum(PropertyType).optional(),
  title: z.string().min(5).max(150).optional(),
  description: z.string().min(10).max(5000).optional(),
  price: priceSchema.optional(),
  area: areaSchema.optional(),
  landArea: landAreaSchema.optional(),
  config: configSchema.optional(),
  location: locationSchema.optional(),
  rateableValue: z.number().nonnegative().optional(),
  titleType: z.enum(TitleType).optional(),
  openHomes: z.array(openHomeSchema).max(30).optional(),
  amenities: z.array(z.string().max(60)).max(50).optional(),
  media: mediaSchema.optional(),
  pgDetails: pgDetailsSchema.optional(),
  contactPhone: z
    .string()
    .regex(/^[0-9+\-\s]{7,15}$/, "Enter a valid phone number")
    .optional(),
  // Owners may toggle between draft/active or mark sold/rented.
  status: z
    .enum([ListingStatus.Draft, ListingStatus.Active, ListingStatus.RentedSold])
    .optional(),
});

/** A comma-separated multi-select query param → trimmed string[] (or undefined). */
const csvParam = z
  .string()
  .optional()
  .catch(undefined)
  .transform((v) =>
    v
      ? v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined,
  );

/**
 * Like `csvParam` but keeps only values belonging to `enumObj` (so a bad token
 * in `?titleTypes=freehold,bogus` is dropped, not fatal). Returns `undefined`
 * when nothing valid remains.
 */
function csvEnumParam<T extends Record<string, string>>(enumObj: T) {
  const allowed = new Set<string>(Object.values(enumObj));
  return z
    .string()
    .optional()
    .catch(undefined)
    .transform((v) => {
      if (!v) return undefined;
      const out = v
        .split(",")
        .map((s) => s.trim())
        .filter((s) => allowed.has(s)) as T[keyof T][];
      return out.length ? out : undefined;
    });
}

/**
 * Query parameters for the public search endpoint.
 *
 * Every field uses `.catch()` so a single malformed param (e.g. a hand-edited
 * or stale URL like `?minPrice=abc` or `?propertyType=foo`) degrades to its
 * default/undefined instead of throwing — the rest of the filters still apply
 * and the search returns results rather than erroring.
 */
export const listingQuerySchema = z.object({
  listingType: z.enum(ListingType).optional().catch(undefined),
  category: z.enum(PropertyCategory).optional().catch(undefined),
  saleType: z.enum(SaleType).optional().catch(undefined),
  // Single propertyType (legacy) + multi-select; multi wins when both present.
  propertyType: z.enum(PropertyType).optional().catch(undefined),
  propertyTypes: csvEnumParam(PropertyType),
  // NZ region (stored on location.state) and district (location.city).
  region: z.string().max(80).optional().catch(undefined),
  district: z.string().max(80).optional().catch(undefined),
  city: z.string().max(80).optional().catch(undefined),
  // Comma-separated list of districts for multi-select filtering (exact match).
  cities: csvParam,
  locality: z.string().max(120).optional().catch(undefined),
  // Comma-separated suburbs for multi-select filtering (exact match); wins over
  // the single `locality` regex when present.
  localities: csvParam,
  // NZ ownership title types (multi) and sale methods (multi, e.g. auction).
  titleTypes: csvEnumParam(TitleType),
  priceMethods: csvEnumParam(SaleMethod),
  // Auction-date window (ISO "YYYY-MM-DDTHH:mm", same format as stored
  // `price.auctionDate`, so a string range compares correctly). Powers the
  // "Auctions this weekend / upcoming" presets. A range here inherently keeps
  // only listings that have an auction date.
  minAuctionDate: z.string().max(40).optional().catch(undefined),
  maxAuctionDate: z.string().max(40).optional().catch(undefined),
  // UI-only: which preset produced the window above. Carried so the filter
  // control rehydrates from a shared URL; the actual filter uses min/maxAuctionDate.
  auctionWindow: z
    .enum(["this_weekend", "next_7_days", "next_30_days", "upcoming"])
    .optional()
    .catch(undefined),
  minPrice: z.coerce.number().nonnegative().optional().catch(undefined),
  maxPrice: z.coerce.number().nonnegative().optional().catch(undefined),
  // NZ rateable/capital value (RV/CV) range.
  minCv: z.coerce.number().nonnegative().optional().catch(undefined),
  maxCv: z.coerce.number().nonnegative().optional().catch(undefined),
  // Minimum bedrooms / bathrooms (TradeMe-style "2+").
  bedrooms: z.coerce.number().int().min(0).optional().catch(undefined),
  bathrooms: z.coerce.number().int().min(0).optional().catch(undefined),
  // Minimum total parking — matched against carSpaces OR garageSpaces.
  minParking: z.coerce.number().int().min(0).optional().catch(undefined),
  // Year-built range (absolute year, not age).
  minYearBuilt: z.coerce.number().int().min(1800).max(2100).optional().catch(undefined),
  maxYearBuilt: z.coerce.number().int().min(1800).max(2100).optional().catch(undefined),
  // Land/floor area range, in canonical square metres (see area.ts).
  minLandAreaSqm: z.coerce.number().nonnegative().optional().catch(undefined),
  maxLandAreaSqm: z.coerce.number().nonnegative().optional().catch(undefined),
  minFloorAreaSqm: z.coerce.number().nonnegative().optional().catch(undefined),
  maxFloorAreaSqm: z.coerce.number().nonnegative().optional().catch(undefined),
  // Required features — listing must have ALL selected (matched leniently).
  amenities: csvParam,
  furnishing: z.enum(Furnishing).optional().catch(undefined),
  pgGender: z.enum(PgGender).optional().catch(undefined),
  // "Open homes only" — true keeps listings that have a scheduled open home.
  openHomes: z
    .string()
    .optional()
    .catch(undefined)
    .transform((v) => v === "true" || v === "1"),
  q: z.string().max(120).optional().catch(undefined),
  sort: z
    .enum([
      "newest",
      "price_asc",
      "price_desc",
      "cv_asc",
      "cv_desc",
      "land_asc",
      "land_desc",
      "floor_asc",
      "floor_desc",
      "auction_soonest",
    ])
    .default("newest")
    .catch("newest"),
  page: z.coerce.number().int().min(1).default(1).catch(1),
  limit: z.coerce.number().int().min(1).max(50).default(12).catch(12),
});

/**
 * Query for the owner's "Your properties" list (`GET /api/listings?scope=mine`):
 * a title search plus status/type filters, paginated for infinite scroll. Each
 * field uses `.catch()` so a stale/hand-edited param degrades, not throws.
 */
export const myListingsQuerySchema = z.object({
  q: z.string().trim().max(120).optional().catch(undefined),
  status: z.enum(ListingStatus).optional().catch(undefined),
  listingType: z.enum(ListingType).optional().catch(undefined),
  page: z.coerce.number().int().min(1).default(1).catch(1),
  limit: z.coerce.number().int().min(1).max(50).default(10).catch(10),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type ListingQuery = z.infer<typeof listingQuerySchema>;
export type MyListingsQuery = z.infer<typeof myListingsQuerySchema>;

/**
 * Flat schema for the create-listing FORM (react-hook-form). Numeric inputs are
 * kept as strings (how `<input>` reports them) with refinements that produce
 * friendly messages; the form maps these to the nested `createListingSchema`
 * payload on submit. Drives inline errors + disable-until-valid in the UI.
 */
const optionalWholeNumber = z
  .string()
  .optional()
  .refine(
    (v) => !v || (/^\d+$/.test(v) && Number(v) >= 0),
    "Enter a whole number",
  );

// Optional positive (possibly decimal) number — used for areas / values.
const optionalPositiveNumber = z
  .string()
  .optional()
  .refine((v) => !v || Number(v) > 0, "Enter a number greater than 0");

// Optional 4-digit year within a sane range.
const optionalYear = z
  .string()
  .optional()
  .refine(
    (v) => !v || (/^\d{4}$/.test(v) && Number(v) >= 1800 && Number(v) <= 2100),
    "Enter a valid year",
  );

// One open-home window in the form (ISO date-time strings from the inputs).
const openHomeFormSchema = z.object({
  start: z.string().min(1),
  end: z.string().min(1),
});

// Which NZ sale methods quote an upfront price the user must enter.
const PRICED_METHODS: SaleMethod[] = [
  SaleMethod.AskingPrice,
  SaleMethod.EnquiriesOver,
];

export const listingFormSchema = z
  .object({
    listingType: z.enum(ListingType),
    saleType: z.enum(SaleType),
    category: z.enum(PropertyCategory),
    propertyType: z.enum(PropertyType),
    title: z
      .string()
      .min(5, "Title must be at least 5 characters")
      .max(150, "Title is too long (max 150)"),
    description: z
      .string()
      .min(10, "Description must be at least 10 characters")
      .max(5000, "Description is too long"),
    // How a for-sale property is marketed (ignored for rent / flatmates).
    saleMethod: z.enum(SaleMethod),
    // Price is conditionally required (see superRefine): rentals always need
    // one; sales only for asking-price / enquiries-over methods.
    amount: z.string().optional(),
    deposit: z
      .string()
      .optional()
      .refine((v) => !v || Number(v) >= 0, "Enter a valid amount"),
    negotiable: z.boolean(),
    // Sale-method dates (ISO strings from datetime-local inputs).
    auctionDate: z.string().optional(),
    tenderClosesAt: z.string().optional(),
    deadlineAt: z.string().optional(),
    // Auction marketing details (auction listings only; all optional + public).
    priceGuide: optionalPositiveNumber,
    auctionVenue: z.string().max(160).optional(),
    livestreamUrl: z
      .string()
      .optional()
      .refine(
        (v) => !v || /^https?:\/\//.test(v),
        "Enter a valid URL (https://…)",
      ),
    // SECRET reserve (auction only) — never shown to buyers.
    reserve: optionalPositiveNumber,
    // Floor area.
    areaValue: z
      .string()
      .min(1, "Area is required")
      .refine((v) => Number(v) > 0, "Enter an area greater than 0"),
    areaUnit: z.enum(AreaUnit),
    // Land / section area (optional).
    landAreaValue: optionalPositiveNumber,
    landAreaUnit: z.enum(AreaUnit),
    bedrooms: optionalWholeNumber,
    bathrooms: optionalWholeNumber,
    carSpaces: optionalWholeNumber,
    garageSpaces: optionalWholeNumber,
    yearBuilt: optionalYear,
    furnishing: z.enum(Furnishing),
    // NZ rateable/capital value (RV/CV).
    rateableValue: optionalPositiveNumber,
    // NZ title type (optional — "" means not specified).
    titleType: z.union([z.enum(TitleType), z.literal("")]),
    address: z.string().min(1, "Address is required").max(300),
    locality: z.string().min(1, "Locality is required").max(120),
    city: z.string().min(1, "City is required").max(80),
    state: z.string().min(1, "Region is required").max(80),
    pincode: z.string().regex(/^\d{4}$/, "Enter a valid 4-digit postcode"),
    openHomes: z.array(openHomeFormSchema).max(30).default([]),
    amenities: z.array(z.string()),
    images: z.array(z.string().url()).max(20, "Up to 20 images"),
    pgGender: z.enum(PgGender),
    mealsIncluded: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const isSale = v.listingType === ListingType.Sale;
    const needsPrice = !isSale || PRICED_METHODS.includes(v.saleMethod);

    // Price requirement depends on listing type + sale method.
    if (needsPrice && !(Number(v.amount) > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a price greater than 0",
        path: ["amount"],
      });
    }

    // Method-specific dates (sale listings only).
    if (isSale) {
      if (v.saleMethod === SaleMethod.Auction && !v.auctionDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Auction listings need an auction date",
          path: ["auctionDate"],
        });
      }
      if (v.saleMethod === SaleMethod.Tender && !v.tenderClosesAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Tender listings need a closing date",
          path: ["tenderClosesAt"],
        });
      }
      if (v.saleMethod === SaleMethod.DeadlineSale && !v.deadlineAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Deadline sales need a deadline date",
          path: ["deadlineAt"],
        });
      }
    }

    // Open-home windows must end after they start.
    v.openHomes.forEach((oh, i) => {
      if (oh.start && oh.end && oh.end <= oh.start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End time must be after the start time",
          path: ["openHomes", i, "end"],
        });
      }
    });
  });

export type ListingFormValues = z.infer<typeof listingFormSchema>;

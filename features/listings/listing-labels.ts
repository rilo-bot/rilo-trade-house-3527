import {
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
import { nzWallClockToInstant } from "@/features/auctions/auction-window";

/**
 * Client-safe presentation helpers for listings — human labels for enum values
 * and price/area formatting. No server imports, safe in Client Components.
 */

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  [ListingType.Sale]: "For sale",
  [ListingType.Rent]: "For rent",
  [ListingType.Pg]: "Flatmates / Room",
};

export const SALE_TYPE_LABELS: Record<SaleType, string> = {
  [SaleType.Ready]: "Ready to move",
  [SaleType.UnderConstruction]: "Under construction",
  [SaleType.Resale]: "Resale",
};

export const CATEGORY_LABELS: Record<PropertyCategory, string> = {
  [PropertyCategory.Residential]: "Residential",
  [PropertyCategory.Commercial]: "Commercial",
  [PropertyCategory.Land]: "Land / Section",
};

// To add/rename a property type: add the value to PropertyType in lib/enums.ts,
// then add its label here. TypeScript enforces that every enum value has a
// label (this is a `Record<PropertyType, string>`), so nothing can render blank.
// Dropdown order follows the enum declaration order in lib/enums.ts.
export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  [PropertyType.House]: "House",
  [PropertyType.Apartment]: "Apartment",
  [PropertyType.Townhouse]: "Townhouse",
  [PropertyType.Unit]: "Unit",
  [PropertyType.Villa]: "Villa",
  [PropertyType.Studio]: "Studio",
  [PropertyType.Section]: "Section",
  [PropertyType.Lifestyle]: "Lifestyle property",
  [PropertyType.Plot]: "Land / Plot",
  [PropertyType.Office]: "Office Space",
  [PropertyType.Shop]: "Shop / Retail",
  [PropertyType.PgBed]: "Room in Flat",
};

// NZ sale methods. Same pattern: enum value in lib/enums.ts → label here.
export const SALE_METHOD_LABELS: Record<SaleMethod, string> = {
  [SaleMethod.AskingPrice]: "Asking price",
  [SaleMethod.Negotiation]: "Price by negotiation",
  [SaleMethod.EnquiriesOver]: "Enquiries over",
  [SaleMethod.Auction]: "Auction",
  [SaleMethod.Tender]: "Tender",
  [SaleMethod.DeadlineSale]: "Deadline sale",
  [SaleMethod.PriceWithheld]: "Price withheld",
};

// NZ land/ownership title types.
export const TITLE_TYPE_LABELS: Record<TitleType, string> = {
  [TitleType.Freehold]: "Freehold",
  [TitleType.Leasehold]: "Leasehold",
  [TitleType.CrossLease]: "Cross-lease",
  [TitleType.UnitTitle]: "Unit title",
};

export const FURNISHING_LABELS: Record<Furnishing, string> = {
  [Furnishing.Unfurnished]: "Unfurnished",
  [Furnishing.SemiFurnished]: "Semi-furnished",
  [Furnishing.Furnished]: "Furnished",
};

export const PG_GENDER_LABELS: Record<PgGender, string> = {
  [PgGender.Boys]: "Men",
  [PgGender.Girls]: "Women",
  [PgGender.CoLiving]: "Mixed / Co-living",
};

export const STATUS_LABELS: Record<ListingStatus, string> = {
  [ListingStatus.Draft]: "Draft",
  [ListingStatus.PendingReview]: "Pending review",
  [ListingStatus.Active]: "Active",
  [ListingStatus.RentedSold]: "Sold / Rented",
  [ListingStatus.Expired]: "Expired",
  [ListingStatus.Rejected]: "Rejected",
};

/** Tailwind classes for a status badge. Carries `dark:` variants so the soft
 *  tinted pills stay legible on the dark navy surfaces (the bare `*-100/-800`
 *  pairs wash out in dark mode). */
export const STATUS_BADGE: Record<ListingStatus, string> = {
  [ListingStatus.Draft]: "bg-muted text-muted-foreground",
  [ListingStatus.PendingReview]:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  [ListingStatus.Active]:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  [ListingStatus.RentedSold]:
    "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  [ListingStatus.Expired]: "bg-muted text-muted-foreground",
  [ListingStatus.Rejected]: "bg-destructive/10 text-destructive",
};

/** Format an amount in New Zealand dollars with M/K shorthand for sale prices. */
export function formatNZD(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
  }
  if (amount >= 100_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount.toLocaleString("en-NZ")}`;
}

/**
 * Full price label, e.g. "$1.65M" or "$650/wk". NZ rents are quoted per week,
 * so PriceType.Monthly (the recurring/rent type) renders with a "/wk" suffix
 * and is shown in full dollars rather than M/K shorthand.
 */
export function formatPrice(price: { amount: number; type: PriceType }): string {
  if (price.type === PriceType.Monthly) {
    return `$${price.amount.toLocaleString("en-NZ")}/wk`;
  }
  return formatNZD(price.amount);
}

/** Format an ISO date-time as NZ short form, e.g. "Thu 12 Jun, 1:00 pm".
 *  Offset-less strings (how auction/open-home times are stored) are interpreted
 *  as Pacific/Auckland wall-clock and formatted in NZ time, so they read the same
 *  on any host timezone (e.g. a UTC production server). */
export function formatDateTimeNZ(iso: string): string {
  const ms = nzWallClockToInstant(iso);
  const d = new Date(Number.isNaN(ms) ? iso : ms);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-NZ", {
    timeZone: "Pacific/Auckland",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** The price fields needed to render a method-aware sale/rent label. */
type SalePriceLike = {
  amount: number;
  type: PriceType;
  method?: SaleMethod;
  auctionDate?: string;
  tenderClosesAt?: string;
  deadlineAt?: string;
};

/**
 * The headline price label for a listing, NZ-style. Rentals show "$x/wk".
 * Sales depend on the chosen method: a figure for asking-price / enquiries-over,
 * a date for auction / tender / deadline, or a plain phrase otherwise.
 */
export function formatSalePrice(price: SalePriceLike): string {
  if (price.type === PriceType.Monthly) return formatPrice(price);

  switch (price.method) {
    case SaleMethod.EnquiriesOver:
      return `Enquiries over ${formatNZD(price.amount)}`;
    case SaleMethod.Negotiation:
      return "Price by negotiation";
    case SaleMethod.PriceWithheld:
      return "Price withheld";
    case SaleMethod.Auction:
      return price.auctionDate
        ? `Auction ${formatDateTimeNZ(price.auctionDate)}`
        : "Auction";
    case SaleMethod.Tender:
      return price.tenderClosesAt
        ? `Tender closes ${formatDateTimeNZ(price.tenderClosesAt)}`
        : "Tender";
    case SaleMethod.DeadlineSale:
      return price.deadlineAt
        ? `Deadline ${formatDateTimeNZ(price.deadlineAt)}`
        : "Deadline sale";
    case SaleMethod.AskingPrice:
    default:
      return formatNZD(price.amount);
  }
}

/** Area unit labels for display, e.g. "120 m²". */
const AREA_UNIT_LABELS: Record<string, string> = {
  sqm: "m²",
  hectare: "ha",
  sqft: "sq ft",
  sqyd: "sq yd",
};

/** e.g. "120 m²". */
export function formatArea(area: { value: number; unit: string }): string {
  const unit = AREA_UNIT_LABELS[area.unit] ?? area.unit;
  return `${area.value.toLocaleString("en-NZ")} ${unit}`;
}

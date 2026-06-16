import Link from "next/link";
import { Bath, BedDouble, Car, MapPin } from "lucide-react";
import { OptimizedImage } from "@/components/common/optimized-image";
import {
  LISTING_TYPE_LABELS,
  PROPERTY_TYPE_LABELS,
} from "@/features/listings/listing-labels";
import type { ListingType, PropertyType } from "@/lib/enums";

/**
 * Compact payload the assistant's `searchListings` / `getListingDetails` tools
 * return (a public-safe subset of a Listing — no ownerId). Kept loose because it
 * arrives over the wire as the tool's `output` (typed `unknown` client-side).
 */
export type AssistantListing = {
  id: string;
  title: string;
  listingType: string; // enum value OR already-formatted label
  propertyType: string;
  price: string; // already a display label, e.g. "$1.65M" / "$650/wk"
  bedrooms?: number | null;
  bathrooms?: number | null;
  carSpaces?: number | null;
  suburb: string;
  city: string;
  region?: string;
  url: string; // "/properties/<id>"
  isFavorite?: boolean;
  coverImage?: string | null; // raw stored URL — OptimizedImage normalizes it
};

/** Look up a human label, tolerating an already-formatted string. */
const typeLabel = (v: string) => LISTING_TYPE_LABELS[v as ListingType] ?? v;
const propLabel = (v: string) => PROPERTY_TYPE_LABELS[v as PropertyType] ?? v;

/**
 * A small listing card sized for the chat panel — echoes the look of the grid
 * `ListingCard` (tokens, badge, specs row) but more compact, and is a single
 * link to the listing's detail page.
 */
export function AssistantListingCard({ listing }: { listing: AssistantListing }) {
  return (
    <Link
      href={listing.url}
      className="group block w-full overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-soft outline-none transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <div className="relative">
        {listing.coverImage ? (
          <OptimizedImage
            src={listing.coverImage}
            alt={listing.title}
            aspect="aspect-[16/10]"
            sizes="356px"
            rounded={false}
            className="transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex aspect-[16/10] items-center justify-center bg-muted text-xs text-muted-foreground">
            No photo
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-md bg-brand/90 px-2 py-0.5 text-[11px] font-medium text-brand-foreground backdrop-blur">
          {typeLabel(listing.listingType)}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold">{listing.price}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {propLabel(listing.propertyType)}
          </span>
        </div>

        <h3 className="line-clamp-1 text-sm font-medium">{listing.title}</h3>

        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          <span className="line-clamp-1">
            {listing.suburb}, {listing.city}
          </span>
        </p>

        {(listing.bedrooms != null ||
          listing.bathrooms != null ||
          listing.carSpaces != null) && (
          <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {listing.bedrooms != null && (
              <span className="flex items-center gap-1">
                <BedDouble className="size-3.5" /> {listing.bedrooms}
              </span>
            )}
            {listing.bathrooms != null && (
              <span className="flex items-center gap-1">
                <Bath className="size-3.5" /> {listing.bathrooms}
              </span>
            )}
            {listing.carSpaces != null && (
              <span className="flex items-center gap-1">
                <Car className="size-3.5" /> {listing.carSpaces}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

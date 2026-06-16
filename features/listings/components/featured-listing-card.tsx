import { Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import { imageSrc } from "@/lib/utils";
import type { Listing } from "@/features/listings/listings.repository";
import {
  LISTING_TYPE_LABELS,
  formatArea,
  formatSalePrice,
} from "@/features/listings/listing-labels";
import { FavoriteButton } from "./favorite-button";

/**
 * Editorial "Featured" property card: a tall rounded image with a single pill
 * badge, then below it a display-serif title + price, an accent-coloured
 * location, and an uppercase specs row (the area is highlighted). Borderless and
 * showcase-oriented — distinct from the bordered, action-rich `ListingCard` used
 * in the browse/dashboard grids.
 */
export function FeaturedListingCard({ listing }: { listing: Listing }) {
  const cover = listing.media?.images?.[0];

  // An upcoming open home gets a stand-out dark pill; otherwise show the type.
  const hasOpenHome = (listing.openHomes ?? []).some((o) => o.start);

  // Specs shown as an uppercase, dot-separated row; the area is accented.
  const specs: { text: string; accent?: boolean }[] = [];
  if (listing.config?.bedrooms != null)
    specs.push({ text: `${listing.config.bedrooms} Bed` });
  if (listing.config?.bathrooms != null)
    specs.push({ text: `${listing.config.bathrooms} Bath` });
  if (listing.area) specs.push({ text: formatArea(listing.area), accent: true });

  return (
    <div className="group relative flex flex-col">
      {/* Favorite — sibling of the link so it isn't a <button> nested in an <a>. */}
      <div className="absolute top-3 left-3 z-10">
        <FavoriteButton
          listingId={listing.id}
          label={`Save ${listing.title} to wishlist`}
        />
      </div>

      <Link href={`/properties/${listing.id}`} className="flex flex-col">
        <div className="bg-muted relative aspect-4/5 overflow-hidden rounded-2xl">
          {cover ? (
            <Image
              src={imageSrc(cover)}
              alt={listing.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
            />
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-xs tracking-wide uppercase">
              No photo
            </div>
          )}

          {/* Single pill badge, top-right. */}
          <span
            className={
              hasOpenHome
                ? "bg-brand/90 text-brand-foreground absolute top-3 right-3 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide uppercase backdrop-blur"
                : "bg-card/95 text-foreground absolute top-3 right-3 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide uppercase shadow-sm backdrop-blur"
            }
          >
            {hasOpenHome ? "Open home" : LISTING_TYPE_LABELS[listing.listingType]}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display group-hover:text-primary line-clamp-1 min-w-0 text-lg font-semibold tracking-tight transition-colors">
              {listing.title}
            </h3>
            <span className="shrink-0 font-semibold tracking-tight">
              {formatSalePrice(listing.price)}
            </span>
          </div>

          <p className="text-primary text-sm">
            {listing.location.locality}, {listing.location.city}
          </p>

          {specs.length > 0 && (
            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 text-[11px] font-medium tracking-wide uppercase">
              {specs.map((spec, i) => (
                <Fragment key={spec.text}>
                  {i > 0 && <span className="text-border">·</span>}
                  <span className={spec.accent ? "text-primary" : undefined}>
                    {spec.text}
                  </span>
                </Fragment>
              ))}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}

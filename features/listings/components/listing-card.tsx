import Link from "next/link";
import Image from "next/image";
import { Bath, BedDouble, Car, LandPlot, MapPin, Maximize } from "lucide-react";
import { SaleMethod } from "@/lib/enums";
import { imageSrc } from "@/lib/utils";
import type { Listing } from "@/features/listings/listings.repository";
import {
  LISTING_TYPE_LABELS,
  PROPERTY_TYPE_LABELS,
  formatArea,
  formatDateTimeNZ,
  formatSalePrice,
} from "@/features/listings/listing-labels";
import { FavoriteButton } from "./favorite-button";
import { EditListingButton } from "./edit-listing-button";
import { ShareButton } from "@/components/common/share-button";
import { ContactOwnerDialog } from "@/features/leads/components/contact-owner-dialog";

/**
 * Compact property card used in the public grid and owner dashboard.
 *
 * When `currentUserId` is supplied and matches the listing's owner, the card is
 * marked as the viewer's own: a subtle "Your listing" badge and a quick-edit
 * shortcut appear (used in the public search grid so owners can spot and edit
 * their own properties inline). On other people's cards a compact "Enquire"
 * button opens the contact dialog inline — no need to open the detail page.
 */
export function ListingCard({
  listing,
  currentUserId,
  currentUserName,
  currentUserEmail,
}: {
  listing: Listing;
  currentUserId?: string;
  currentUserName?: string;
  currentUserEmail?: string;
}) {
  const cover = listing.media?.images?.[0];
  const isOwn = currentUserId != null && listing.ownerId === currentUserId;

  // Earliest scheduled open-home session, if any (drives the card badge).
  const nextOpenHome = (listing.openHomes ?? [])
    .filter((o) => o.start)
    .sort((a, b) => a.start.localeCompare(b.start))[0];

  // Auction marker — the price line already shows the date (via formatSalePrice),
  // so this is just a scan-time flag on the image.
  const isAuction =
    listing.price.method === SaleMethod.Auction && !!listing.price.auctionDate;

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md">
      <Link
        href={`/properties/${listing.id}`}
        className="flex flex-1 flex-col"
      >
        <div className="relative aspect-4/3 bg-muted">
        {cover ? (
          <Image
            src={imageSrc(cover)}
            alt={listing.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, 320px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No photo
          </div>
        )}
        {/* Owners see a "Your listing" badge in place of the for-sale/rent tag. */}
        <span
          className={
            isOwn
              ? "absolute left-2 top-2 rounded-md bg-foreground/80 px-2 py-0.5 text-xs font-medium text-background backdrop-blur"
              : "absolute left-2 top-2 rounded-md bg-brand/90 px-2 py-0.5 text-xs font-medium text-brand-foreground"
          }
        >
          {isOwn ? "Your listing" : LISTING_TYPE_LABELS[listing.listingType]}
        </span>
        <div className="absolute right-2 top-2 flex items-center gap-1.5">
          <ShareButton
            url={`/properties/${listing.id}`}
            title={listing.title}
            text={`Check out this property on Trade House: ${listing.title}`}
            label={`Share ${listing.title}`}
          />
          {isOwn && (
            <EditListingButton
              listing={listing}
              className="bg-background/90 text-foreground grid size-9 place-items-center rounded-full shadow-sm backdrop-blur transition-transform hover:scale-105 active:scale-95"
            />
          )}
          <FavoriteButton
            listingId={listing.id}
            label={`Save ${listing.title} to wishlist`}
          />
        </div>
        {(isAuction || nextOpenHome) && (
          <div className="absolute bottom-2 left-2 flex flex-col items-start gap-1">
            {isAuction && (
              <span className="rounded-md bg-amber-600/95 px-2 py-0.5 text-xs font-medium text-white">
                Auction
              </span>
            )}
            {nextOpenHome && (
              <span className="rounded-md bg-emerald-600/95 px-2 py-0.5 text-xs font-medium text-white">
                Open {formatDateTimeNZ(nextOpenHome.start)}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-lg font-semibold">
            {formatSalePrice(listing.price)}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {PROPERTY_TYPE_LABELS[listing.propertyType]}
          </span>
        </div>
        <h3 className="line-clamp-1 font-medium">{listing.title}</h3>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          <span className="line-clamp-1">
            {listing.location.locality}, {listing.location.city}
          </span>
        </p>
        <div className="mt-auto flex flex-wrap gap-3 pt-2 text-xs text-muted-foreground">
          {listing.config?.bedrooms != null && (
            <span className="flex items-center gap-1">
              <BedDouble className="size-3.5" /> {listing.config.bedrooms}
            </span>
          )}
          {listing.config?.bathrooms != null && (
            <span className="flex items-center gap-1">
              <Bath className="size-3.5" /> {listing.config.bathrooms}
            </span>
          )}
          {listing.config?.carSpaces != null && (
            <span className="flex items-center gap-1">
              <Car className="size-3.5" /> {listing.config.carSpaces}
            </span>
          )}
          {listing.area && (
            <span className="flex items-center gap-1">
              <Maximize className="size-3.5" /> {formatArea(listing.area)}
            </span>
          )}
          {listing.landArea && (
            <span className="flex items-center gap-1">
              <LandPlot className="size-3.5" /> {formatArea(listing.landArea)}
            </span>
          )}
        </div>
        </div>
      </Link>

      {/* Inline enquiry — sits OUTSIDE the navigable <Link> so opening the
          dialog never triggers navigation. Only on other people's listings. */}
      {!isOwn && (
        <div className="-mt-2 px-4 pb-4">
          <ContactOwnerDialog
            listingId={listing.id}
            listingTitle={listing.title}
            prefillName={currentUserName ?? ""}
            prefillEmail={currentUserEmail ?? ""}
            triggerLabel="Enquire"
            triggerVariant="outline"
            triggerSize="sm"
          />
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bath,
  BedDouble,
  Calendar,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  ImageOff,
  LandPlot,
  MapPin,
  Maximize,
  Phone,
  Sofa,
} from "lucide-react";
import { LeadKind } from "@/lib/enums";
import { PropertyGallery } from "@/features/listings/components/property-gallery";
import { useSession } from "@/lib/auth-client";
import { useApi } from "@/hooks/use-api";
import { useFavoritesStore } from "@/stores/favorites-store-provider";
import type { Listing } from "@/features/listings/listings.repository";
import { BackButton } from "@/components/common/back-button";
import { ShareButton } from "@/components/common/share-button";
import { Button } from "@/components/ui/button";
import { ContactOwnerDialog } from "@/features/leads/components/contact-owner-dialog";
import { FavoriteButton } from "@/features/listings/components/favorite-button";
import { AskAssistantButton } from "@/features/assistant/components/ask-assistant-button";
import { AssistantContextSetter } from "@/features/assistant/components/assistant-context-setter";
import { AuctionDetails } from "@/features/listings/components/auction-details";
import { AuctionBiddingPanel } from "@/features/auctions/components/auction-bidding-panel";
import { isAuctionListing } from "@/features/auctions/auction-window";
import {
  CATEGORY_LABELS,
  FURNISHING_LABELS,
  LISTING_TYPE_LABELS,
  PROPERTY_TYPE_LABELS,
  SALE_TYPE_LABELS,
  TITLE_TYPE_LABELS,
  formatArea,
  formatDateTimeNZ,
  formatPrice,
  formatSalePrice,
} from "@/features/listings/listing-labels";

/**
 * Property detail view. Fetches the listing from the public JSON API
 * (`GET /api/listings/:id`) on the client so it shows as a real network call,
 * with a skeleton while loading and a friendly not-found state on 404. The
 * owner check + contact prefill come from the client session.
 *
 * Layout: a 3-cell grid (header / price+actions / details). On mobile it
 * collapses to one column in that source order, so the price and contact CTA
 * sit right under the title — not buried below the description.
 */
export function PropertyDetailView({ listingId }: { listingId: string }) {
  const { data: listing, loading, status } = useApi<Listing>(
    `/api/listings/${listingId}`,
  );
  const { data: session } = useSession();
  // Owner phone is hidden until the viewer taps "Show number" (TradeMe-style).
  const [showPhone, setShowPhone] = useState(false);

  // Keep the heart in sync from the listing's own `isFavorite` flag (the GET
  // response carries it) — no separate favorites call.
  const seedFavorites = useFavoritesStore((s) => s.seed);
  useEffect(() => {
    if (listing?.isFavorite) seedFavorites([listing.id]);
  }, [listing, seedFavorites]);

  if (loading) return <PropertyDetailSkeleton />;

  if (!listing) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <BackButton
          label="Back to results"
          className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
        />
        <div className="border-border flex flex-col items-center gap-3 rounded-2xl border border-dashed p-16 text-center">
          <ImageOff className="text-muted-foreground size-8" />
          <p className="font-medium">
            {status === 404 ? "This listing isn't available" : "Couldn't load this listing"}
          </p>
          <p className="text-muted-foreground text-sm">
            It may have been removed or is no longer active.
          </p>
        </div>
      </div>
    );
  }

  const images = listing.media?.images ?? [];
  const viewer = session?.user;
  const isOwner = viewer?.id === listing.ownerId;
  const cfg = listing.config;
  const isAuction = isAuctionListing(listing.price);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      {/* Tell the assistant which listing is in focus, so "is this good value?"
          just works. Cleared automatically when the user navigates away. */}
      <AssistantContextSetter
        listingId={listing.id}
        listingTitle={listing.title}
        suburb={listing.location.locality}
        region={listing.location.state}
        isAuction={isAuction}
      />
      <nav
        aria-label="Breadcrumb"
        className="text-muted-foreground mb-4 flex items-center gap-1.5 text-sm"
      >
        <Link
          href="/properties"
          className="hover:text-foreground transition-colors"
        >
          Properties
        </Link>
        <ChevronRight aria-hidden className="size-4 opacity-60" />
        <span
          className="text-foreground truncate font-medium"
          aria-current="page"
        >
          {listing.title}
        </span>
      </nav>

      <PropertyGallery images={images} title={listing.title} />

      <div className="mt-6 grid gap-x-8 gap-y-6 lg:grid-cols-3">
        {/* Header: badges, title, address, key specs. */}
        <header className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-brand text-brand-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">
              {LISTING_TYPE_LABELS[listing.listingType]}
            </span>
            <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs">
              {PROPERTY_TYPE_LABELS[listing.propertyType]}
            </span>
            {listing.saleType && (
              <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs">
                {SALE_TYPE_LABELS[listing.saleType]}
              </span>
            )}
            {listing.isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                <CheckCircle2 className="size-3" /> Verified
              </span>
            )}
          </div>

          <h1 className="font-display mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            {listing.title}
          </h1>
          <p className="text-muted-foreground mt-2 flex items-start gap-1.5 text-sm sm:text-base">
            <MapPin className="mt-0.5 size-4 shrink-0" />
            <span>
              {listing.location.address}, {listing.location.locality},{" "}
              {listing.location.city}, {listing.location.state}{" "}
              {listing.location.pincode}
            </span>
          </p>

          {/* Key specs */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {cfg?.bedrooms != null && (
              <SpecCard
                icon={BedDouble}
                value={String(cfg.bedrooms)}
                label={cfg.bedrooms === 1 ? "Bedroom" : "Bedrooms"}
              />
            )}
            {cfg?.bathrooms != null && (
              <SpecCard
                icon={Bath}
                value={String(cfg.bathrooms)}
                label={cfg.bathrooms === 1 ? "Bathroom" : "Bathrooms"}
              />
            )}
            {cfg?.carSpaces != null && (
              <SpecCard icon={Car} value={String(cfg.carSpaces)} label="Parking" />
            )}
            {listing.area && (
              <SpecCard
                icon={Maximize}
                value={formatArea(listing.area)}
                label="Floor area"
              />
            )}
            {listing.landArea && (
              <SpecCard
                icon={LandPlot}
                value={formatArea(listing.landArea)}
                label="Land area"
              />
            )}
            {cfg?.furnishing && (
              <SpecCard
                icon={Sofa}
                value={FURNISHING_LABELS[cfg.furnishing]}
                label="Furnishing"
              />
            )}
          </div>
        </header>

        {/* Price + actions. Spans both rows on desktop (sticky); on mobile it
            sits right after the header. */}
        <aside className="space-y-6 lg:col-span-1 lg:row-span-2">
          {/* Live auction bidding — register when not live, bid when live.
              Renders for auction listings only. */}
          {isAuction && (
            <AuctionBiddingPanel
              listingId={listing.id}
              listingTitle={listing.title}
            />
          )}
          <div className="border-border bg-card shadow-soft rounded-2xl border p-6 lg:sticky lg:top-20">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-display text-3xl font-bold tracking-tight">
                  {formatSalePrice(listing.price)}
                </p>
                {listing.price.deposit ? (
                  <p className="text-muted-foreground mt-1 text-sm">
                    Bond:{" "}
                    {formatPrice({
                      amount: listing.price.deposit,
                      type: listing.price.type,
                    })}
                  </p>
                ) : null}
                {listing.price.negotiable && (
                  <p className="mt-0.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Negotiable
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <ShareButton
                  title={listing.title}
                  text={`Check out this property on Trade House: ${listing.title}`}
                  label={`Share ${listing.title}`}
                />
                <FavoriteButton
                  listingId={listing.id}
                  label={`Save ${listing.title} to wishlist`}
                />
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <ContactOwnerDialog
                listingId={listing.id}
                listingTitle={listing.title}
                isOwner={isOwner}
                prefillName={viewer?.name ?? ""}
                prefillEmail={viewer?.email ?? ""}
              />
              {!isOwner && (
                <ContactOwnerDialog
                  listingId={listing.id}
                  listingTitle={listing.title}
                  kind={LeadKind.Viewing}
                  openHomes={listing.openHomes ?? []}
                  prefillName={viewer?.name ?? ""}
                  prefillEmail={viewer?.email ?? ""}
                  triggerVariant="outline"
                />
              )}
              {/* Phone reveal — only when the owner supplied a contact number. */}
              {!isOwner && listing.contactPhone && (
                showPhone ? (
                  <a
                    href={`tel:${listing.contactPhone}`}
                    className="border-border hover:bg-muted flex h-9 w-full items-center justify-center gap-1.5 rounded-md border text-sm font-medium transition-colors"
                  >
                    <Phone className="size-4" /> {listing.contactPhone}
                  </a>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={() => setShowPhone(true)}
                  >
                    <Phone className="size-4" /> Show number
                  </Button>
                )
              )}
              {/* AI helper — grounded in this exact listing + its suburb. The
                  context mirrors AssistantContextSetter (incl. isAuction) so the
                  assistant keeps the right persona; an explicit context replaces
                  the ambient one, so it must carry every field. */}
              <AskAssistantButton
                prompt={
                  isAuction
                    ? "Walk me through this auction — the timing, how bidding works, and what I should check before I bid."
                    : "Tell me about this property — is it good value, and what's the local area like?"
                }
                context={{
                  listingId: listing.id,
                  listingTitle: listing.title,
                  suburb: listing.location.locality,
                  region: listing.location.state,
                  isAuction,
                }}
                variant="ghost"
                size="lg"
                className="w-full"
              >
                {isAuction ? "Ask AI about this auction" : "Ask AI about this property"}
              </AskAssistantButton>
            </div>

            <div className="border-border text-muted-foreground mt-5 flex items-center gap-1.5 border-t pt-4 text-xs">
              <Calendar className="size-3.5" />
              Listed {new Date(listing.createdAt).toLocaleDateString("en-NZ")}
            </div>
          </div>
        </aside>

        {/* Details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Auction — date, live countdown, unconditional-sale notice. Renders
              itself to null for non-auction listings. */}
          <AuctionDetails
            price={listing.price}
            title={listing.title}
            address={listing.location.address}
          />

          {/* Open homes */}
          {listing.openHomes && listing.openHomes.length > 0 && (
            <section className="border-border bg-card shadow-soft rounded-2xl border p-5 sm:p-6">
              <h2 className="font-display text-lg font-semibold">Open homes</h2>
              <ul className="mt-4 space-y-2">
                {listing.openHomes.map((oh, i) => (
                  <li
                    key={i}
                    className="border-border bg-background flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm"
                  >
                    <span className="bg-primary/10 text-primary grid size-8 shrink-0 place-items-center rounded-lg">
                      <Clock className="size-4" />
                    </span>
                    <span className="font-medium">
                      {formatDateTimeNZ(oh.start)} – {formatDateTimeNZ(oh.end)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* About */}
          <section className="border-border bg-card shadow-soft rounded-2xl border p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold">
              About this property
            </h2>
            <p className="text-muted-foreground mt-2 leading-relaxed whitespace-pre-line">
              {listing.description}
            </p>
          </section>

          {/* Key facts */}
          <section className="border-border bg-card shadow-soft rounded-2xl border p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold">Property facts</h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
              <Fact label="Category" value={CATEGORY_LABELS[listing.category]} />
              {listing.rateableValue != null && (
                <Fact
                  label="Rateable value"
                  value={`$${listing.rateableValue.toLocaleString("en-NZ")}`}
                />
              )}
              {listing.titleType && (
                <Fact label="Title" value={TITLE_TYPE_LABELS[listing.titleType]} />
              )}
              {cfg?.yearBuilt != null && (
                <Fact label="Year built" value={String(cfg.yearBuilt)} />
              )}
              {cfg?.garageSpaces != null && (
                <Fact label="Garage" value={String(cfg.garageSpaces)} />
              )}
            </dl>
          </section>

          {/* Amenities */}
          {listing.amenities.length > 0 && (
            <section className="border-border bg-card shadow-soft rounded-2xl border p-5 sm:p-6">
              <h2 className="font-display text-lg font-semibold">Amenities</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {listing.amenities.map((a) => (
                  <span
                    key={a}
                    className="border-border bg-background text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm"
                  >
                    <CheckCircle2 className="text-primary size-3.5" /> {a}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function SpecCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Bath;
  value: string;
  label: string;
}) {
  return (
    <div className="border-border bg-card shadow-xs flex items-center gap-3 rounded-xl border px-4 py-3">
      <span className="bg-primary/10 text-primary grid size-9 shrink-0 place-items-center rounded-lg">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate font-semibold">{value}</p>
        <p className="text-muted-foreground text-xs">{label}</p>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

/** Loading placeholder mirroring the detail layout (gallery + two columns). */
function PropertyDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="bg-muted mb-4 h-4 w-28 animate-pulse rounded" />
      <div className="bg-muted h-72 w-full animate-pulse rounded-2xl sm:h-[28rem]" />
      <div className="mt-6 grid gap-x-8 gap-y-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex gap-2">
            <div className="bg-muted h-5 w-16 animate-pulse rounded-full" />
            <div className="bg-muted h-5 w-20 animate-pulse rounded-full" />
          </div>
          <div className="bg-muted h-8 w-2/3 animate-pulse rounded" />
          <div className="bg-muted h-4 w-1/2 animate-pulse rounded" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-muted h-16 animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
        <aside className="lg:col-span-1 lg:row-span-2">
          <div className="border-border bg-card shadow-soft space-y-4 rounded-2xl border p-6">
            <div className="bg-muted h-8 w-32 animate-pulse rounded" />
            <div className="bg-muted h-10 w-full animate-pulse rounded" />
            <div className="bg-muted h-10 w-full animate-pulse rounded" />
            <div className="bg-muted h-3 w-40 animate-pulse rounded" />
          </div>
        </aside>
        <div className="space-y-4 lg:col-span-2">
          <div className="bg-muted h-32 w-full animate-pulse rounded-2xl" />
          <div className="bg-muted h-40 w-full animate-pulse rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

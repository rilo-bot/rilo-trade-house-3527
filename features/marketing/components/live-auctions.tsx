"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Bath,
  BedDouble,
  Car,
  Gavel,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/common/reveal";
import { RegisterToBidDialog } from "@/features/auctions/components/register-to-bid-dialog";
import { formatNZD, formatDateTimeNZ } from "@/features/listings/listing-labels";
import {
  AUCTION_LIVE_MS,
  nzWallClockToInstant,
  toNzWallClock,
} from "@/features/auctions/auction-window";
import { imageSrc } from "@/lib/utils";
import type { Listing } from "@/features/listings/listings.repository";
import type { AuctionState } from "@/features/auctions/bidding";

const POLL_LISTINGS_MS = 20_000;
const POLL_BIDS_MS = 5_000;
const MAX_CARDS = 4;

// ─── Per-second clock ──────────────────────────────────────────────────────────
function useNowSecond(): number | null {
  const sec = useSyncExternalStore(
    (cb) => {
      const id = setInterval(cb, 1000);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / 1000),
    () => null,
  );
  return sec === null ? null : sec * 1000;
}

// ─── Countdown display ─────────────────────────────────────────────────────────
function CountdownParts({
  targetMs,
  nowMs,
  label,
}: {
  targetMs: number;
  nowMs: number | null;
  label: string;
}) {
  const remaining = nowMs === null ? null : Math.max(0, targetMs - nowMs);
  const parts =
    remaining === null
      ? null
      : {
          hrs: Math.floor(remaining / 3_600_000),
          min: Math.floor((remaining % 3_600_000) / 60_000),
          sec: Math.floor((remaining % 60_000) / 1000),
        };

  return (
    <div className="flex flex-col gap-1">
      <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
        {label}
      </p>
      <div className="flex items-center gap-1">
        {(["hrs", "min", "sec"] as const).map((unit, i) => (
          <span key={unit} className="flex items-center gap-1">
            {i > 0 && (
              <span className="text-muted-foreground font-bold text-sm mb-0.5">:</span>
            )}
            <span className="bg-primary/10 text-primary font-display rounded px-1.5 py-0.5 text-base font-bold tabular-nums min-w-[2.2ch] text-center">
              {parts ? String(parts[unit]).padStart(2, "0") : "--"}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Single auction card ────────────────────────────────────────────────────────
function AuctionCard({
  listing,
  nowMs,
}: {
  listing: Listing;
  nowMs: number | null;
}) {
  const [auctionState, setAuctionState] = useState<AuctionState | null>(null);
  const [tick, setTick] = useState(0);

  // Poll bids every few seconds while the card is mounted.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), POLL_BIDS_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/listings/${listing.id}/bids`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        if (!active) return;
        if (res.ok && json?.data) setAuctionState(json.data as AuctionState);
      } catch {
        // Keep last good snapshot; next tick retries.
      }
    })();
    return () => {
      active = false;
    };
  }, [listing.id, tick]);

  const cover = listing.media?.images?.[0];
  const auctionDate = listing.price.auctionDate!;
  const startMs = nzWallClockToInstant(auctionDate);
  const endMs = startMs + AUCTION_LIVE_MS;
  const isLive = nowMs !== null && nowMs >= startMs && nowMs < endMs;
  const isUpcoming = nowMs !== null && nowMs < startMs;

  const highBid = auctionState?.currentBid ?? null;
  const bidCount = auctionState?.bidCount ?? 0;
  const registeredBidders = auctionState?.registeredBidders ?? 0;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md">
      {/* Image */}
      <Link href={`/properties/${listing.id}`} className="relative block aspect-[4/3] bg-muted">
        {cover ? (
          <Image
            src={imageSrc(cover)}
            alt={listing.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No photo
          </div>
        )}

        {/* Phase badge */}
        {isLive ? (
          <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded-md bg-red-600 px-2 py-1 text-[11px] font-semibold text-white shadow">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-300" />
              <span className="relative inline-flex size-1.5 rounded-full bg-white" />
            </span>
            LIVE
          </span>
        ) : (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-amber-600/95 px-2 py-1 text-[11px] font-semibold text-white shadow">
            <Gavel className="size-3" />
            Auction
          </span>
        )}

        {/* Countdown overlay */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-3 pt-8">
          <CountdownParts
            targetMs={isLive ? endMs : startMs}
            nowMs={nowMs}
            label={isLive ? "Time remaining" : "Starts in"}
          />
        </div>
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="line-clamp-1 font-semibold leading-snug">{listing.title}</h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="line-clamp-1">
              {listing.location.locality}, {listing.location.city}
            </span>
          </p>
        </div>

        {/* Specs */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {listing.config?.bedrooms != null && (
            <span className="flex items-center gap-1">
              <BedDouble className="size-3.5" />
              {listing.config.bedrooms} bed
            </span>
          )}
          {listing.config?.bathrooms != null && (
            <span className="flex items-center gap-1">
              <Bath className="size-3.5" />
              {listing.config.bathrooms} bath
            </span>
          )}
          {listing.config?.carSpaces != null && (
            <span className="flex items-center gap-1">
              <Car className="size-3.5" />
              {listing.config.carSpaces} park
            </span>
          )}
        </div>

        {/* Bid row */}
        <div className="flex items-end justify-between gap-2 rounded-xl bg-accent/60 px-3 py-2.5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {highBid !== null ? "Live high bid" : "Starting bid"}
            </p>
            <p className="font-display text-xl font-bold tracking-tight text-foreground">
              {highBid !== null
                ? formatNZD(highBid)
                : listing.price.priceGuide
                  ? formatNZD(listing.price.priceGuide)
                  : listing.price.amount > 0
                    ? formatNZD(listing.price.amount)
                    : "POA"}
            </p>
          </div>
          <div className="text-right text-[11px] text-muted-foreground">
            {bidCount > 0 && (
              <p className="flex items-center justify-end gap-0.5 font-medium">
                <TrendingUp className="size-3" />
                {bidCount} {bidCount === 1 ? "bid" : "bids"}
              </p>
            )}
            {registeredBidders > 0 && (
              <p>{registeredBidders} registered</p>
            )}
          </div>
        </div>

        {/* Auction date label */}
        <p className="text-[11px] text-muted-foreground">
          {isUpcoming
            ? `Auction: ${formatDateTimeNZ(auctionDate)}`
            : isLive
              ? "Bidding is open now"
              : `Closed: ${formatDateTimeNZ(auctionDate)}`}
        </p>

        {/* CTA buttons */}
        <div className="mt-auto flex gap-2 pt-1">
          {isLive ? (
            <Button asChild size="sm" className="flex-1">
              <Link href={`/properties/${listing.id}`}>
                <Gavel className="size-3.5" />
                Join auction
              </Link>
            </Button>
          ) : (
            <RegisterToBidDialog
              listingId={listing.id}
              listingTitle={listing.title}
              triggerVariant="default"
              triggerSize="sm"
              triggerClassName="flex-1"
            />
          )}
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href={`/properties/${listing.id}`}>View</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function AuctionCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="aspect-[4/3] animate-pulse bg-muted" />
      <div className="flex flex-col gap-3 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-16 w-full animate-pulse rounded-xl bg-muted" />
        <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}

// ─── Main section ──────────────────────────────────────────────────────────────
export function LiveAuctions() {
  const nowMs = useNowSecond();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  // Refresh the auction listing set periodically so newly-live items appear.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), POLL_LISTINGS_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let active = true;
    const now = new Date();

    // Fetch: (1) live now, (2) upcoming — merge, dedupe, sort live first.
    const liveQs = new URLSearchParams({
      minAuctionDate: toNzWallClock(new Date(now.getTime() - AUCTION_LIVE_MS)),
      maxAuctionDate: toNzWallClock(now),
      sort: "auction_soonest",
      limit: String(MAX_CARDS),
    });
    const upcomingQs = new URLSearchParams({
      minAuctionDate: toNzWallClock(now),
      sort: "auction_soonest",
      limit: String(MAX_CARDS),
    });

    (async () => {
      try {
        const [liveRes, upRes] = await Promise.all([
          fetch(`/api/listings?${liveQs}`, { cache: "no-store" }),
          fetch(`/api/listings?${upcomingQs}`, { cache: "no-store" }),
        ]);
        const [liveJson, upJson] = await Promise.all([
          liveRes.json().catch(() => null),
          upRes.json().catch(() => null),
        ]);
        if (!active) return;

        const live: Listing[] = liveRes.ok ? (liveJson?.data?.items ?? []) : [];
        const upcoming: Listing[] = upRes.ok ? (upJson?.data?.items ?? []) : [];

        // Dedupe by id, live listings first, cap at MAX_CARDS.
        const seen = new Set<string>();
        const merged: Listing[] = [];
        for (const l of [...live, ...upcoming]) {
          if (!seen.has(l.id)) {
            seen.add(l.id);
            merged.push(l);
          }
          if (merged.length >= MAX_CARDS) break;
        }
        setListings(merged);
      } catch {
        // Keep last-good state; next poll retries.
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [tick]);

  // Nothing to show — don't render the section at all.
  if (!loading && listings.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-page px-4 py-12 sm:py-16">
      {/* Heading */}
      <Reveal>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            {/* Live dot + label */}
            <div className="flex items-center gap-2">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500/70" />
                <span className="relative inline-flex size-2.5 rounded-full bg-red-600" />
              </span>
              <span className="text-xs font-semibold tracking-widest text-red-600 uppercase">
                Live &amp; Upcoming
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Properties Under the Hammer
            </h2>
            <p className="text-muted-foreground max-w-xl text-pretty">
              Real-time countdowns, live high-bids, and instant registration —
              so you never miss an auction that matters.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="w-fit shrink-0">
            <Link href="/auctions">
              All auctions
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </Reveal>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: MAX_CARDS }).map((_, i) => (
            <AuctionCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {listings.map((listing, i) => (
            <Reveal key={listing.id} delay={(i % 4) * 80}>
              <AuctionCard listing={listing} nowMs={nowMs} />
            </Reveal>
          ))}
        </div>
      )}

      {/* Trust note */}
      {!loading && listings.length > 0 && (
        <Reveal delay={200}>
          <p className="text-muted-foreground mt-6 text-center text-xs">
            Indicative online bidding — the formal auction is run by the listing agent.{" "}
            <Link href="/guides" className="text-primary underline-offset-2 hover:underline">
              Learn how auctions work in NZ
            </Link>
          </p>
        </Reveal>
      )}
    </section>
  );
}

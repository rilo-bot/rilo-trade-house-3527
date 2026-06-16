"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/common/reveal";
import { ListingCard } from "@/features/listings/components/listing-card";
import type { Listing } from "@/features/listings/listings.repository";
import { AUCTION_LIVE_MS, toNzWallClock } from "@/features/auctions/auction-window";

const POLL_MS = 15_000;

/**
 * Client-side "Live now" + "Upcoming" auction grids that REFRESH THEMSELVES — so
 * a listing crosses from Upcoming to Live (and newly-published auctions appear)
 * without the visitor reloading the page.
 *
 * It re-queries the public listings API every ~15s using NZ wall-clock bounds
 * (the same basis `price.auctionDate` is stored in), so the live/upcoming split
 * stays correct on any host timezone. Server-rendered `initial*` data drives the
 * first paint (no flash, good for SEO); the poll takes over after mount.
 */
export function AuctionLists({
  initialLive,
  initialUpcoming,
  currentUserId,
}: {
  initialLive: Listing[];
  initialUpcoming: Listing[];
  currentUserId?: string;
}) {
  const [live, setLive] = useState<Listing[]>(initialLive);
  const [upcoming, setUpcoming] = useState<Listing[]>(initialUpcoming);
  const [tick, setTick] = useState(0);

  // Re-poll on an interval (setState in a timer callback, not synchronously in
  // the effect body).
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), POLL_MS);
    return () => clearInterval(id);
  }, []);

  // Fetch fresh live/upcoming whenever the tick advances. Inline async IIFE so
  // state is only set AFTER `await` (mirrors hooks/use-api.ts).
  useEffect(() => {
    if (tick === 0) return; // initial data already rendered from the server
    let active = true;
    (async () => {
      const now = new Date();
      const liveQs = new URLSearchParams({
        minAuctionDate: toNzWallClock(new Date(now.getTime() - AUCTION_LIVE_MS)),
        maxAuctionDate: toNzWallClock(now),
        sort: "auction_soonest",
        limit: "24",
      });
      const upcomingQs = new URLSearchParams({
        minAuctionDate: toNzWallClock(now),
        sort: "auction_soonest",
        limit: "24",
      });
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
        if (liveRes.ok && liveJson?.data?.items) setLive(liveJson.data.items);
        if (upRes.ok && upJson?.data?.items) setUpcoming(upJson.data.items);
      } catch {
        // Transient — keep the last good lists; the next tick retries.
      }
    })();
    return () => {
      active = false;
    };
  }, [tick]);

  return (
    <>
      {/* Live now */}
      <section className="mx-auto w-full max-w-page px-4 py-12 sm:py-16">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500/70" />
            <span className="relative inline-flex size-2.5 rounded-full bg-red-600" />
          </span>
          <h2 className="font-display text-2xl font-bold tracking-tight">
            Live now
          </h2>
          {live.length > 0 && (
            <span className="text-muted-foreground text-sm">({live.length})</span>
          )}
        </div>
        {live.length > 0 ? (
          <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2 sm:gap-y-10 lg:grid-cols-3">
            {live.map((listing, i) => (
              <Reveal key={listing.id} delay={(i % 3) * 80}>
                <ListingCard listing={listing} currentUserId={currentUserId} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="border-border text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
            No auctions are live right now. Browse what&apos;s coming up below.
          </div>
        )}
      </section>

      {/* Upcoming */}
      <section className="mx-auto w-full max-w-page px-4 pb-12 sm:pb-16">
        <h2 className="font-display mb-6 text-2xl font-bold tracking-tight">
          Upcoming auctions
        </h2>
        {upcoming.length > 0 ? (
          <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2 sm:gap-y-10 lg:grid-cols-3">
            {upcoming.map((listing, i) => (
              <Reveal key={listing.id} delay={(i % 3) * 80}>
                <ListingCard listing={listing} currentUserId={currentUserId} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="border-border rounded-xl border border-dashed p-12 text-center">
            <p className="text-foreground font-medium">
              No upcoming auctions scheduled
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Check back soon, or browse all properties for sale.
            </p>
            <div className="mt-4 flex justify-center">
              <Button asChild>
                <Link href="/buy">Browse properties</Link>
              </Button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { CheckCircle2, Gavel, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { formatNZD } from "@/features/listings/listing-labels";
import { RegisterToBidDialog } from "@/features/auctions/components/register-to-bid-dialog";
import type { AuctionState } from "@/features/auctions/bidding";

const POLL_MS = 4000;
const QUICK_ADDS = [5_000, 10_000, 25_000];

/**
 * Live online bidding panel for an auction listing (the right-column card on the
 * property page). Polls `GET /api/listings/:id/bids` every few seconds for the
 * current bid, history and timing, and adapts to the auction phase:
 *   • upcoming → "Register to bid" + a countdown to the start
 *   • live     → current bid, countdown to close, place-bid + quick adds,
 *                auto-bid, masked bid history, reserve-met indicator
 *   • ended    → the final result
 *
 * All bidding here is INDICATIVE / NON-BINDING — the formal auction is run by the
 * agent. That's stated in the panel.
 */
export function AuctionBiddingPanel({
  listingId,
  listingTitle,
}: {
  listingId: string;
  listingTitle: string;
}) {
  const [state, setState] = useState<AuctionState | null>(null);
  const [pollTick, setPollTick] = useState(0);
  const nowMs = useNowSecond();

  const [bidAmount, setBidAmount] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [autoOn, setAutoOn] = useState(false);
  const [autoMax, setAutoMax] = useState("");
  const [savingAuto, setSavingAuto] = useState(false);

  // Keep the bid input synced to the latest minimum as the auction moves, but
  // don't clobber a custom/partial amount the user has typed.
  const lastMinRef = useRef<number | null>(null);
  const prevAutoRef = useRef<number | null>(null);

  // Re-fetch on demand (after a bid / registration) by bumping the poll tick.
  const reload = () => setPollTick((t) => t + 1);

  // Drive polling by bumping a tick on a timer — setState in a timer callback,
  // never synchronously in the effect body.
  useEffect(() => {
    const id = setInterval(() => setPollTick((t) => t + 1), POLL_MS);
    return () => clearInterval(id);
  }, []);

  // Fetch the snapshot whenever the listing or poll tick changes. Mirrors the
  // `useApi` pattern: an inline async IIFE, so state is only set AFTER `await`
  // (never synchronously in the effect body).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/listings/${listingId}/bids`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        if (!active) return;
        if (res.ok && json?.data) {
          setState(json.data as AuctionState);
        }
        // Non-ok / transient: keep the last good snapshot; the poll will retry.
      } catch {
        // Network blip — keep showing the last snapshot (or skeleton).
      }
    })();
    return () => {
      active = false;
    };
  }, [listingId, pollTick]);

  // Sync the bid input + auto-bid fields when the server snapshot changes.
  useEffect(() => {
    if (!state) return;
    const min = state.minNextBid;
    const prevMin = lastMinRef.current;
    setBidAmount((cur) => {
      // Only follow the floor up when the user was sitting ON the old floor —
      // never overwrite a custom or partially-typed amount on a poll tick.
      if (cur === "" || prevMin === null) return String(min);
      if (Number(cur) === prevMin) return String(min);
      return cur;
    });
    lastMinRef.current = min;

    // Reflect the server's auto-bid ceiling. Turn the toggle ON when one exists;
    // turn it OFF only when a previously-set ceiling was cleared (e.g. in another
    // tab) — never while the user is mid-setup (prev null → now null is a no-op).
    const auto = state.viewer.autoBidMax;
    const prevAuto = prevAutoRef.current;
    if (auto != null) {
      setAutoOn(true);
      setAutoMax((cur) => (cur === "" ? String(auto) : cur));
    } else if (prevAuto != null) {
      setAutoOn(false);
      setAutoMax("");
    }
    prevAutoRef.current = auto;
  }, [state]);

  // First load failed (transient) — the parent only mounts us for auctions, so
  // keep the skeleton (polling continues and recovers) rather than vanishing.
  if (!state) return <PanelSkeleton />;

  const { phase, viewer } = state;
  const canBid = phase === "live" && viewer.registered && !viewer.isOwner;

  const placeBid = async () => {
    setError(null);
    setPlacing(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/bids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(bidAmount) }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json?.error?.message || "Couldn't place your bid");
      }
      setState(json.data as AuctionState);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      reload();
    } finally {
      setPlacing(false);
    }
  };

  const saveAuto = async (maxAmount: number | null) => {
    setError(null);
    setSavingAuto(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/auto-bid`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxAmount }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json?.error?.message || "Couldn't update auto-bid");
      }
      setState(json.data as AuctionState);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSavingAuto(false);
    }
  };

  return (
    <div className="border-border bg-card shadow-soft overflow-hidden rounded-2xl border">
      {/* Header: phase + reserve indicator */}
      <div className="flex items-center justify-between gap-2 px-5 pt-5">
        <PhaseBadge phase={phase} />
        {state.hasReserve &&
          (state.reserveMet ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5" /> RESERVE MET
            </span>
          ) : (
            <span className="text-muted-foreground text-xs font-medium">
              Reserve not yet met
            </span>
          ))}
      </div>

      <div className="space-y-4 p-5">
        {/* Current bid + stats */}
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {state.currentBid != null ? "Current bid" : "Starting bid"}
          </p>
          <p className="font-display text-3xl font-bold tracking-tight">
            {formatNZD(state.currentBid ?? state.startingBid)}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {state.bidCount} {state.bidCount === 1 ? "bid" : "bids"} ·{" "}
            {state.watching} watching · {state.registeredBidders} registered
          </p>
        </div>

        {/* Countdown */}
        <Countdown
          phase={phase}
          targetMs={
            phase === "upcoming"
              ? new Date(state.startsAt).getTime()
              : new Date(state.endsAt).getTime()
          }
          nowMs={nowMs}
        />

        {error && (
          <div className="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm">
            {error}
          </div>
        )}

        {/* Bidding controls — only when live + registered + not the owner. */}
        {canBid ? (
          <div className="space-y-3">
            {viewer.isHighBidder && (
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                You&apos;re the highest bidder.
              </p>
            )}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                  $
                </span>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={bidAmount}
                  min={state.minNextBid}
                  step={state.increment}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="pl-6"
                  aria-label="Your bid amount"
                />
              </div>
              <Button onClick={placeBid} disabled={placing}>
                {placing ? <Loader2 className="size-4 animate-spin" /> : null}
                Place bid
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_ADDS.map((add) => (
                <Button
                  key={add}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setBidAmount(
                      String((Number(bidAmount) || state.minNextBid) + add),
                    )
                  }
                >
                  + {formatNZD(add)}
                </Button>
              ))}
            </div>

            {/* Auto-bid (proxy) */}
            <div className="border-border rounded-xl border p-3">
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={autoOn}
                  onCheckedChange={(c) => {
                    const on = c === true;
                    setAutoOn(on);
                    if (!on) void saveAuto(null);
                  }}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">Auto-bid for me</span> — we bid in
                  minimum steps up to your limit, so you never pay more than needed.
                </span>
              </label>
              {autoOn && (
                <div className="mt-3 flex gap-2">
                  <div className="relative flex-1">
                    <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                      $
                    </span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={autoMax}
                      min={state.minNextBid}
                      step={state.increment}
                      onChange={(e) => setAutoMax(e.target.value)}
                      placeholder="Maximum"
                      className="pl-6"
                      aria-label="Auto-bid maximum"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={savingAuto || !(Number(autoMax) > 0)}
                    onClick={() => void saveAuto(Number(autoMax))}
                  >
                    {savingAuto ? <Loader2 className="size-4 animate-spin" /> : null}
                    {viewer.autoBidMax != null ? "Update" : "Set"}
                  </Button>
                </div>
              )}
              {viewer.autoBidMax != null && (
                <p className="text-muted-foreground mt-2 text-xs">
                  Auto-bidding up to {formatNZD(viewer.autoBidMax)}.
                </p>
              )}
            </div>

            <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              Anti-sniping: a bid in the final {state.antiSnipingMinutes} minutes
              extends the auction by {state.antiSnipingMinutes} minutes.
            </p>
          </div>
        ) : (
          <BidGate
            state={state}
            listingId={listingId}
            listingTitle={listingTitle}
            onRegistered={reload}
          />
        )}

        {/* Bid history */}
        {state.recentBids.length > 0 && (
          <ul className="border-border divide-border divide-y border-t pt-2">
            {state.recentBids.map((b, i) => (
              <li
                key={`${b.at}-${i}`}
                className="flex items-center justify-between gap-2 py-2 text-sm"
              >
                <span className={cn("font-medium", b.you && "text-primary")}>
                  {b.you ? "You" : b.name}
                </span>
                <span className="font-semibold">{formatNZD(b.amount)}</span>
                <span className="text-muted-foreground w-16 shrink-0 text-right text-xs">
                  {nowMs ? relativeTime(b.at, nowMs) : ""}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* Trust / disclaimer */}
        <p className="text-muted-foreground border-border border-t pt-3 text-xs">
          {viewer.registered ? (
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              ✓ Verified to bid.{" "}
            </span>
          ) : null}
          Indicative online bidding — the formal auction is run by the listing
          agent under the vendor&apos;s terms. Not a binding offer.
        </p>
      </div>
    </div>
  );
}

function PhaseBadge({ phase }: { phase: AuctionState["phase"] }) {
  if (phase === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500/70" />
          <span className="relative inline-flex size-2 rounded-full bg-red-600" />
        </span>
        LIVE AUCTION
      </span>
    );
  }
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
      <Gavel className="size-3.5" />
      {phase === "upcoming" ? "Auction upcoming" : "Auction closed"}
    </span>
  );
}

/** What to show in place of bidding controls, by phase + viewer state. */
function BidGate({
  state,
  listingId,
  listingTitle,
  onRegistered,
}: {
  state: AuctionState;
  listingId: string;
  listingTitle: string;
  onRegistered: () => void;
}) {
  const { phase, viewer } = state;

  if (phase === "ended") {
    return (
      <p className="text-muted-foreground text-sm">
        Bidding has closed.{" "}
        {state.currentBid != null
          ? `Final bid ${formatNZD(state.currentBid)}${state.hasReserve ? (state.reserveMet ? " — reserve met." : " — reserve not met.") : "."}`
          : "No bids were placed."}
      </p>
    );
  }

  if (viewer.isOwner) {
    return (
      <p className="text-muted-foreground text-sm">
        You&apos;re the vendor on this auction — bidding is disabled.
      </p>
    );
  }

  if (!viewer.signedIn) {
    return (
      <div className="space-y-2">
        <Button asChild className="w-full">
          <Link href="/auth/sign-in">Sign in to bid</Link>
        </Button>
        <p className="text-muted-foreground text-center text-xs">
          You need an account to register and bid.
        </p>
      </div>
    );
  }

  // Signed in but not registered → register (works for upcoming + live).
  return (
    <div className="space-y-2">
      <RegisterToBidDialog
        listingId={listingId}
        listingTitle={listingTitle}
        onRegistered={onRegistered}
      />
      <p className="text-muted-foreground text-center text-xs">
        {phase === "live"
          ? "Register to start bidding — it's live now."
          : "Register now so you're ready when bidding opens."}
      </p>
    </div>
  );
}

function Countdown({
  phase,
  targetMs,
  nowMs,
}: {
  phase: AuctionState["phase"];
  targetMs: number;
  nowMs: number | null;
}) {
  if (phase === "ended") {
    return (
      <p className="text-muted-foreground text-sm font-medium">
        Auction closed
      </p>
    );
  }
  const remaining = nowMs === null ? null : Math.max(0, targetMs - nowMs);
  const label = phase === "upcoming" ? "Starts in" : "Time remaining";

  const parts =
    remaining === null
      ? null
      : {
          hrs: Math.floor(remaining / 3_600_000),
          min: Math.floor((remaining % 3_600_000) / 60_000),
          sec: Math.floor((remaining % 60_000) / 1000),
        };

  return (
    <div>
      <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {(["hrs", "min", "sec"] as const).map((unit) => (
          <div
            key={unit}
            className="border-border rounded-lg border py-2 text-center"
          >
            <span className="font-display block text-xl font-bold tabular-nums">
              {parts ? String(parts[unit]).padStart(2, "0") : "--"}
            </span>
            <span className="text-muted-foreground text-[10px] tracking-wide uppercase">
              {unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="border-border bg-card shadow-soft space-y-4 rounded-2xl border p-5">
      <div className="bg-muted h-4 w-24 animate-pulse rounded" />
      <div className="bg-muted h-9 w-40 animate-pulse rounded" />
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-muted h-14 animate-pulse rounded-lg" />
        ))}
      </div>
      <div className="bg-muted h-10 w-full animate-pulse rounded" />
    </div>
  );
}

/** Per-second clock via `useSyncExternalStore` — immediate on mount, `null` on
 *  the server (no hydration mismatch), stable within a second (no render loop).
 *  Returns milliseconds. Same idiom as hooks/use-media-query.ts. */
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

/** "just now" / "3 min ago" / "2 hr ago". */
function relativeTime(iso: string, nowMs: number): string {
  const diff = nowMs - new Date(iso).getTime();
  if (diff < 45_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

import { SaleMethod } from "@/lib/enums";

/**
 * Pure helpers for reasoning about an auction's timing. No React, no DB — safe
 * to import from server components, the repository layer, and client widgets.
 *
 * Auctions store a single `price.auctionDate` (local NZ ISO, no offset) and have
 * no explicit end time, so we treat an auction as "live" for a fixed window after
 * it starts. This mirrors the 1-hour assumption in `auction-details.tsx`.
 */

/** How long after its start time an auction is considered "live". */
export const AUCTION_LIVE_MS = 60 * 60 * 1000; // 1 hour

export type AuctionPhase = "upcoming" | "live" | "ended";

const NZ_TZ = "Pacific/Auckland";

/** Offset in minutes (e.g. 780 = +13h NZDT, 720 = +12h NZST) of Pacific/Auckland
 *  at a given UTC instant. */
function nzOffsetMinutes(utcMs: number): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: NZ_TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(
    dtf.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]),
  );
  const hour = p.hour === "24" ? "00" : p.hour; // some envs emit 24 at midnight
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(hour),
    Number(p.minute),
    Number(p.second),
  );
  return Math.round((asUtc - utcMs) / 60000);
}

/**
 * Interpret an offset-less local ISO string ("YYYY-MM-DDTHH:mm", how auction
 * dates are stored) as a Pacific/Auckland WALL-CLOCK time and return the absolute
 * UTC epoch (ms). This makes auction open/close instants correct on any host
 * timezone (prod is usually UTC), not just an NZ-local one. Strings that already
 * carry an offset/Z are parsed as-is; unparseable input returns NaN.
 */
export function nzWallClockToInstant(localIso: string): number {
  if (/[Z+]|[+-]\d\d:\d\d$/.test(localIso.slice(11))) {
    return new Date(localIso).getTime();
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(localIso);
  if (!m) return NaN;
  const [, Y, Mo, D, H, Mi] = m;
  const naive = Date.UTC(Number(Y), Number(Mo) - 1, Number(D), Number(H), Number(Mi));
  // Two passes settle the DST boundary: offset at the naive guess, then refine
  // at the corrected instant.
  let off = nzOffsetMinutes(naive);
  off = nzOffsetMinutes(naive - off * 60000);
  return naive - off * 60000;
}

/** Local "YYYY-MM-DDTHH:mm" (no offset), in the HOST timezone. Prefer
 *  `toNzWallClock` for anything compared against a stored `price.auctionDate`
 *  (those are NZ wall-clock) — on a non-NZ host the two won't line up. */
export function toLocalIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/**
 * An absolute instant formatted as Pacific/Auckland wall-clock "YYYY-MM-DDTHH:mm"
 * — the SAME shape and basis a `price.auctionDate` is stored in. Use this (not
 * `toLocalIso`) to build auction-date query bounds or to (re)write an auction
 * date, so comparisons are correct on any host timezone (prod is usually UTC).
 */
export function toNzWallClock(d: Date): string {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: NZ_TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const p = Object.fromEntries(dtf.formatToParts(d).map((x) => [x.type, x.value]));
  const hour = p.hour === "24" ? "00" : p.hour;
  return `${p.year}-${p.month}-${p.day}T${hour}:${p.minute}`;
}

/** Where an auction sits relative to `now`. */
export function auctionPhase(
  auctionDate: string,
  now: Date = new Date(),
): AuctionPhase {
  const start = nzWallClockToInstant(auctionDate);
  if (Number.isNaN(start)) return "upcoming";
  const t = now.getTime();
  if (t < start) return "upcoming";
  if (t < start + AUCTION_LIVE_MS) return "live";
  return "ended";
}

/** True when a listing's price marks it as an auction with a date. */
export function isAuctionListing(price: {
  method?: SaleMethod;
  auctionDate?: string;
}): boolean {
  return price.method === SaleMethod.Auction && !!price.auctionDate;
}

"use client";

import { CalendarPlus, Gavel, Info, MapPin, Radio, Tag } from "lucide-react";
import { SaleMethod } from "@/lib/enums";
import { Button } from "@/components/ui/button";
import { formatDateTimeNZ, formatNZD } from "@/features/listings/listing-labels";

/**
 * Auction-specific detail block on the property page. Renders only for auction
 * listings that carry a date. Surfaces the three things NZ auction buyers need:
 * when it is (with a live countdown), the legal reality that auctions sell
 * *unconditionally* (so finance + due diligence must be done beforehand), and a
 * one-tap "add to calendar". Pure presentation over data we already store —
 * `price.auctionDate` is an ISO date-time string (local NZ time, no offset).
 */

// Auctions don't have an explicit end time; assume a 1-hour window so the
// countdown can flip to "on now" / "ended" sensibly and the calendar event has
// a duration.
const AUCTION_DURATION_MS = 60 * 60 * 1000;

type AuctionDetailsProps = {
  price: {
    method?: SaleMethod;
    auctionDate?: string;
    priceGuide?: number;
    auctionVenue?: string;
    livestreamUrl?: string;
  };
  title: string;
  address: string;
};

export function AuctionDetails({ price, title, address }: AuctionDetailsProps) {
  if (price.method !== SaleMethod.Auction || !price.auctionDate) return null;

  const start = new Date(price.auctionDate);
  const startValid = !Number.isNaN(start.getTime());

  return (
    <section className="border-border bg-card shadow-soft rounded-2xl border p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="bg-primary/10 text-primary grid size-8 shrink-0 place-items-center rounded-lg">
          <Gavel className="size-4" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold">Auction</h2>
          {startValid && (
            <p className="text-muted-foreground text-sm">
              {formatDateTimeNZ(price.auctionDate)}
            </p>
          )}
        </div>
      </div>

      {/* The live countdown + phase live in the bidding panel (right column),
          which is authoritative (it honours anti-sniping extensions). */}

      {/* Vendor-supplied marketing details (all optional). */}
      {(price.priceGuide != null || price.auctionVenue) && (
        <dl className="mt-4 space-y-2 text-sm">
          {price.priceGuide != null && (
            <div className="flex items-center gap-2">
              <Tag className="text-muted-foreground size-4 shrink-0" />
              <dt className="text-muted-foreground">Price guide</dt>
              <dd className="font-medium">{formatNZD(price.priceGuide)}</dd>
            </div>
          )}
          {price.auctionVenue && (
            <div className="flex items-center gap-2">
              <MapPin className="text-muted-foreground size-4 shrink-0" />
              <dt className="text-muted-foreground">Venue</dt>
              <dd className="font-medium">{price.auctionVenue}</dd>
            </div>
          )}
        </dl>
      )}

      <div className="border-border text-muted-foreground mt-4 flex items-start gap-2 rounded-xl border border-dashed px-3.5 py-3 text-sm">
        <Info className="text-primary mt-0.5 size-4 shrink-0" />
        <span>
          Properties sell <strong className="text-foreground">unconditionally</strong>{" "}
          at auction. Arrange finance and complete your due diligence (LIM,
          title, building report) before auction day.
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {price.livestreamUrl && (
          <Button asChild variant="outline">
            <a href={price.livestreamUrl} target="_blank" rel="noopener noreferrer">
              <Radio className="size-4" />
              Watch live
            </a>
          </Button>
        )}
        {startValid && (
          <Button
            type="button"
            variant="outline"
            onClick={() => downloadAuctionIcs({ title, address, start })}
          >
            <CalendarPlus className="size-4" />
            Add to calendar
          </Button>
        )}
      </div>
    </section>
  );
}

/** Build a one-event .ics and trigger a download. No deps; floating local time
 *  so the calendar shows the auction at the time it was entered. */
function downloadAuctionIcs({
  title,
  address,
  start,
}: {
  title: string;
  address: string;
  start: Date;
}): void {
  const end = new Date(start.getTime() + AUCTION_DURATION_MS);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Trade House//Auction//EN",
    "BEGIN:VEVENT",
    `UID:${toIcsStamp(start)}-auction@tradehouse`,
    `DTSTAMP:${toIcsStamp(new Date())}`,
    `DTSTART:${toIcsStamp(start)}`,
    `DTEND:${toIcsStamp(end)}`,
    `SUMMARY:${icsEscape(`Auction: ${title}`)}`,
    `LOCATION:${icsEscape(address)}`,
    `DESCRIPTION:${icsEscape("Property auction. Sells unconditionally — complete due diligence beforehand.")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "auction.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Local date-time as ICS basic format, e.g. 20260612T130000 (floating time). */
function toIcsStamp(d: Date): string {
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

/** Escape ICS-special characters in free-text fields. */
function icsEscape(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

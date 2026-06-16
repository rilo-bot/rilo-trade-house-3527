"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Building2,
  CalendarClock,
  MapPin,
  MessageSquareText,
  Search,
} from "lucide-react";
import { LeadKind, ListingStatus } from "@/lib/enums";
import type { Lead } from "@/features/leads/leads.repository";
import type { ListingSummary } from "@/features/listings/listings.repository";
import {
  SEEKER_LEAD_STATUS_BADGE,
  SEEKER_LEAD_STATUS_LABELS,
  seekerBucketFor,
} from "@/features/leads/lead-labels";
import { imageSrc } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ALL = "all";

const BUCKET_TABS: { value: string; label: string }[] = [
  { value: ALL, label: "All" },
  { value: "awaiting", label: "Awaiting reply" },
  { value: "responded", label: "Owner responded" },
  { value: "closed", label: "Closed" },
];

/**
 * The seeker's enquiries, filtered by a seeker-facing status bucket. Each card
 * shows the listing thumbnail, what the seeker sent, and links to the property
 * (only while it's still active — sold/removed listings render un-clickable so
 * we never link to a dead detail page).
 */
export function EnquiriesList({
  initial,
  summaries,
}: {
  initial: Lead[];
  summaries: Record<string, ListingSummary>;
}) {
  const [filter, setFilter] = useState<string>(ALL);

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      [ALL]: initial.length,
      awaiting: 0,
      responded: 0,
      closed: 0,
    };
    for (const l of initial) c[seekerBucketFor(l.status)]++;
    return c;
  }, [initial]);

  const visible =
    filter === ALL
      ? initial
      : initial.filter((l) => seekerBucketFor(l.status) === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {BUCKET_TABS.filter(
          (t) => t.value === ALL || (counts[t.value] ?? 0) > 0,
        ).map((t) => {
          const active = filter === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setFilter(t.value)}
              aria-pressed={active}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-1.5 text-xs tabular-nums ${
                  active ? "bg-primary-foreground/20" : "bg-muted-foreground/10"
                }`}
              >
                {counts[t.value] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="border-border text-muted-foreground flex flex-col items-center gap-3 rounded-2xl border border-dashed p-12 text-center">
          <Search className="size-7 opacity-40" />
          <p className="text-sm">No enquiries in this category.</p>
          <Button variant="outline" size="sm" onClick={() => setFilter(ALL)}>
            Show all
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((l) => (
            <EnquiryCard key={l.id} lead={l} summary={summaries[l.listingId]} />
          ))}
        </div>
      )}
    </div>
  );
}

function EnquiryCard({
  lead,
  summary,
}: {
  lead: Lead;
  summary?: ListingSummary;
}) {
  const isActive = summary?.status === ListingStatus.Active;
  const cover = summary?.coverImage;
  const isViewing = lead.kind === LeadKind.Viewing;

  const body = (
    <>
      {/* Thumbnail. */}
      <div className="bg-muted relative size-20 shrink-0 overflow-hidden rounded-xl sm:size-24">
        {cover ? (
          <Image
            src={imageSrc(cover)}
            alt={lead.listingTitle}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 80px, 96px"
          />
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center">
            <Building2 className="size-7 opacity-40" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 text-[11px] font-medium ${SEEKER_LEAD_STATUS_BADGE[lead.status]}`}
          >
            {SEEKER_LEAD_STATUS_LABELS[lead.status]}
          </span>
          {isViewing && (
            <span className="inline-flex items-center gap-1 rounded bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-800 dark:bg-violet-500/15 dark:text-violet-300">
              <CalendarClock className="size-3" /> Viewing
            </span>
          )}
          {!isActive && (
            <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-[11px] font-medium">
              No longer available
            </span>
          )}
        </div>

        <h3 className="mt-1.5 line-clamp-1 font-semibold">{lead.listingTitle}</h3>
        <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-sm">
          <MapPin className="size-3.5 shrink-0" />
          <span className="line-clamp-1">
            {lead.listingLocality}, {lead.listingCity}
          </span>
        </p>

        {isViewing && lead.preferredTime && (
          <p className="mt-1.5 flex items-center gap-1 text-sm text-violet-600 dark:text-violet-400">
            <CalendarClock className="size-3.5 shrink-0" />
            Preferred:{" "}
            {new Date(lead.preferredTime).toLocaleString("en-NZ", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        )}

        {lead.message && (
          <p className="bg-muted/50 text-muted-foreground mt-2 flex gap-1.5 rounded-lg p-2.5 text-sm">
            <MessageSquareText className="mt-0.5 size-3.5 shrink-0 opacity-60" />
            <span className="line-clamp-2">{lead.message}</span>
          </p>
        )}

        <p className="text-muted-foreground mt-2 text-xs">
          Enquired{" "}
          {new Date(lead.createdAt).toLocaleDateString("en-NZ", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
          {isActive && (
            <span className="text-primary ml-1 font-medium">
              · View property →
            </span>
          )}
        </p>
      </div>
    </>
  );

  const className =
    "border-border bg-card shadow-soft flex gap-4 rounded-2xl border p-3 sm:p-4";

  return isActive ? (
    <Link
      href={`/properties/${lead.listingId}`}
      className={`${className} transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md`}
    >
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Mail,
  MapPin,
  MessageSquare,
  MessageSquareText,
  Phone,
} from "lucide-react";
import { LeadKind, LeadStatus } from "@/lib/enums";
import type { Lead } from "@/features/leads/leads.repository";
import { Reveal } from "@/components/common/reveal";
import {
  LEAD_STATUS_BADGE,
  LEAD_STATUS_FLOW,
  LEAD_STATUS_LABELS,
} from "@/features/leads/lead-labels";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "all";

/** Stable, deterministic timestamp (no relative "Date.now()" to avoid SSR/hydration drift). */
function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Owner/agent leads inbox — filter by status, view enquiries, move them
 *  through the lifecycle. Status changes are optimistic and revert per-lead. */
export function LeadsInbox({ initial }: { initial: Lead[] }) {
  const [leads, setLeads] = useState(initial);
  const [filter, setFilter] = useState<string>(ALL);

  const setStatus = async (id: string, status: LeadStatus) => {
    const prev = leads.find((l) => l.id === id)?.status;
    // optimistic
    setLeads((cur) => cur.map((l) => (l.id === id ? { ...l, status } : l)));
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok && prev) {
      // revert only this lead, leaving other optimistic edits intact
      setLeads((cur) => cur.map((l) => (l.id === id ? { ...l, status: prev } : l)));
    }
  };

  // Count per status for the filter tabs (recomputed as statuses change).
  const counts = useMemo(() => {
    const c: Record<string, number> = { [ALL]: leads.length };
    for (const s of LEAD_STATUS_FLOW) c[s] = 0;
    for (const l of leads) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [leads]);

  const visible = filter === ALL ? leads : leads.filter((l) => l.status === filter);

  const tabs: { value: string; label: string }[] = [
    { value: ALL, label: "All" },
    ...LEAD_STATUS_FLOW.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] })),
  ];

  if (leads.length === 0) {
    return (
      <div className="border-border text-muted-foreground flex flex-col items-center gap-3 rounded-2xl border border-dashed p-12 text-center">
        <span className="bg-muted grid size-12 place-items-center rounded-full">
          <MessageSquare className="size-6 opacity-50" />
        </span>
        <p className="max-w-xs text-sm">
          No enquiries yet. Leads from interested seekers will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Status filter tabs. */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
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
        <div className="border-border text-muted-foreground rounded-2xl border border-dashed p-10 text-center text-sm">
          No {filter === ALL ? "" : LEAD_STATUS_LABELS[filter as LeadStatus].toLowerCase()}{" "}
          enquiries.
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((l, i) => {
            const isViewing = l.kind === LeadKind.Viewing;
            return (
              <Reveal key={l.id} delay={Math.min(i * 60, 300)}>
                <article className="group border-border bg-card shadow-soft rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md sm:p-5">
                  {/* Identity + status control. */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <span className="bg-primary/10 text-primary ring-primary/10 grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold uppercase ring-4">
                        {l.name.slice(0, 2)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-semibold tracking-tight">
                            {l.name}
                          </h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${LEAD_STATUS_BADGE[l.status]}`}
                          >
                            {LEAD_STATUS_LABELS[l.status]}
                          </span>
                          {isViewing && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-800 dark:bg-violet-500/15 dark:text-violet-300">
                              <CalendarClock className="size-3" /> Viewing request
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                          <CalendarClock className="size-3.5 opacity-60" />
                          {formatWhen(l.createdAt)}
                        </p>
                      </div>
                    </div>

                    <Select
                      value={l.status}
                      onValueChange={(v) => setStatus(l.id, v as LeadStatus)}
                    >
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_STATUS_FLOW.map((s) => (
                          <SelectItem key={s} value={s}>
                            {LEAD_STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Contact chips — tap to call / email. */}
                  <div className="mt-3 flex flex-wrap gap-2 pl-0 sm:pl-14">
                    <a
                      href={`tel:${l.phone}`}
                      className="border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:text-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors"
                    >
                      <Phone className="size-3.5" /> {l.phone}
                    </a>
                    {l.email && (
                      <a
                        href={`mailto:${l.email}`}
                        className="border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:text-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors"
                      >
                        <Mail className="size-3.5" /> {l.email}
                      </a>
                    )}
                  </div>

                  {/* Preferred viewing time. */}
                  {isViewing && l.preferredTime && (
                    <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-violet-600 sm:pl-14 dark:text-violet-400">
                      <CalendarClock className="size-3.5 shrink-0" />
                      Preferred:{" "}
                      {new Date(l.preferredTime).toLocaleString("en-NZ", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  )}

                  {/* Enquiry message. */}
                  {l.message && (
                    <p className="bg-muted/50 text-foreground mt-3 flex gap-2 rounded-xl p-3 text-sm sm:ml-14">
                      <MessageSquareText className="text-muted-foreground mt-0.5 size-4 shrink-0 opacity-70" />
                      <span>{l.message}</span>
                    </p>
                  )}

                  {/* Listing the enquiry is about. */}
                  <div className="border-border mt-4 border-t pt-3 sm:ml-14">
                    <Link
                      href={`/properties/${l.listingId}`}
                      className="text-muted-foreground hover:text-primary group/link inline-flex max-w-full items-center gap-1.5 text-xs font-medium transition-colors"
                    >
                      <MapPin className="size-3.5 shrink-0" />
                      <span className="truncate">
                        {l.listingTitle} · {l.listingLocality}, {l.listingCity}
                      </span>
                      <ArrowRight className="size-3.5 shrink-0 -translate-x-1 opacity-0 transition-all group-hover/link:translate-x-0 group-hover/link:opacity-100" />
                    </Link>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { LeadKind } from "@/lib/enums";
import { cn, isValidNZMobile } from "@/lib/utils";
import { formatDateTimeNZ } from "@/features/listings/listing-labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/common/date-time-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type OpenHome = { start: string; end: string };

/**
 * "Contact owner" CTA + enquiry dialog. Guests can submit (name + phone);
 * logged-in users get name/email prefilled. Owners viewing their own listing
 * see a disabled state instead.
 *
 * Two modes via `kind`:
 *  - "enquiry" (default) — a general message to the owner.
 *  - "viewing"           — a viewing request. The seeker picks a time: one of
 *    the listing's scheduled open homes (if any) or a custom date/time. The
 *    chosen time is sent as `preferredTime`.
 *
 * The trigger button is customisable (`triggerLabel`/`triggerVariant`/
 * `triggerClassName`/`triggerSize`) so the same dialog works as a big sidebar
 * CTA or a compact button on a property card. The open click stops propagation
 * so it works when the card is wrapped in a <Link>.
 */
export function ContactOwnerDialog({
  listingId,
  listingTitle,
  isOwner = false,
  prefillName = "",
  prefillEmail = "",
  kind = LeadKind.Enquiry,
  openHomes = [],
  triggerLabel,
  triggerVariant = "default",
  triggerSize = "lg",
  triggerClassName,
  triggerFullWidth = true,
}: {
  listingId: string;
  listingTitle: string;
  isOwner?: boolean;
  prefillName?: string;
  prefillEmail?: string;
  kind?: LeadKind;
  openHomes?: OpenHome[];
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary";
  triggerSize?: "sm" | "lg" | "default";
  triggerClassName?: string;
  triggerFullWidth?: boolean;
}) {
  const isViewing = kind === LeadKind.Viewing;
  const defaultLabel = isViewing ? "Request a viewing" : "Contact owner";
  const label = triggerLabel ?? defaultLabel;

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(prefillName);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(prefillEmail);
  const [message, setMessage] = useState(
    isViewing
      ? `Hi, I'd like to arrange a viewing of "${listingTitle}".`
      : `Hi, I'm interested in "${listingTitle}". Please share more details.`,
  );
  // Viewing-request time: either a chosen open-home slot or a custom date/time.
  const [preferredTime, setPreferredTime] = useState("");
  const [customTime, setCustomTime] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const slots = openHomes.filter((o) => o.start);
  // A viewing request needs a time chosen before it can be sent.
  const timeMissing = isViewing && !preferredTime;
  // NZ mobile validation: gate submit, but only surface the inline error once
  // the seeker has actually typed something.
  const phoneValid = isValidNZMobile(phone);
  const showPhoneError = phone.trim().length > 0 && !phoneValid;

  if (isOwner) {
    return (
      <Button
        className={cn(triggerFullWidth && "w-full", triggerClassName)}
        size={triggerSize}
        variant={triggerVariant}
        disabled
      >
        This is your listing
      </Button>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          name,
          phone,
          email,
          message,
          kind,
          preferredTime: isViewing ? preferredTime : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json?.error?.message || "Failed to send enquiry");
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        className={cn(triggerFullWidth && "w-full", triggerClassName)}
        size={triggerSize}
        variant={triggerVariant}
        onClick={(e) => {
          // The card is usually wrapped in a <Link>; don't navigate on open.
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription className="line-clamp-1">
              {isViewing ? "Viewing request for" : "Enquiry for"} {listingTitle}
            </DialogDescription>
          </DialogHeader>

          {sent ? (
            <div className="flex min-h-0 flex-col items-center gap-3 overflow-y-auto p-8 text-center">
              <CheckCircle2 className="size-12 text-emerald-600" />
              <p className="text-lg font-semibold">
                {isViewing ? "Viewing requested!" : "Enquiry sent!"}
              </p>
              <p className="text-sm text-muted-foreground">
                The owner has been notified and will reach out to you soon.
              </p>
              <Button className="mt-2" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="min-h-0 space-y-4 overflow-y-auto p-5">
              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Viewing-request time picker. */}
              {isViewing && (
                <div className="space-y-2">
                  <Label>Preferred time</Label>
                  {slots.length > 0 && !customTime ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {slots.map((s) => {
                          const active = preferredTime === s.start;
                          return (
                            <button
                              key={s.start}
                              type="button"
                              onClick={() => setPreferredTime(s.start)}
                              className={cn(
                                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                                active
                                  ? "border-primary bg-primary/10 text-foreground"
                                  : "border-border text-muted-foreground hover:bg-muted",
                              )}
                            >
                              {formatDateTimeNZ(s.start)}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomTime(true);
                          setPreferredTime("");
                        }}
                        className="text-primary text-xs hover:underline"
                      >
                        Suggest another time instead
                      </button>
                    </>
                  ) : (
                    <>
                      <DateTimePicker
                        value={preferredTime}
                        onChange={setPreferredTime}
                        placeholder="Pick a date & time"
                      />
                      {slots.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomTime(false);
                            setPreferredTime("");
                          }}
                          className="text-primary text-xs hover:underline"
                        >
                          Choose a scheduled open home instead
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="lead-name">Name</Label>
                <Input
                  id="lead-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-phone">Phone</Label>
                <Input
                  id="lead-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your mobile number"
                  aria-invalid={showPhoneError}
                  required
                />
                {showPhoneError && (
                  <p className="text-destructive text-xs">
                    Enter a valid NZ mobile number (e.g. 021 123 4567).
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-email">Email (optional)</Label>
                <Input
                  id="lead-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-message">Message</Label>
                <Textarea
                  id="lead-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={submitting || timeMissing || !phoneValid}
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                {isViewing ? "Request viewing" : "Send enquiry"}
              </Button>
              {timeMissing && (
                <p className="text-muted-foreground text-center text-xs">
                  Choose a preferred time to continue.
                </p>
              )}
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

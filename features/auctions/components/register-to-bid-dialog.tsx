"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Gavel, Loader2 } from "lucide-react";
import { BidMethod } from "@/lib/enums";
import { cn, isValidNZMobile } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BID_METHOD_LABELS: Record<BidMethod, string> = {
  [BidMethod.Online]: "Bid online",
  [BidMethod.Phone]: "Bid by phone",
  [BidMethod.InRoom]: "Bid in the room",
};

/**
 * "Register to bid" CTA + dialog for an auction listing. Unlike the enquiry
 * dialog, registering requires a signed-in account (you bid as a known identity)
 * — guests get a prompt to sign in. The owner sees a disabled state on their own
 * auction. POSTs to `/api/auctions/registrations`; the server sets `bidderId`
 * from the session.
 */
export function RegisterToBidDialog({
  listingId,
  listingTitle,
  isOwner = false,
  disabled = false,
  onRegistered,
  triggerVariant = "default",
  triggerSize = "lg",
  triggerClassName,
  triggerFullWidth = true,
}: {
  listingId: string;
  listingTitle: string;
  isOwner?: boolean;
  /** True once the auction has ended — registration is closed. */
  disabled?: boolean;
  /** Fired after a successful registration (e.g. so a bidding panel refetches). */
  onRegistered?: () => void;
  triggerVariant?: "default" | "outline" | "secondary";
  triggerSize?: "sm" | "lg" | "default";
  triggerClassName?: string;
  triggerFullWidth?: boolean;
}) {
  const { data: session } = useSession();
  const user = session?.user;

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [bidMethod, setBidMethod] = useState<BidMethod>(BidMethod.Online);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const phoneValid = isValidNZMobile(phone);
  const showPhoneError = phone.trim().length > 0 && !phoneValid;

  const triggerClasses = cn(triggerFullWidth && "w-full", triggerClassName);

  if (isOwner) {
    return (
      <Button className={triggerClasses} size={triggerSize} variant="outline" disabled>
        This is your auction
      </Button>
    );
  }

  if (disabled) {
    return (
      <Button className={triggerClasses} size={triggerSize} variant="outline" disabled>
        Registration closed
      </Button>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auctions/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, name, phone, email, bidMethod }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json?.error?.message || "Failed to register");
      }
      setDone(true);
      onRegistered?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        className={triggerClasses}
        size={triggerSize}
        variant={triggerVariant}
        onClick={(e) => {
          // The card is usually wrapped in a <Link>; don't navigate on open.
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Gavel className="size-4" />
        Register to bid
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader>
            <DialogTitle>Register to bid</DialogTitle>
            <DialogDescription className="line-clamp-1">
              {listingTitle}
            </DialogDescription>
          </DialogHeader>

          {!user ? (
            <div className="flex flex-col items-center gap-3 p-8 text-center">
              <Gavel className="text-primary size-10" />
              <p className="font-medium">Sign in to register to bid</p>
              <p className="text-muted-foreground text-sm">
                You need an account so we can verify who is bidding.
              </p>
              <Button asChild className="mt-2">
                <Link href="/auth/sign-in">Sign in</Link>
              </Button>
            </div>
          ) : done ? (
            <div className="flex flex-col items-center gap-3 p-8 text-center">
              <CheckCircle2 className="size-12 text-emerald-600" />
              <p className="text-lg font-semibold">Registration submitted</p>
              <p className="text-muted-foreground text-sm">
                The agent will confirm your registration before the auction. We&apos;ll
                be in touch with the details.
              </p>
              <Button className="mt-2" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="min-h-0 space-y-4 overflow-y-auto p-5">
              {error && (
                <div className="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="reg-name">Name</Label>
                <Input
                  id="reg-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-phone">Phone</Label>
                <Input
                  id="reg-phone"
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
                <Label htmlFor="reg-email">Email (optional)</Label>
                <Input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>How will you bid?</Label>
                <Select
                  value={bidMethod}
                  onValueChange={(v) => setBidMethod(v as BidMethod)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(BidMethod).map((m) => (
                      <SelectItem key={m} value={m}>
                        {BID_METHOD_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="text-muted-foreground text-xs">
                Auctions sell unconditionally. Complete your due diligence and
                arrange finance before the auction day.
              </p>

              <Button
                type="submit"
                className="w-full"
                disabled={submitting || !phoneValid}
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                Submit registration
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

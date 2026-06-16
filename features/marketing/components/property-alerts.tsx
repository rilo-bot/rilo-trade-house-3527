"use client";

import { useState } from "react";
import { BellRing, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Reveal } from "@/components/common/reveal";

type Status = "idle" | "loading" | "done" | "error";

/**
 * "Property alerts" email capture. Posts to `POST /api/alerts`, which upserts
 * the subscription (idempotent per email). Shows an inline success/error state
 * — no navigation.
 */
export function PropertyAlerts() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setStatus("error");
        setMessage(
          json.error?.message ?? "Something went wrong — please try again.",
        );
        return;
      }
      setStatus("done");
      setMessage(
        json.data?.alreadySubscribed
          ? "You're already on the list — we'll keep you posted."
          : "You're in! We'll email you as new homes go live.",
      );
    } catch {
      setStatus("error");
      setMessage("Network error — please try again.");
    }
  };

  return (
    <section className="bg-accent">
      <div className="mx-auto w-full max-w-page px-4 py-16 sm:py-20">
        <Reveal>
          <div className="flex flex-col items-center gap-8 text-center lg:flex-row lg:justify-between lg:gap-12 lg:text-left">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5">
              <span className="bg-primary/10 text-primary grid size-14 shrink-0 place-items-center rounded-2xl">
                <BellRing className="size-7" />
              </span>
              <div className="flex flex-col gap-2">
                <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                  Never miss a new listing
                </h2>
                <p className="text-muted-foreground max-w-md text-pretty">
                  Get fresh homes that match what you&apos;re after, delivered
                  straight to your inbox.
                </p>
              </div>
            </div>

            <div className="flex w-full max-w-md flex-col gap-3 lg:w-auto lg:shrink-0">
              {status === "done" ? (
                <p className="text-primary flex items-center justify-center gap-2 font-medium lg:justify-start">
                  <Check className="size-5" /> {message}
                </p>
              ) : (
                <form
                  onSubmit={submit}
                  className="flex w-full flex-col gap-3 sm:flex-row"
                >
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    aria-label="Email address"
                    className="h-12 flex-1 rounded-xl bg-card sm:w-72"
                  />
                  <Button
                    type="submit"
                    size="lg"
                    disabled={status === "loading"}
                    className="h-12 rounded-xl"
                  >
                    {status === "loading" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Notify me"
                    )}
                  </Button>
                </form>
              )}

              {status === "error" && (
                <p className="text-destructive text-sm">{message}</p>
              )}
              <p className="text-muted-foreground text-center text-xs lg:text-left">
                No spam — just new listings. Unsubscribe anytime.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

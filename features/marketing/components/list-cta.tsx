import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/common/reveal";

/** Full-width gradient call-to-action: "Ready to list your property?" */
export function ListCta() {
  return (
    <section className="mx-auto w-full max-w-page px-4 py-16 sm:py-20">
      <Reveal>
        <div className="from-primary-hover to-primary text-primary-foreground relative overflow-hidden rounded-3xl bg-linear-to-br px-6 py-16 text-center shadow-soft sm:px-12">
          {/* Soft glows for depth. */}
          <span
            aria-hidden
            className="pointer-events-none absolute -top-16 -left-10 size-56 rounded-full bg-white/10 blur-3xl"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -right-10 -bottom-20 size-64 rounded-full bg-white/10 blur-3xl"
          />
          <div className="relative">
            <h2 className="text-2xl font-bold tracking-tight text-balance sm:text-4xl">
              Ready to list your property?
            </h2>
            <p className="text-primary-foreground/85 mx-auto mt-3 max-w-xl text-pretty">
              Reach thousands of serious buyers and tenants. Posting is free and
              takes under 2 minutes.
            </p>
            <Button
              size="lg"
              className="bg-background text-primary hover:bg-background/90 mt-7 rounded-full px-6 font-semibold shadow-sm"
              asChild
            >
              <Link href="/auth/signup">Post your property - FREE</Link>
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

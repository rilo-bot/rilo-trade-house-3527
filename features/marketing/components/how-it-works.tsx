import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/common/reveal";
import { OptimizedImage } from "@/components/common/optimized-image";
import { Button } from "@/components/ui/button";
import { howItWorks } from "../marketing.data";

// Collage photos (Unsplash — whitelisted in next.config.ts; these ids are
// already used elsewhere in the app, so they're known-good).
const photo = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=70`;

const COLLAGE = {
  top: {
    src: photo("1568605114967-8130f3a36994"),
    alt: "Modern New Zealand home exterior at dusk",
  },
  bottom: {
    src: photo("1502672260266-1c1ef2d93688"),
    alt: "Bright, light-filled living room",
  },
  tall: {
    src: photo("1613490493576-7fde63acd811"),
    alt: "Luxury modern home with a pool at dusk",
  },
};

const COLLAGE_SIZES = "(min-width: 1024px) 24vw, 45vw";

/**
 * "How it works" — an editorial two-column section: a staggered, overlapping
 * photo collage with a floating trust badge on one side, and the heading +
 * three icon-led steps on the other. Stacks to collage-over-text on mobile.
 *
 * The collage is intentionally asymmetric: two wide images stacked on the left,
 * and one tall image on the right pushed *down* (`pt-*`) so it sits offset —
 * that vertical stagger + the badge bridging the seam is what gives it the
 * layered, magazine feel rather than a flat grid.
 */
export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="mx-auto w-full max-w-page scroll-mt-16 px-4 py-16 sm:py-20"
    >
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
        {/* ── Photo collage ─────────────────────────────────────────────── */}
        <Reveal>
          <div className="relative">
            {/* Soft brand glow behind the collage for depth (painted first, so
                the photos sit on top — no z-index juggling). */}
            <div
              aria-hidden
              className="bg-primary/10 absolute -inset-3 rounded-[2.5rem] blur-2xl"
            />
            <div className="relative flex items-start">
              {/* Left: two wide images stacked. */}
              <div className="flex w-[55%] flex-col gap-3 sm:gap-4">
                <OptimizedImage
                  src={COLLAGE.top.src}
                  alt={COLLAGE.top.alt}
                  aspect="aspect-16/11"
                  rounded={false}
                  sizes={COLLAGE_SIZES}
                  className="shadow-soft rounded-2xl"
                />
                <OptimizedImage
                  src={COLLAGE.bottom.src}
                  alt={COLLAGE.bottom.alt}
                  aspect="aspect-4/3"
                  rounded={false}
                  sizes={COLLAGE_SIZES}
                  className="shadow-soft rounded-2xl"
                />
              </div>
              {/* Right: one tall image — pushed down (stagger) AND lapped over
                  the left column (overlap), with a bg ring to separate it. */}
              <div className="relative z-10 -ml-8 w-[50%] pt-10 sm:-ml-12 sm:pt-16">
                <OptimizedImage
                  src={COLLAGE.tall.src}
                  alt={COLLAGE.tall.alt}
                  aspect="aspect-5/8"
                  rounded={false}
                  sizes={COLLAGE_SIZES}
                  className="shadow-soft ring-background rounded-2xl ring-4"
                />
              </div>
            </div>

            {/* Floating trust badge, bridging the seam (honest, always-true). */}
            <div className="absolute top-[40%] left-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
              <div className="bg-card/95 border-border shadow-soft flex items-center gap-2.5 rounded-2xl border p-2.5 pr-4 backdrop-blur-sm sm:gap-3 sm:p-3">
                <span className="from-primary to-primary-hover text-primary-foreground grid size-10 shrink-0 place-items-center rounded-xl bg-linear-to-br shadow-sm sm:size-11">
                  <ShieldCheck className="size-5" />
                </span>
                <div>
                  <p className="text-lg leading-none font-bold tracking-tight sm:text-xl">
                    100%
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Verified listings
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── Heading + steps ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          <Reveal>
            <div className="flex flex-col gap-3">
              <span className="text-primary text-sm font-semibold tracking-wide uppercase">
                How it works
              </span>
              <h2 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                Find your perfect home, the simple way
              </h2>
              <p className="text-muted-foreground max-w-md text-pretty">
                From your first search to the front-door key, Trade House keeps
                it all in one place - verified listings, direct messaging, and
                the tools to close with confidence.
              </p>
            </div>
          </Reveal>

          {/* Numbered vertical stepper — a connecting line + corner numbers
              make the three steps read as a clear sequence. One <Reveal> wraps
              the whole list so the connector stays continuous. */}
          <Reveal delay={120}>
            <ol className="flex flex-col">
              {howItWorks.map((step, i) => {
                const Icon = step.icon;
                const last = i === howItWorks.length - 1;
                return (
                  <li
                    key={step.title}
                    className="relative flex gap-4 pb-7 last:pb-0"
                  >
                    {!last && (
                      <span
                        aria-hidden
                        className="bg-primary/20 absolute top-12 left-6 -ml-px h-[calc(100%-3rem)] w-0.5"
                      />
                    )}
                    <span className="from-primary to-primary-hover text-primary-foreground relative z-10 grid size-12 shrink-0 place-items-center rounded-full bg-linear-to-br shadow-sm">
                      <Icon className="size-5" />
                      <span className="bg-background text-primary ring-background absolute -top-1 -right-1 grid size-5 place-items-center rounded-full text-[10px] font-bold ring-2">
                        {i + 1}
                      </span>
                    </span>
                    <div className="pt-1.5">
                      <h3 className="font-semibold">{step.title}</h3>
                      <p className="text-muted-foreground mt-0.5 max-w-sm text-sm text-pretty">
                        {step.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Reveal>

          <Reveal delay={200}>
            <Button asChild size="lg" className="w-fit">
              <Link href="/properties">
                Start your search
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

import Image from "next/image";
import { MapPin, ShieldCheck, Sparkles, Heart } from "lucide-react";
import { Reveal } from "@/components/common/reveal";

/**
 * The branded left panel of the split-screen auth experience. Server Component
 * (no client state) — a premium property photo under a brand-token gradient,
 * with a headline, value props, and a short testimonial.
 *
 * Hidden below `lg`: on smaller screens the auth pages show the form full-width
 * (the navy site header already carries the brand mark), so this panel only
 * appears when there's room for it to add polish rather than crowd the form.
 *
 * The photo reuses the verified landing-hero image for brand continuity and a
 * guaranteed render; swap `IMAGE_SRC` for a dedicated shot anytime.
 */
const IMAGE_SRC =
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1400&q=75";

const VALUE_PROPS = [
  { icon: ShieldCheck, text: "Verified homes to buy, rent, or share" },
  { icon: Sparkles, text: "Free to browse — no fees for seekers" },
  { icon: Heart, text: "Save favourites and enquire in one tap" },
] as const;

export function AuthShowcase() {
  return (
    <section className="text-brand-foreground relative isolate hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
      {/* Background photo + theme-aware brand overlay (mirrors the hero). */}
      <div className="absolute inset-0 -z-10">
        <Image
          src={IMAGE_SRC}
          alt="A bright, modern New Zealand home at dusk"
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 0px"
          className="object-cover"
        />
        <div className="bg-brand/60 absolute inset-0" />
        <div className="from-brand via-brand/65 to-brand/25 absolute inset-0 bg-linear-to-t" />
        <div className="bg-primary/20 absolute -bottom-24 -left-16 size-96 rounded-full blur-3xl" />
      </div>

      {/* Top: location/featured badge — echoes the landing hero. */}
      <Reveal>
        <span className="border-brand-foreground/20 bg-brand-foreground/10 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium backdrop-blur">
          <MapPin className="size-3.5" />
          New Zealand&apos;s trusted marketplace
        </span>
      </Reveal>

      {/* Bottom: headline, value props, testimonial. */}
      <div className="space-y-8">
        <Reveal delay={80}>
          <h2 className="font-display text-4xl font-bold tracking-tight text-balance xl:text-5xl">
            Your next home{" "}
            <span className="from-sky-300 to-blue-400 bg-linear-to-r bg-clip-text text-transparent">
              starts here
            </span>
          </h2>
        </Reveal>

        <Reveal delay={150}>
          <ul className="space-y-3">
            {VALUE_PROPS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="bg-brand-foreground/15 grid size-7 shrink-0 place-items-center rounded-full backdrop-blur">
                  <Icon className="size-4" />
                </span>
                <span className="text-brand-foreground/90 text-pretty">
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={220}>
          <figure className="border-brand-foreground/15 bg-brand-foreground/10 max-w-md rounded-2xl border p-5 shadow-2xl backdrop-blur-md">
            <blockquote className="text-brand-foreground/90 text-pretty">
              &ldquo;We found and secured our first home within a week. The whole
              process felt effortless.&rdquo;
            </blockquote>
            <figcaption className="text-brand-foreground/70 mt-3 text-sm font-medium">
              Anaya &amp; Sam — Ponsonby, Auckland
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}

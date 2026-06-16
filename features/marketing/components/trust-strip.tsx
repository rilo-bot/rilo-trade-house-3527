import { Reveal } from "@/components/common/reveal";
import { trustItems } from "../marketing.data";
import { SectionHeading } from "./section-heading";

/** "Why choose us" — credibility feature cards (verified, insights, rating). */
export function TrustStrip() {
  return (
    <section className="bg-accent">
      <div className="mx-auto w-full max-w-page px-4 py-16 sm:py-20">
        <Reveal>
          <SectionHeading
            title="Why thousands choose Trade House"
            subtitle="Verified listings, real market insight, and a platform New Zealanders trust."
            className="mb-10"
          />
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-3">
          {trustItems.map(({ icon: Icon, title, description }, i) => (
            <Reveal key={title} delay={i * 90}>
              <div className="bg-card border-border shadow-soft flex h-full flex-col gap-3 rounded-2xl border p-6">
                <span className="from-primary to-primary-hover text-primary-foreground grid size-12 place-items-center rounded-xl bg-linear-to-br shadow-sm">
                  <Icon className="size-5" />
                </span>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-muted-foreground text-sm">{description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

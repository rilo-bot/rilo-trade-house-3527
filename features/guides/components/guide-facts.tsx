import { Reveal } from "@/components/common/reveal";
import type { GuideFact } from "../guides.data";

/**
 * "At a glance" — a compact band of headline facts on a tinted brand panel so
 * the key numbers stand out from the editorial sections around it. Shared by
 * the renting guides (tenancy rules) and the buying guides (the buying basics).
 */
export function GuideFacts({
  heading,
  subtitle,
  facts,
}: {
  heading: string;
  subtitle: string;
  facts: readonly GuideFact[];
}) {
  return (
    <section className="mx-auto w-full max-w-page px-4 py-16 sm:py-20">
      <Reveal>
        <div className="bg-brand text-brand-foreground shadow-soft overflow-hidden rounded-3xl px-6 py-10 sm:px-10 sm:py-12">
          <div className="mb-8 flex flex-col gap-2 text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight text-balance sm:text-3xl">
              {heading}
            </h2>
            <p className="text-brand-foreground/70 mx-auto max-w-xl text-pretty">
              {subtitle}
            </p>
          </div>

          <dl className="grid gap-px overflow-hidden rounded-2xl sm:grid-cols-2 lg:grid-cols-4">
            {facts.map((fact) => {
              const Icon = fact.icon;
              return (
                <div
                  key={fact.label}
                  className="bg-brand-foreground/5 flex flex-col gap-2 p-6 text-center"
                >
                  <span className="bg-brand-foreground/10 text-brand-foreground mx-auto grid size-10 place-items-center rounded-full">
                    <Icon className="size-5" />
                  </span>
                  <dd className="font-display mt-1 text-xl font-bold tracking-tight">
                    {fact.stat}
                  </dd>
                  <dt className="text-brand-foreground text-sm font-semibold">
                    {fact.label}
                  </dt>
                  <p className="text-brand-foreground/70 text-xs leading-relaxed text-pretty">
                    {fact.detail}
                  </p>
                </div>
              );
            })}
          </dl>
        </div>
      </Reveal>
    </section>
  );
}

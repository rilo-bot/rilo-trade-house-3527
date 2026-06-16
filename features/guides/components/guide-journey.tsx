import { Lightbulb } from "lucide-react";
import { Reveal } from "@/components/common/reveal";
import { SectionHeading } from "@/features/marketing/components/section-heading";
import type { JourneyStep } from "../guides.data";

/**
 * The five-stage journey strip shared by the renting and buying guides. Steps
 * sit in a row joined by a faint connecting line on large screens so they read
 * as one sequence, and stack into a grid on smaller screens. Server Component —
 * motion comes from the <Reveal> wrappers.
 */
export function GuideJourney({
  heading,
  subtitle,
  steps,
}: {
  heading: string;
  subtitle: string;
  steps: readonly JourneyStep[];
}) {
  return (
    <section className="mx-auto w-full max-w-page px-4 py-16 sm:py-20">
      <Reveal>
        <SectionHeading title={heading} subtitle={subtitle} className="mb-12" />
      </Reveal>

      <Reveal delay={80}>
        <ol className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
          {/* Connecting line behind the step badges (desktop only). */}
          <span
            aria-hidden
            className="bg-primary/15 absolute top-6 right-[10%] left-[10%] hidden h-0.5 lg:block"
          />
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="relative flex flex-col gap-3">
                <span className="from-primary to-primary-hover text-primary-foreground relative z-10 grid size-12 place-items-center rounded-full bg-linear-to-br shadow-sm">
                  <Icon className="size-5" />
                  <span className="bg-background text-primary ring-background absolute -top-1 -right-1 grid size-5 place-items-center rounded-full text-[10px] font-bold ring-2">
                    {i + 1}
                  </span>
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-muted-foreground text-sm text-pretty">
                    {step.description}
                  </p>
                </div>
                <p className="text-muted-foreground/90 mt-auto flex items-start gap-1.5 text-xs">
                  <Lightbulb className="text-primary mt-px size-3.5 shrink-0" />
                  <span className="text-pretty">{step.tip}</span>
                </p>
              </li>
            );
          })}
        </ol>
      </Reveal>
    </section>
  );
}

import { CheckCircle2 } from "lucide-react";
import { Reveal } from "@/components/common/reveal";
import { SectionHeading } from "@/features/marketing/components/section-heading";
import type { Checklist } from "../guides.data";

/**
 * Printable-feeling checklists — three cards, each listing the concrete things
 * to do or bring at a stage of the journey. Kept deliberately scannable: a
 * leading check icon per line and one card per stage. Shared by the renting and
 * buying guides.
 */
export function GuideChecklists({
  heading,
  subtitle,
  checklists,
}: {
  heading: string;
  subtitle: string;
  checklists: readonly Checklist[];
}) {
  return (
    <section className="bg-accent/40 border-border border-y">
      <div className="mx-auto w-full max-w-page px-4 py-16 sm:py-20">
        <Reveal>
          <SectionHeading title={heading} subtitle={subtitle} className="mb-12" />
        </Reveal>

        <div className="grid gap-5 lg:grid-cols-3">
          {checklists.map((list, i) => {
            const Icon = list.icon;
            return (
              <Reveal key={list.title} delay={i * 80}>
                <div className="bg-card border-border shadow-soft flex h-full flex-col rounded-2xl border p-6">
                  <div className="flex items-center gap-3">
                    <span className="from-primary to-primary-hover text-primary-foreground grid size-10 shrink-0 place-items-center rounded-xl bg-linear-to-br shadow-sm">
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <h3 className="font-display font-semibold tracking-tight">
                        {list.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-muted-foreground mt-3 text-sm text-pretty">
                    {list.description}
                  </p>
                  <ul className="border-border/70 mt-4 flex flex-col gap-2.5 border-t pt-4">
                    {list.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 className="text-primary mt-0.5 size-4 shrink-0" />
                        <span className="text-pretty">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

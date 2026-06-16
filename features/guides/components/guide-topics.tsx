import { Check } from "lucide-react";
import { Reveal } from "@/components/common/reveal";
import { SectionHeading } from "@/features/marketing/components/section-heading";
import type { GuideTopic } from "../guides.data";

/**
 * Featured guide topics — a responsive grid of cards, each with an icon, a
 * one-line summary and a short list of plain-language pointers. Lifts and
 * deepens its shadow on hover so the grid feels tactile without being noisy.
 * Shared by the renting and buying guides.
 */
export function GuideTopics({
  heading,
  subtitle,
  topics,
}: {
  heading: string;
  subtitle: string;
  topics: readonly GuideTopic[];
}) {
  return (
    <section className="bg-accent/40 border-border border-y">
      <div className="mx-auto w-full max-w-page px-4 py-16 sm:py-20">
        <Reveal>
          <SectionHeading title={heading} subtitle={subtitle} className="mb-12" />
        </Reveal>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic, i) => {
            const Icon = topic.icon;
            return (
              <Reveal key={topic.title} delay={(i % 3) * 80}>
                <article className="group bg-card border-border shadow-soft hover:shadow-md flex h-full flex-col gap-4 rounded-2xl border p-6 transition-shadow">
                  <div className="flex items-center gap-3">
                    <span className="bg-accent text-primary grid size-11 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover:-translate-y-0.5">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="font-display text-lg font-semibold tracking-tight">
                      {topic.title}
                    </h3>
                  </div>
                  <p className="text-muted-foreground text-sm text-pretty">
                    {topic.summary}
                  </p>
                  <ul className="mt-auto flex flex-col gap-2">
                    {topic.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-start gap-2 text-sm"
                      >
                        <span className="bg-primary/10 text-primary mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-full">
                          <Check className="size-3" />
                        </span>
                        <span className="text-pretty">{point}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

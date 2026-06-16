import { Plus } from "lucide-react";
import { Reveal } from "@/components/common/reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqs } from "../marketing.data";
import { SectionHeading } from "./section-heading";

/**
 * Home FAQ — common buyer/renter/seller questions in a Radix accordion with
 * smooth height animations (`accordion-down`/`accordion-up`). Multiple panels
 * can stay open at once; the "+" rotates to an "×" when its panel opens.
 */
export function Faq() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:py-20">
      <Reveal>
        <SectionHeading
          title="Frequently asked questions"
          subtitle="Everything you need to know to get started."
          className="mb-10"
        />
      </Reveal>

      <Reveal delay={80}>
        <Accordion type="multiple" className="flex flex-col gap-3">
          {faqs.map((f) => (
            <AccordionItem
              key={f.q}
              value={f.q}
              className="group border-border bg-card shadow-soft data-[state=open]:shadow-md rounded-2xl border px-5 transition-shadow"
            >
              <AccordionTrigger
                className="py-5"
                icon={
                  <span className="bg-accent text-primary grid size-7 shrink-0 place-items-center rounded-full transition-transform duration-200 group-data-[state=open]/trigger:rotate-45">
                    <Plus className="size-4" />
                  </span>
                }
              >
                {f.q}
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground text-sm text-pretty">
                  {f.a}
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </section>
  );
}

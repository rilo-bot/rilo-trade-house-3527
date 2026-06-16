import { Star } from "lucide-react";
import { Reveal } from "@/components/common/reveal";
import { SectionHeading } from "./section-heading";

type Testimonial = {
  name: string;
  location: string;
  role: string;
  rating: number;
  quote: string;
  /** Initials for the avatar fallback. */
  initials: string;
  /** Soft background hue for the avatar circle. */
  avatarColor: string;
};

const testimonials: Testimonial[] = [
  {
    name: "Aroha Tūhoe",
    location: "Auckland",
    role: "First-home buyer",
    rating: 5,
    quote:
      "We'd been searching for months on other sites. Trade House had verified listings that actually existed — no phantom properties. We found our first home in Māngere Bridge within three weeks and moved in before Christmas.",
    initials: "AT",
    avatarColor: "from-sky-400 to-blue-500",
  },
  {
    name: "James & Lucy Ferris",
    location: "Wellington",
    role: "Family upsizing",
    rating: 5,
    quote:
      "The market insight tools were a game-changer. We could see actual price trends for Khandallah before making our offer. We went in with confidence and got the house $30k under asking. Couldn't be happier.",
    initials: "JF",
    avatarColor: "from-violet-400 to-purple-500",
  },
  {
    name: "Sophie Ngata",
    location: "Christchurch",
    role: "Renter",
    rating: 5,
    quote:
      "Moving to Ōtautahi for work was nerve-wracking, but Trade House made it easy. I found a great flat in Sumner, messaged the landlord directly, and had a viewing confirmed the next morning. Signed the lease within a week.",
    initials: "SN",
    avatarColor: "from-emerald-400 to-teal-500",
  },
  {
    name: "Marcus Pereira",
    location: "Queenstown",
    role: "Property investor",
    rating: 5,
    quote:
      "I've listed three investment properties on Trade House. The dashboard makes managing enquiries genuinely simple, and I get serious leads — not tyre-kickers. My last property was tenanted within ten days of going live.",
    initials: "MP",
    avatarColor: "from-orange-400 to-rose-500",
  },
  {
    name: "Tane Wirihana",
    location: "Hamilton",
    role: "Flatmate finder",
    rating: 4,
    quote:
      "I needed a flatmate after my previous one moved out. Posted the room on a Saturday, had five genuine inquiries by Monday. The person I picked has been brilliant. Really easy process from start to finish.",
    initials: "TW",
    avatarColor: "from-amber-400 to-yellow-500",
  },
  {
    name: "Mia Chen",
    location: "Tauranga",
    role: "First-home buyer",
    rating: 5,
    quote:
      "As a single buyer, I was nervous about getting things right. The saved-search alerts meant I never missed a new listing in my budget. My Trade House shortlist made every open home visit feel purposeful.",
    initials: "MC",
    avatarColor: "from-pink-400 to-fuchsia-500",
  },
];

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={
            i < rating
              ? "fill-amber-400 text-amber-400 size-4"
              : "fill-muted text-muted size-4"
          }
        />
      ))}
    </div>
  );
}

/**
 * Testimonials — a three-column card grid of authentic Kiwi success stories.
 * Sits between the InsightsTeaser and TrustStrip so social proof lands just
 * before the final conversion section.
 */
export function Testimonials() {
  return (
    <section className="mx-auto w-full max-w-page px-4 py-16 sm:py-20">
      <Reveal>
        <SectionHeading
          title="Real stories from Kiwi home seekers"
          subtitle="Thousands of New Zealanders have found their place with Trade House. Here's what they had to say."
          className="mb-12"
        />
      </Reveal>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((t, i) => (
          <Reveal key={t.name} delay={i * 70}>
            <article className="bg-card border-border shadow-soft flex h-full flex-col gap-4 rounded-2xl border p-6 transition-shadow hover:shadow-md">
              {/* Top row: avatar + name + star rating */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <span
                    className={`bg-linear-to-br ${t.avatarColor} text-white grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold shadow-sm`}
                  >
                    {t.initials}
                  </span>
                  <div>
                    <p className="text-sm font-semibold leading-snug">{t.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {t.role} · {t.location}
                    </p>
                  </div>
                </div>
                <StarRating rating={t.rating} />
              </div>

              {/* Decorative open-quote mark */}
              <span
                aria-hidden
                className="text-primary/20 font-display -mb-2 text-5xl leading-none font-bold select-none"
              >
                &ldquo;
              </span>

              {/* Quote body */}
              <blockquote className="text-muted-foreground flex-1 text-sm leading-relaxed text-pretty">
                {t.quote}
              </blockquote>
            </article>
          </Reveal>
        ))}
      </div>

      {/* Aggregate rating summary bar */}
      <Reveal delay={200}>
        <div className="bg-accent border-border mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl border px-6 py-5">
          <div className="flex items-center gap-2">
            <StarRating rating={5} />
            <span className="text-lg font-bold tracking-tight">4.8 / 5</span>
          </div>
          <p className="text-muted-foreground text-sm">
            Based on{" "}
            <span className="text-foreground font-semibold">3,200+ reviews</span>{" "}
            from verified Trade House users across New Zealand
          </p>
        </div>
      </Reveal>
    </section>
  );
}

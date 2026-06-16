import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type HeroProps = {
  /** Background image (also used as the video poster). */
  imageSrc: string;
  imageAlt: string;
  /**
   * Optional self-hosted background video. When set, it autoplays muted/looping
   * over the image. Drop a file in `public/videos/` and pass e.g. "/videos/hero.mp4".
   */
  videoSrc?: string;
  className?: string;
  /** Override/extend the inner content container (e.g. widen it for a search card). */
  contentClassName?: string;
  children: ReactNode;
};

/**
 * Full-bleed hero with a background image (or ambient video) and a theme-aware
 * gradient overlay built from the `--brand` token, so text stays legible and
 * the hero adapts to whichever theme is active.
 */
export function Hero({
  imageSrc,
  imageAlt,
  videoSrc,
  className,
  contentClassName,
  children,
}: HeroProps) {
  return (
    <section
      className={cn(
        "relative isolate flex flex-col justify-center overflow-hidden",
        className,
      )}
    >
      <div className="absolute inset-0 -z-10">
        {videoSrc ? (
          <video
            src={videoSrc}
            poster={imageSrc}
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />
        ) : (
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        {/* Theme-aware overlay: a brand wash, a bottom-up gradient that keeps
            text + the search card legible, and a soft radial vignette for depth.
            All built from the `--brand` token so the hero adapts across themes. */}
        <div className="bg-brand/55 absolute inset-0" />
        <div className="from-brand via-brand/55 to-brand/20 absolute inset-0 bg-linear-to-t" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_60%_at_50%_35%,transparent_0%,color-mix(in_oklch,var(--brand),transparent_45%)_100%)]" />
      </div>

      <div
        className={cn(
          "text-brand-foreground relative mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-4 py-16 text-center sm:gap-6 sm:py-20",
          contentClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

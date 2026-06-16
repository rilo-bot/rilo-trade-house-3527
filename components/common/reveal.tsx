"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type RevealProps = {
  children: ReactNode;
  /** Stagger delay (ms) before the element animates in once it scrolls into view. */
  delay?: number;
  className?: string;
};

/**
 * Reveals its children with a subtle fade-up the first time they scroll into
 * view, then disconnects (it animates once). SSR-safe and accessible:
 *
 * - Children are passed through as a prop, so wrapping a section in <Reveal>
 *   does NOT turn that section into a Client Component — only this thin wrapper
 *   is client-side.
 * - The motion lives in the `.reveal` utility (see globals.css), which is gated
 *   behind `prefers-reduced-motion: no-preference` — users who ask for reduced
 *   motion see the content immediately with no transform or transition.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // No observer needed when motion is reduced — the `.reveal` CSS already
    // renders the content fully visible, so there's nothing to animate in.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-revealed={shown ? "true" : "false"}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
      className={cn("reveal", className)}
    >
      {children}
    </div>
  );
}

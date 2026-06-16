"use client";

import Image from "next/image";
import { useState } from "react";
import { cn, imageSrc } from "@/lib/utils";

export type OptimizedImageProps = {
  src: string;
  /** Always provide meaningful alt text for accessibility/SEO. */
  alt: string;
  /**
   * Tailwind aspect-ratio class for the wrapper (e.g. "aspect-video",
   * "aspect-[4/3]", "aspect-square"). The image fills this box with object-cover.
   */
  aspect?: string;
  /**
   * Responsive `sizes` hint — tells the browser how wide the image renders so
   * next/image can pick the right resolution. Defaults to full viewport width.
   */
  sizes?: string;
  /** Load eagerly (use only for above-the-fold images like a hero). */
  priority?: boolean;
  /** Round the corners (off when the image sits flush inside a card). */
  rounded?: boolean;
  className?: string;
};

/**
 * App-standard image: lazy by default, served as AVIF/WebP via next/image,
 * fades in on load over a muted skeleton, and shows a graceful fallback if the
 * source fails. Use this for all content images instead of raw <img>.
 */
export function OptimizedImage({
  src,
  alt,
  aspect = "aspect-video",
  sizes = "100vw",
  priority = false,
  rounded = true,
  className,
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <div
      className={cn(
        "bg-muted relative overflow-hidden",
        aspect,
        rounded && "rounded-lg",
        className,
      )}
    >
      {errored ? (
        <div className="text-muted-foreground absolute inset-0 grid place-items-center text-xs">
          Image unavailable
        </div>
      ) : (
        <Image
          src={imageSrc(src)}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={cn(
            "object-cover transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      )}
    </div>
  );
}

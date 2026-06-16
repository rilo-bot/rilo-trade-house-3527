"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, ImageOff, X } from "lucide-react";
import { cn, imageSrc } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * Property photo gallery.
 *  - Desktop (≥sm): an asymmetric grid — one large photo + up to three smaller
 *    ones, the last carrying a "+N" overlay when there are more.
 *  - Mobile (<sm): a swipeable, snap-scrolling carousel with a counter + dots.
 *  - Any photo opens a full-screen lightbox (arrows, ←/→ keys, Esc, swipe, and a
 *    thumbnail filmstrip) to browse all images.
 * Dependency-free: CSS scroll-snap for the carousel, Radix Dialog for the
 * lightbox. All motion is gated to `motion-safe`.
 */
export function PropertyGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  // The open lightbox image index, or null when closed.
  const [index, setIndex] = useState<number | null>(null);
  const count = images.length;

  const open = useCallback((i: number) => setIndex(i), []);
  const close = useCallback(() => setIndex(null), []);
  const go = useCallback(
    (dir: 1 | -1) =>
      setIndex((cur) => (cur === null ? cur : (cur + dir + count) % count)),
    [count],
  );

  // Arrow-key navigation while the lightbox is open (Esc is handled by Dialog).
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go]);

  if (count === 0) {
    return (
      <div className="bg-muted text-muted-foreground flex h-72 w-full flex-col items-center justify-center gap-2 rounded-2xl sm:h-[28rem]">
        <ImageOff className="size-8" />
        <span className="text-sm">No photos yet</span>
      </div>
    );
  }

  return (
    <>
      <MobileCarousel images={images} title={title} onOpen={open} />
      <DesktopGrid images={images} title={title} onOpen={open} />

      <Dialog open={index !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent
          showClose={false}
          className="h-screen max-h-screen w-screen max-w-none gap-0 rounded-none border-0 bg-black/95 p-0"
        >
          <DialogTitle className="sr-only">{title} — photo gallery</DialogTitle>
          {index !== null && (
            <Lightbox
              images={images}
              title={title}
              index={index}
              onIndex={setIndex}
              onPrev={() => go(-1)}
              onNext={() => go(1)}
              onClose={close}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ---------------------------------------------------------------- Desktop -- */

function DesktopGrid({
  images,
  title,
  onOpen,
}: {
  images: string[];
  title: string;
  onOpen: (i: number) => void;
}) {
  const count = images.length;

  const tile = (i: number, className?: string, overlay?: React.ReactNode) => (
    <button
      type="button"
      onClick={() => onOpen(i)}
      aria-label={`View photo ${i + 1} of ${count} full screen`}
      className={cn(
        "group/tile bg-muted focus-visible:ring-ring relative block h-full w-full overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset",
        className,
      )}
    >
      <Image
        src={imageSrc(images[i])}
        alt={`${title} — photo ${i + 1}`}
        fill
        sizes="(max-width: 1024px) 50vw, 33vw"
        priority={i === 0}
        className="object-cover transition-transform duration-500 ease-out motion-safe:group-hover/tile:scale-105"
      />
      {overlay}
    </button>
  );

  const plus = (n: number) => (
    <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-semibold text-white">
      +{n}
    </span>
  );

  let grid: React.ReactNode;
  if (count === 1) {
    grid = (
      <div className="h-[28rem] overflow-hidden rounded-2xl">{tile(0)}</div>
    );
  } else if (count === 2) {
    grid = (
      <div className="grid h-[28rem] grid-cols-2 gap-2 overflow-hidden rounded-2xl">
        {tile(0)}
        {tile(1)}
      </div>
    );
  } else if (count === 3) {
    grid = (
      <div className="grid h-[28rem] grid-cols-2 grid-rows-2 gap-2 overflow-hidden rounded-2xl">
        {tile(0, "row-span-2")}
        {tile(1)}
        {tile(2)}
      </div>
    );
  } else {
    grid = (
      <div className="grid h-[28rem] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl">
        {tile(0, "col-span-2 row-span-2")}
        {tile(1, "col-span-2")}
        {tile(2)}
        {tile(3, undefined, count > 4 ? plus(count - 4) : undefined)}
      </div>
    );
  }

  return (
    <div className="relative hidden sm:block">
      {grid}
      {count > 1 && (
        <button
          type="button"
          onClick={() => onOpen(0)}
          className="bg-background/90 text-foreground border-border hover:bg-background focus-visible:ring-ring absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium shadow-sm backdrop-blur transition-colors outline-none focus-visible:ring-2"
        >
          <Expand className="size-4" /> Show all {count} photos
        </button>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- Mobile -- */

function MobileCarousel({
  images,
  title,
  onOpen,
}: {
  images: string[];
  title: string;
  onOpen: (i: number) => void;
}) {
  const [active, setActive] = useState(0);
  const count = images.length;

  return (
    <div className="relative sm:hidden">
      <div
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-2xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={(e) => {
          const el = e.currentTarget;
          setActive(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {images.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onOpen(i)}
            aria-label={`View photo ${i + 1} of ${count} full screen`}
            className="bg-muted relative aspect-4/3 w-full shrink-0 snap-center overflow-hidden"
          >
            <Image
              src={imageSrc(src)}
              alt={`${title} — photo ${i + 1}`}
              fill
              sizes="100vw"
              priority={i === 0}
              className="object-cover"
            />
          </button>
        ))}
      </div>

      {count > 1 && (
        <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur tabular-nums">
          {active + 1} / {count}
        </span>
      )}

      {count > 1 && count <= 8 && (
        <div className="mt-2 flex justify-center gap-1.5">
          {images.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === active ? "bg-primary w-4" : "bg-muted-foreground/30 w-1.5",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- Lightbox -- */

function Lightbox({
  images,
  title,
  index,
  onIndex,
  onPrev,
  onNext,
  onClose,
}: {
  images: string[];
  title: string;
  index: number;
  onIndex: (i: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const count = images.length;
  const touchX = useRef<number | null>(null);

  return (
    <div className="flex h-full w-full flex-col">
      {/* Top bar: counter + close. */}
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-medium tabular-nums">
          {index + 1} / {count}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close gallery"
          className="grid size-10 place-items-center rounded-full text-white/80 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Current image. */}
      <div
        className="relative min-h-0 flex-1 px-2"
        onTouchStart={(e) => {
          touchX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
          if (dx > 50) onPrev();
          else if (dx < -50) onNext();
          touchX.current = null;
        }}
      >
        <Image
          key={index}
          src={imageSrc(images[index])}
          alt={`${title} — photo ${index + 1}`}
          fill
          sizes="100vw"
          priority
          className="object-contain"
        />

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={onPrev}
              aria-label="Previous photo"
              className="absolute top-1/2 left-2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/70 sm:left-4"
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              type="button"
              onClick={onNext}
              aria-label="Next photo"
              className="absolute top-1/2 right-2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/70 sm:right-4"
            >
              <ChevronRight className="size-6" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail filmstrip. */}
      {count > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-3">
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onIndex(i)}
              aria-label={`Go to photo ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              className={cn(
                "relative h-14 w-20 shrink-0 overflow-hidden rounded-md outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-white/70",
                i === index
                  ? "opacity-100 ring-2 ring-white"
                  : "opacity-50 hover:opacity-100",
              )}
            >
              <Image
                src={imageSrc(src)}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

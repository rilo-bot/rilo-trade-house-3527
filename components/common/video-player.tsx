import { cn } from "@/lib/utils";

export type VideoPlayerProps = {
  /** Self-hosted source — a file in `public/videos/` ("/videos/tour.mp4") or a CDN URL. */
  src: string;
  /** Poster image shown before playback (a frame or a still). Strongly recommended. */
  poster?: string;
  /** Tailwind aspect-ratio class for the frame. */
  aspect?: string;
  /**
   * Ambient mode = autoplay, muted, looping, no controls (hero/background clips).
   * Browsers only autoplay when muted, so ambient forces muted.
   */
  ambient?: boolean;
  /** Show native controls. Defaults to true unless `ambient`. */
  controls?: boolean;
  className?: string;
};

/**
 * Self-hosted video frame. `preload="metadata"` keeps the page light (only the
 * poster + dimensions load until the user plays). For multiple formats, pass a
 * single `src` here or extend with <source> children as needed.
 */
export function VideoPlayer({
  src,
  poster,
  aspect = "aspect-video",
  ambient = false,
  controls,
  className,
}: VideoPlayerProps) {
  return (
    <div
      className={cn(
        "bg-muted relative overflow-hidden rounded-lg",
        aspect,
        className,
      )}
    >
      <video
        src={src}
        poster={poster}
        className="h-full w-full object-cover"
        playsInline
        preload={ambient ? "auto" : "metadata"}
        autoPlay={ambient}
        muted={ambient}
        loop={ambient}
        controls={controls ?? !ambient}
      />
    </div>
  );
}

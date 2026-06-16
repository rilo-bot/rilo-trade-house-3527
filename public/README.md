# Static assets (`public/`)

Files here are served from the site root: `public/images/logo.svg` → `/images/logo.svg`.

```
public/
├── images/      # Static UI/branding images (logo, hero poster, icons, illustrations)
└── videos/      # Self-hosted videos (hero background, property walkthroughs)
```

## How to use

- **Local images** — render with the app's wrapper, never a raw `<img>`:
  ```tsx
  import { OptimizedImage } from "@/components/common/optimized-image";
  <OptimizedImage src="/images/hero.jpg" alt="…" aspect="aspect-video" priority />
  ```
  For fixed-size assets like a logo, use `next/image` directly with `width`/`height`.

- **Local video** — use the player, or pass `videoSrc` to `<Hero>`:
  ```tsx
  import { VideoPlayer } from "@/components/common/video-player";
  <VideoPlayer src="/videos/tour.mp4" poster="/images/tour-poster.jpg" />
  ```

- **Remote images (CDN/uploads)** — same `OptimizedImage`, but the host MUST be
  whitelisted in `next.config.ts` → `images.remotePatterns`, or next/image throws.

## Asset guidelines (for good UX + performance)

- **Photos:** export at ~1600px wide max, JPG/WebP. next/image handles
  resizing/format — don't ship 4000px originals.
- **Hero/background video:** keep it short (≤15s), muted, compressed (H.264 MP4
  ~1080p, a few MB). Always provide a poster image so something shows instantly.
- **Logos/icons:** prefer SVG.
- **Always set descriptive `alt` text** (accessibility + SEO).

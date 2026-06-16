<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

This project uses **Next.js 16** (App Router, React 19.2, Turbopack by default,
Tailwind v4, shadcn/ui). Key v16 gotchas: `cookies()`/`headers()`/`draftMode()`
and `params`/`searchParams` are **async** (await them); `middleware` is renamed
to `proxy`; route handlers are not cached by default.

## Project structure

```
app/                        # Routing layer ONLY (pages, layouts, route handlers)
  api/<feature>/route.ts    # Thin HTTP boundary — maps verbs to controllers
  layout.tsx                # Root layout (header + footer wired in)
  error.tsx / not-found.tsx / loading.tsx
components/
  ui/                       # shadcn/ui primitives (generated; avoid hand-editing)
  layout/                   # Header, footer, shells
  common/                   # Shared composite components (used across features)
features/<feature>/         # Self-contained feature modules — see features/README.md
  components/ hooks/ types.ts
  <feature>.schema.ts       # Zod: validate input + infer types
  <feature>.controller.ts   # validate -> service -> response envelope
  <feature>.service.ts      # business logic, no HTTP, throws AppError
  <feature>.repository.ts   # data access (added when a DB is chosen)
lib/
  api/response.ts           # ok()/created()/noContent()/fail() + ApiResponse type
  api/handler.ts            # withErrorHandling() wrapper for route handlers
  errors.ts                 # AppError + NotFoundError/BadRequestError/...
  env.ts                    # Zod-validated process.env (import `env` from here)
  utils.ts                  # cn() and small shared helpers
config/site.ts              # App-wide static config (name, nav, URLs)
stores/                     # App-wide Zustand client stores (factory + provider)
types/                      # Cross-feature shared types only
hooks/                      # App-wide reusable React hooks (use-*.ts, "use client")
app/providers.tsx           # Composes all client context providers
```

## Conventions

- **Server Components by default.** Add `"use client"` only when a component
  needs state, effects, or browser APIs. Push client boundaries to the leaves.
- **Small components.** One component per file; co-locate feature UI under the
  feature. Promote to `components/common/` only when reused across features.
- **API layering** (see `features/README.md`): `route.ts` → controller →
  service → repository. Keep `route.ts` thin; no business logic in routes.
- **Validate at the boundary** with Zod schemas; infer types from them
  (`z.infer`) rather than declaring shapes twice.
- **Errors:** throw `AppError` subclasses from `lib/errors.ts`; never hand-build
  error JSON. `withErrorHandling` formats them.
- **Responses:** always use the `{ success, data | error }` envelope from
  `lib/api/response.ts`.
- **Imports:** use the `@/*` alias (maps to project root), not relative `../../`.
- **Env vars:** read through `env` from `lib/env.ts`; add new vars to its schema
  and to `.env.example`. Browser-exposed vars must be prefixed `NEXT_PUBLIC_`.
- **Hooks:** reusable, cross-feature hooks go in `hooks/`, named `use-*.ts` and
  marked `"use client"`; keep them SSR-safe (no `window`/`localStorage` access
  during render — read in `useEffect`). Feature-specific hooks live in
  `features/<feature>/hooks/`.
- **State (Zustand v5):** client UI state only — never server data. Use the
  store-factory + Context-provider pattern (see `stores/ui-store.ts` +
  `stores/ui-store-provider.tsx`); NEVER a module-level `create()` store (it
  leaks state across requests on the server). App-wide stores go in `stores/`;
  feature stores in `features/<feature>/<feature>.store.ts`. Register providers
  in `app/providers.tsx`. Read with narrow selectors: `useUIStore((s) => s.x)`.
- **Media:** never use raw `<img>`/`<video>`. Use `OptimizedImage`,
  `VideoPlayer`, `Hero` from `components/common/` (lazy, responsive, fade-in,
  fallbacks). Always set descriptive `alt`. Local assets go in `public/images/`
  and `public/videos/` (see `public/README.md`); remote image hosts MUST be
  added to `next.config.ts` → `images.remotePatterns`. Style media surfaces with
  theme tokens (`bg-brand`, `text-primary`, …) so they adapt across themes.

## Commands

- `npm run dev` — dev server (Turbopack)
- `npm run build` / `npm start` — production build / serve
- `npm run lint` — ESLint (flat config; `next lint` is removed in v16)

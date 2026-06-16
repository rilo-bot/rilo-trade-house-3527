# Features

Each feature is a self-contained module. Group code by **feature**, not by
technical type — everything a feature needs lives in one folder, so it's easy to
find, change, and delete as a unit.

## Anatomy of a feature

```
features/<feature>/
├── components/                 # UI used only by this feature ("use client" as needed)
├── hooks/                      # React hooks used only by this feature
├── <feature>.schema.ts         # Zod schemas: validate input + infer types
├── <feature>.service.ts        # Business logic. No HTTP. Throws AppError. Testable.
├── <feature>.controller.ts     # HTTP boundary glue: validate -> call service -> ok()/created()
├── <feature>.repository.ts     # Data access (add when a DB/ORM is chosen)
├── <feature>.store.ts          # Zustand client store (factory) + its provider, if needed
└── types.ts                    # Types shared within the feature
```

For client state, use the Zustand store-factory + Context-provider pattern from
`stores/ui-store.ts` — never a module-level `create()` store (it leaks state
across requests on the server). App-wide stores live in `stores/`.

Not every feature needs every file — start with what you need.

## The API request flow

```
app/api/<feature>/route.ts   →  features/<feature>/<feature>.controller.ts
   (HTTP method mapping)            (validate input, map result to response)
                                          │
                                          ▼
                              features/<feature>/<feature>.service.ts
                                   (business logic, throws AppError)
                                          │
                                          ▼
                              features/<feature>/<feature>.repository.ts
                                   (data access — later)
```

Rules that keep the code non-redundant:

- **`route.ts` stays thin.** It only maps HTTP verbs to controllers and applies
  wrappers like `withErrorHandling`. No logic.
- **Controllers never contain business rules.** They validate with a Zod schema,
  call services, and return via `ok()` / `created()` from `lib/api/response.ts`.
- **Services never touch `Request`/`Response`.** Plain inputs in, plain data out,
  `AppError` on failure. Reusable from routes, Server Actions, or other services.
- **Don't hand-build error responses.** Throw `NotFoundError`, `BadRequestError`,
  etc. from `lib/errors.ts`; `withErrorHandling` maps them to the right status.
- **One response envelope** for everything: `{ success, data }` or
  `{ success, error }`. Defined in `lib/api/response.ts`.

See `features/health/` for a minimal end-to-end example.

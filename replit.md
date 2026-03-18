# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Class Booking System (YOGA LIFE VN PREMIUM)

- **bookings table**: `id, userId, classId, bookingDate (YYYY-MM-DD), status (confirmed/cancelled), createdAt`
- **API routes**: `GET /api/bookings`, `POST /api/bookings`, `DELETE /api/bookings/:id`
- **Business rules**: Booking opens 24 hours before class · Cancellation allowed up to 1 hour before
- **PREMIUM center (id=4)**: YOGA LIFE VN PREMIUM, Hà Nội, 51 class slots seeded
  - Weekday schedule (Mon–Fri): 06:00, 07:30, 09:00, 11:30, 16:30 (adult), 17:30 (kids), 18:45
  - Weekend schedule (Sat–Sun): 07:00, 07:30, 09:00, 11:30, 16:30 (adult), 16:30 (kids), 18:00 (adult), 18:00 (dance)
- **Frontend**: Classes page shows "Book Class" button on all PREMIUM classes, booking modal with date picker, my-bookings summary bar, cancel confirmation

## Membership Types & Access Gating

- **`type` column** added to membershipsTable: `online | offline | both | drop_in` (default: `offline`)
- **Platform memberships (centerId=4)**: Online Access 499k, Offline Access 799k, Both 1099k, Drop-In Pass 150k (ids 7–10)
- **Gating logic**:
  - `OnlineClasses.tsx`: requires `membershipType === 'online' || 'both'` on an active enrollment → shows `MembershipUpgradeModal` if not met
  - `Classes.tsx`: requires `membershipType === 'offline' || 'both' || 'drop_in'` → shows `MembershipUpgradeModal` if not met
- **`MembershipUpgradeModal`** (`src/components/MembershipUpgradeModal.tsx`): shows login gate or membership selection; filters to centerId=4 platform plans; prop `reason: 'online' | 'offline'`
- **Memberships page**: split into "Access Plans" (centerId=4) and "Center Memberships" (centerId≠4) sections

## Home Page Sections

- **Teachers section**: 4 hardcoded instructors (photo, name, title, styles, certifications)
- **Teacher Training section**: 200h / 300h / 500h program cards with IYTTC + YOGA LIFE VN dual certification badges; translation keys in `t.home` (t200Title/Desc/Features, t300*, t500*, teacherTrainingTitle, teacherTrainingDesc, hoursLabel, trainingApply, trainingLearn, iyttcCert, yogalifeCert)
- **Navbar**: Pricing link removed — nav is now: Home | Classes | Online (NEW) | Studios

## i18n (Internationalization)

Full EN/VI language support implemented across all public-facing pages:
- **Language system**: `lib/translations.ts` (full EN+VI strings), `lib/lang-context.tsx` (LangProvider + useLang hook), persisted in `localStorage` as `yoga_lang`
- **Default**: English. Switcher: EN/VI pill in Navbar
- **Coverage**: Navbar, Home, Centers, Classes, Memberships, OnlineClasses, Login, Register, student/Dashboard
- **Admin pages** (super-admin, center-admin) remain in English only

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

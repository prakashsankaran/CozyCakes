# CozyCakes

A warm, modern online cake shop for **CozyCakes**, a home bakery
([@cosycaker](https://www.instagram.com/cosycaker)). Customers discover cakes, personalise them,
pick a date, pay online, and track their order; the baker manages the menu, capacity, and orders.
The web app is mobile-first and installable, and is designed to grow into a native mobile app.

## How we build: spec-driven with GitHub Spec Kit

1. **Constitution**: [.specify/memory/constitution.md](.specify/memory/constitution.md), the
   project's non-negotiable principles.
2. **Specs**: one folder per feature under [`specs/`](specs/). Start with
   [001 CozyCakes Storefront](specs/001-cozycakes-storefront/spec.md).
3. **Workflow**: `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` →
   `/speckit-implement` (skills in `.claude/skills/`).
4. **Rule**: every change updates the relevant spec files in the same pull request.

To (re)install Spec Kit tooling locally:

```bash
uvx --from git+https://github.com/github/spec-kit.git specify init --here --integration claude
```

## Running it locally

Requires Node.js 22+, pnpm 10 and PostgreSQL 16.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local       # then set DATABASE_URL
export DATABASE_URL=postgres://user:pass@localhost:5432/cozycakes
pnpm db:migrate && pnpm db:seed                    # schema + placeholder menu
pnpm dev                                           # http://localhost:3000
```

Checks: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (unit), and
`pnpm --filter web build && pnpm test:e2e` (Playwright + axe, needs the seeded database).

## Repository layout

| Path | What lives there |
| --- | --- |
| `apps/web` | Next.js 16 app: storefront, (later) back office, and the `/api/v1` API |
| `packages/core` | Framework-agnostic domain rules and zod API schemas, shared with the future mobile app |
| `packages/db` | Drizzle schema, migrations, seed data and repositories |
| `packages/design-tokens` | Colours, type, radii, shadows and motion for web and mobile |

## Status

Storefront browsing (User Story 1) is built: story-led home page, filterable menu and cake pages.
Next up: the "build your cake" flow and cart (User Story 2). Progress is tracked in
[tasks.md](specs/001-cozycakes-storefront/tasks.md).

# Implementation Plan: CozyCakes Storefront (end-to-end MVP)

**Branch**: `001-cozycakes-storefront` | **Date**: 2026-10-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-cozycakes-storefront/spec.md`

## Summary

Build CozyCakes' first online store: a story-led, mobile-first storefront where customers discover
cakes, personalise them in a playful step-by-step builder, choose a fulfilment date that respects
the baker's lead times and daily capacity, pay online, and track their order; plus a phone-friendly
back office for the baker to manage the menu, availability, and orders.

Technical approach: a TypeScript monorepo with one Next.js web app (`apps/web`) and shared packages
for domain logic, database, and design tokens, so a future Expo mobile app can reuse the rules,
schemas, tokens, and the versioned `/api/v1` HTTP API. PostgreSQL holds the data, Razorpay handles
payments (behind an interface), Cloudinary serves images, and Resend sends email. See
[research.md](./research.md) for each decision.

## Technical Context

**Language/Version**: TypeScript (strict) on Node.js LTS

**Primary Dependencies**: Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS v4,
Radix UI primitives, CSS animations + React `<ViewTransition>` (Motion only if US2 needs it), zod,
Drizzle ORM + postgres.js, Better Auth, Razorpay SDK, Cloudinary, Resend + React Email, a
hand-written service worker (PWA)

**Storage**: Managed PostgreSQL (Neon or Supabase); Cloudinary for images and reference uploads

**Testing**: Vitest (unit), Playwright (e2e, phone + desktop viewports), axe-core (a11y),
Lighthouse CI (performance budgets)

**Target Platform**: Modern mobile and desktop browsers (last 2 versions of Safari iOS, Chrome
Android, Chrome, Edge, Firefox); installable PWA. Future: iOS/Android via Expo.

**Project Type**: Web application (full-stack Next.js) in a monorepo prepared for a mobile app

**Performance Goals**: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 on a mid-range phone over 4G; storefront
JS for the home page ≤ 200 KB gzipped

**Constraints**: Server-authoritative pricing and capacity; no card data on our servers; WCAG 2.2
AA; respects reduced motion; bakery time zone `Asia/Kolkata`; low fixed hosting cost

**Scale/Scope**: One baker; tens of cakes; up to ~20 orders/day and a few hundred visitors/day at
launch; ~12 customer screens and ~6 back-office screens

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pre-research | Post-design |
|-----------|------|--------------|-------------|
| I. Spec-Driven | Spec reviewed before code; this PR contains only specs; PR template enforces spec updates | ✅ | ✅ |
| II. Delight Over Convention | Story-led browsing, builder, sheet cart, delight moments specified (XR-001…006); single token set | ✅ | ✅ `packages/design-tokens` |
| III. Mobile-First, App-Ready | 360px-first, PWA, shared core + `/api/v1` | ✅ | ✅ contracts in [contracts/api-v1.md](./contracts/api-v1.md) |
| IV. Trustworthy Commerce | Server pricing, hosted payment, webhook-confirmed orders, audit of status changes | ✅ | ✅ `OrderStatusEvent`, idempotent webhook |
| V. Quality Gates | Unit tests for domain logic, e2e per P1 story, a11y + perf budgets in CI | ✅ | ✅ see Testing |
| VI. Simple and Small | One deployable, managed services, no extra infra | ✅ | ✅ monorepo justified below |

Result: **PASS**. One item recorded in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-cozycakes-storefront/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 decisions
├── data-model.md        # Phase 1 entities, rules, state machine
├── quickstart.md        # Phase 1 validation guide
├── contracts/
│   └── api-v1.md        # Phase 1 HTTP API contract
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 (/speckit-tasks, after owner review)
```

### Source Code (repository root)

```text
apps/
└── web/                          # Next.js app (storefront + back office + /api/v1)
    ├── app/
    │   ├── (store)/              # Customer experience
    │   │   ├── page.tsx          # Story-led home
    │   │   ├── cakes/            # Browse + cake detail + builder
    │   │   ├── checkout/         # Fulfilment, date/slot, details, pay
    │   │   ├── orders/[token]/   # Private tracking page
    │   │   ├── cart/             # Sheet cart (placeholder page until US2)
│   │   └── me/               # Account, orders, favourites, addresses
    │   ├── (admin)/admin/        # Back office: orders board, cakes, availability, settings
    │   ├── api/v1/               # REST handlers (thin; call packages/core services)
    │   ├── api/webhooks/razorpay/
    │   └── offline/              # PWA offline page
    ├── components/               # Brand UI: sheets, cards, builder steps, delight effects
    ├── lib/                      # Catalog access, API helpers, auth, image loader
    ├── proxy.ts                  # Next.js 16 request proxy (formerly middleware): admin guard
    └── tests/
        ├── e2e/                  # Playwright (phone + desktop projects)
        └── a11y/

packages/
├── core/                         # Framework-agnostic domain logic (shared with mobile)
│   ├── src/catalog/              # Cake, options, pricing
│   ├── src/availability/         # Lead time, capacity, holds, slots
│   ├── src/orders/               # Order creation, state machine, notifications
│   ├── src/payments/             # PaymentProvider interface + Razorpay adapter
│   ├── src/notify/               # Notifier interface + email adapter
│   ├── src/schemas/              # zod schemas = API contract source
│   └── tests/                    # Vitest unit tests
├── db/                           # Drizzle schema, migrations, seed data
└── design-tokens/                # Colours, type, spacing, radii, motion (web + future mobile)

.github/
├── workflows/ci.yml              # lint, typecheck, unit, e2e, a11y, lighthouse
└── pull_request_template.md      # Includes "Spec files updated" section
```

**Structure Decision**: Monorepo with a single deployable (`apps/web`) and three shared packages.
A future `apps/mobile` (Expo) will depend on `packages/core` and `packages/design-tokens` and call
`/api/v1`. Back office lives inside the same Next.js app under `/admin` to avoid a second deployable.

## Delivery Phases

Each phase ends with something the owner can try on a phone via a preview link.

1. **Foundations**: monorepo, tooling, CI, design tokens, base layout (bottom bar, sheets), PWA
   shell, database schema and seed data with placeholder cakes.
2. **Discover (US1)**: home page, browse with occasion/flavour/dietary filters, cake detail.
3. **Build & cart (US2)**: step-by-step builder with live price and assembling-cake visual,
   reference upload, persistent sheet cart.
4. **Back office core (US5)**: staff sign-in, cake management, availability settings, orders board.
5. **Checkout & pay (US3)**: fulfilment choice, date/slot picker, capacity holds, Razorpay checkout,
   webhook confirmation, confirmation screen and emails.
6. **Track (US4)**: tracking page, status notifications.
7. **Accounts (US6)**: passwordless sign-in, order history, re-order, favourites, addresses.
8. **Polish & launch**: delight pass, a11y and performance audits, real brand assets, production
   payment keys, domain.

## Testing Strategy

- Unit (Vitest, `packages/core`): price calculation, lead-time/earliest-date, capacity with holds,
  discount rules, order state transitions, webhook idempotency.
- E2E (Playwright, phone 390×844 and desktop 1440×900): one journey per P1 story, using the
  Razorpay test mode.
- Accessibility: axe checks on every route in e2e; keyboard-only run of checkout.
- Performance: Lighthouse CI on home, browse, cake detail, checkout with the budgets above.

## Open Questions for the Owner

1. Country/currency and payment provider (assumed India, INR, Razorpay).
2. Delivery: which PIN codes and fees; pickup address and hours.
3. Brand assets: logo, photos, preferred colours/fonts, domain name.
4. Notifications: is WhatsApp needed at launch or is email enough to start?

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Monorepo with shared packages instead of a single app | Owner has committed to a mobile app next; domain rules, schemas, and tokens must be shared | A single Next.js app would force extracting and duplicating pricing/capacity rules when the mobile app starts |

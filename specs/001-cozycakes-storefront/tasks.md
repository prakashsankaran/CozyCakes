---

description: "Task list for the CozyCakes storefront MVP"
---

# Tasks: CozyCakes Storefront (end-to-end MVP)

**Input**: Design documents from `/specs/001-cozycakes-storefront/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/api-v1.md](./contracts/api-v1.md)

**Tests**: Included. Constitution Principle V requires unit tests for domain logic and an
end-to-end test for every P1 user story.

**Organization**: Tasks are grouped by user story in the delivery order from plan.md
(US1 → US2 → US5 → US3 → US4 → US6), so each story is a demonstrable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1…US6)

## Path Conventions

Monorepo: `apps/web/` (Next.js app), `packages/core/`, `packages/db/`, `packages/design-tokens/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo, tooling, and CI

- [x] T001 Create pnpm workspace and Turborepo config in `package.json`, `pnpm-workspace.yaml`, `turbo.json`
- [x] T002 Create shared TypeScript strict config in `tsconfig.base.json`
- [x] T003 [P] Scaffold Next.js App Router app with Tailwind CSS in `apps/web/`
- [x] T004 [P] Scaffold `packages/core/` (TypeScript library + Vitest)
- [x] T005 [P] Scaffold `packages/db/` (Drizzle ORM + drizzle-kit)
- [x] T006 [P] Scaffold `packages/design-tokens/` exporting tokens as TS objects and CSS variables
- [x] T007 [P] Configure ESLint (Next.js config in `apps/web/eslint.config.mjs`) and Prettier at the repo root (`.prettierrc`)
- [x] T008 [P] Add `apps/web/.env.example` documenting every environment variable
- [x] T009 Add GitHub Actions CI running lint, typecheck, unit tests and build in `.github/workflows/ci.yml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Brand system, layout shell, data layer, and shared domain primitives

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T010 Define colour, type, radius, shadow, spacing and motion tokens in `packages/design-tokens/src/tokens.ts`
- [x] T011 Wire tokens into Tailwind theme and global CSS variables in `apps/web/app/globals.css`
- [x] T012 [P] Load display (Fraunces) and text (Nunito Sans) fonts via `next/font` in `apps/web/app/layout.tsx`
- [x] T013 Build the app shell: top brand bar, thumb-reachable bottom navigation (Home, Cakes, Cart, Me) and page transitions in `apps/web/components/shell/`
- [x] T014 [P] Add `useReducedMotion`-aware motion helpers in `apps/web/components/motion/`
- [x] T015 Define Drizzle schema for catalog (Cake, Size, OptionGroup, Option, CakeOptionGroup, Tag) in `packages/db/src/schema/catalog.ts`
- [x] T016 [P] Define Drizzle schema for availability (BakerySettings, TimeSlot, DayAvailability, DeliveryZone, CapacityHold) in `packages/db/src/schema/availability.ts`
- [x] T017 [P] Define Drizzle schema for orders, payments, discounts and uploads in `packages/db/src/schema/orders.ts` (user tables come from Better Auth in T047)
- [x] T018 Generate the initial SQL migration in `packages/db/migrations/`
- [x] T019 Create seed script with placeholder cakes, options, tags and time slots in `packages/db/src/seed.ts`
- [x] T020 [P] Implement money formatting and minor-unit helpers in `packages/core/src/money.ts` with tests
- [x] T021 [P] Implement bakery-time-zone date helpers in `packages/core/src/dates.ts` with tests
- [x] T022 Implement zod schemas for catalog read models in `packages/core/src/schemas/catalog.ts`
- [x] T023 Implement a catalog repository over Drizzle in `packages/db/src/repositories/catalog.ts`
- [x] T024 [P] Add illustrated placeholder art for cakes without photos in `apps/web/components/cake/cake-art.tsx` and allow Cloudinary images in `apps/web/next.config.ts`
- [x] T025 [P] Add API error helper and `/api/v1` route conventions in `apps/web/lib/api.ts`
- [x] T026 [P] Add PWA manifest, icons and offline page in `apps/web/app/manifest.ts`, `apps/web/app/offline/`

**Checkpoint**: Foundation ready; the app shell renders on phone and desktop with seeded data available

---

## Phase 3: User Story 1 - Discover cakes and feel the brand (Priority: P1) 🎯 MVP

**Goal**: Story-led home page, visual browsing with filters, and rich cake detail

**Independent Test**: On a phone, go from home to a cake detail in ≤ 2 taps, filter by Eggless + Birthday, and see a paused cake marked "Back soon"

### Tests for User Story 1

- [x] T027 [P] [US1] Unit tests for filtering and earliest-date calculation in `packages/core/tests/catalog.test.ts`
- [x] T028 [P] [US1] Playwright journey (phone + desktop) for discovery in `apps/web/tests/e2e/discover.spec.ts`

### Implementation for User Story 1

- [x] T029 [P] [US1] Implement catalog filtering and earliest-available-date logic in `packages/core/src/catalog/`
- [x] T030 [US1] Implement `GET /api/v1/home`, `/cakes`, `/cakes/{slug}`, `/tags` in `apps/web/app/api/v1/`
- [x] T031 [US1] Build story-led home page (hero, baker's story, occasion entry points, featured cakes) in `apps/web/app/(store)/page.tsx`
- [x] T032 [US1] Build browse page with swipeable visual cake cards and filter chips (occasion, flavour, dietary) in `apps/web/app/(store)/cakes/page.tsx`
- [x] T033 [US1] Build cake detail with gallery, story, sizes, tags, starting price and earliest date in `apps/web/app/(store)/cakes/[slug]/page.tsx`
- [x] T034 [US1] Show "Back soon" state for paused cakes and friendly empty state for no filter matches
- [x] T035 [US1] Add delight moments: hero entrance, card hover/tilt, shared-element card → detail transition (reduced-motion safe)

**Checkpoint**: Storefront is browsable end to end. ✅ Delivered 2026-10-20; ordering points customers
to Instagram until US2/US3 land.

---

## Phase 4: User Story 2 - Personalise a cake and add it to the cart (Priority: P1)

**Goal**: Step-by-step builder with live price and persistent sheet cart

**Independent Test**: Configure a cake with every option type, confirm the live price, add to cart, reload, edit

### Tests for User Story 2

- [ ] T036 [P] [US2] Unit tests for pricing rules in `packages/core/tests/pricing.test.ts`
- [ ] T037 [P] [US2] Playwright journey for builder and cart in `apps/web/tests/e2e/build-and-cart.spec.ts`

### Implementation for User Story 2

- [ ] T038 [P] [US2] Implement pricing (`unit_price`, `subtotal`) and cart validation in `packages/core/src/pricing.ts`
- [ ] T039 [US2] Implement `POST /api/v1/cart/quote` in `apps/web/app/api/v1/cart/quote/route.ts`
- [ ] T040 [US2] Implement `POST /api/v1/uploads/reference` (signed Cloudinary upload, 10 MB images only)
- [ ] T041 [US2] Build the step-by-step builder (size → flavour → frosting → dietary → add-ons → message → photo) in `apps/web/components/builder/`
- [ ] T042 [US2] Build the "cake assembles" visual summary that updates with each choice
- [ ] T043 [US2] Implement device-persisted cart store in `apps/web/lib/cart/`
- [ ] T044 [US2] Build slide-in cart sheet with edit/remove/quantity and add-to-cart animation in `apps/web/components/cart/`

**Checkpoint**: Customers can build and collect cakes in a cart

---

## Phase 5: User Story 5 - Baker manages menu, availability, and orders (Priority: P1)

**Goal**: Phone-friendly back office

**Independent Test**: Sign in as owner, create a cake, block a date, move a test order to Delivered

### Tests for User Story 5

- [ ] T045 [P] [US5] Unit tests for the order state machine in `packages/core/tests/order-state.test.ts`
- [ ] T046 [P] [US5] Playwright journey for back office in `apps/web/tests/e2e/admin.spec.ts`

### Implementation for User Story 5

- [ ] T047 [US5] Configure Better Auth with email OTP and staff/owner roles in `apps/web/lib/auth.ts`
- [ ] T048 [US5] Protect `/admin` and `/api/v1/admin/*` by role in `apps/web/proxy.ts` (Next.js 16 name for middleware)
- [ ] T049 [P] [US5] Implement order state machine and status-event recording in `packages/core/src/orders/state.ts`
- [ ] T050 [US5] Implement admin cake, option-group and photo-upload endpoints (signed Cloudinary uploads)
- [ ] T051 [US5] Implement admin settings, availability, time-slot and delivery-zone endpoints
- [ ] T052 [US5] Implement admin orders list/detail/transition/cancel endpoints
- [ ] T053 [US5] Build orders board grouped by date and status in `apps/web/app/(admin)/admin/page.tsx`
- [ ] T054 [US5] Build cake editor in `apps/web/app/(admin)/admin/cakes/`
- [ ] T055 [US5] Build availability calendar and settings screens in `apps/web/app/(admin)/admin/availability/`

**Checkpoint**: The baker controls menu and capacity

---

## Phase 6: User Story 3 - Choose a date, check out, and pay online (Priority: P1)

**Goal**: Capacity-aware date picker, guest checkout and Razorpay payment

**Independent Test**: Pay as a guest in Razorpay test mode; order created, capacity reduced, confirmation sent

### Tests for User Story 3

- [ ] T056 [P] [US3] Unit tests for capacity holds, availability calendar and discounts in `packages/core/tests/availability.test.ts`
- [ ] T057 [P] [US3] Integration test for webhook idempotency in `packages/core/tests/webhook.test.ts`
- [ ] T058 [P] [US3] Playwright journey for checkout (incl. failed payment and date-full race) in `apps/web/tests/e2e/checkout.spec.ts`

### Implementation for User Story 3

- [ ] T059 [P] [US3] Implement availability calendar and capacity-hold logic with row locking in `packages/core/src/availability/`
- [ ] T060 [P] [US3] Implement `PaymentProvider` interface and Razorpay adapter in `packages/core/src/payments/`
- [ ] T061 [P] [US3] Implement `Notifier` interface, Resend adapter and React Email templates in `packages/core/src/notify/`
- [ ] T062 [US3] Implement `GET /availability`, `GET /delivery/check`, `POST /checkouts`, `GET /checkouts/{id}`
- [ ] T063 [US3] Implement Razorpay webhook with signature check and idempotent order creation in `apps/web/app/api/webhooks/razorpay/route.ts`
- [ ] T064 [US3] Build checkout flow (fulfilment → date/slot → details → pay) in `apps/web/app/(store)/checkout/`
- [ ] T065 [US3] Build celebratory confirmation screen with baker's thank-you note
- [ ] T066 [US3] Implement discount codes in quote and checkout

**Checkpoint**: End-to-end paid orders work

---

## Phase 7: User Story 4 - Track my order (Priority: P2)

**Goal**: Private tracking timeline and status notifications

**Independent Test**: Advance an order in the back office; tracking page and emails reflect each change

- [ ] T067 [US4] Implement `GET /api/v1/orders/track/{token}`
- [ ] T068 [US4] Build tracking timeline page in `apps/web/app/(store)/orders/[token]/page.tsx`
- [ ] T069 [US4] Send customer notifications on status transitions
- [ ] T070 [P] [US4] Playwright journey for tracking in `apps/web/tests/e2e/track.spec.ts`

---

## Phase 8: User Story 6 - Accounts and favourites (Priority: P3)

**Goal**: Passwordless accounts, history, re-order, favourites, addresses

**Independent Test**: Sign in, save address and favourite, sign in on another device and see both

- [ ] T071 [US6] Customer sign-in screens (email OTP) in `apps/web/app/(store)/me/`
- [ ] T072 [US6] Implement `/me/orders`, `/reorder`, `/favourites`, `/addresses` endpoints
- [ ] T073 [US6] Build "My orders", favourites and addresses screens; attach guest order on "Save my details"
- [ ] T074 [P] [US6] Playwright journey for accounts in `apps/web/tests/e2e/accounts.spec.ts`

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T075 [P] Add axe accessibility checks to every e2e route
- [ ] T076 [P] Add Lighthouse CI with Principle V budgets in `.github/workflows/ci.yml`
- [ ] T077 Generate OpenAPI document from zod schemas at `/api/v1/openapi.json`
- [ ] T078 Replace placeholder brand assets with owner-supplied logo, photos and palette
- [ ] T079 Delight pass: copy voice review (XR-004), empty/error/loading states (XR-005)
- [ ] T080 Run quickstart.md validation end to end

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → **Foundational (Phase 2)** → user stories.
- **US1** has no story dependencies. **US2** needs US1's cake detail. **US5** needs Phase 2 only
  but is delivered after US2 so the baker can manage real catalog data before checkout.
  **US3** needs US2 (cart) and US5 (availability settings). **US4** needs US3 (orders).
  **US6** needs US3 (orders) and US4 (history).
- Within a story: tests and domain logic in `packages/core` first, then API, then UI.

## Parallel Opportunities

- Phase 1: T003–T008 in parallel.
- Phase 2: T012, T014, T016, T017, T020, T021, T024–T026 in parallel after T010/T015.
- US3: T059, T060, T061 in parallel (separate modules).

## Implementation Strategy

1. **MVP first**: Phases 1–3 give a shareable, browsable menu that already replaces the Instagram
   highlight reel.
2. **Increment**: US2 → US5 → US3 makes the shop transactional; each ends with a preview link the
   owner can try on a phone.
3. **Then** US4, US6 and polish before launch.

# Quickstart & Validation Guide: CozyCakes Storefront

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

This guide proves the feature works end to end once implemented. Commands assume the structure in
[plan.md](./plan.md).

## Prerequisites

- Node.js LTS and pnpm
- A PostgreSQL database URL (local Docker or a free Neon/Supabase project)
- Razorpay **test mode** keys and a webhook secret
- Cloudinary and Resend accounts (free tiers)
- `apps/web/.env.local` filled from `apps/web/.env.example` (no secrets committed)

## Setup

```bash
pnpm install
pnpm db:migrate        # apply migrations
pnpm db:seed           # placeholder cakes, options, slots, zones, one owner account
pnpm dev               # http://localhost:3000
```

Expose the webhook locally (e.g., a tunnel) and point the Razorpay test webhook at
`/api/webhooks/razorpay`.

## Automated checks

```bash
pnpm lint && pnpm typecheck
pnpm test              # Vitest: pricing, lead time, capacity, state machine, webhook idempotency
pnpm test:e2e          # Playwright: phone + desktop projects, includes axe checks
pnpm lhci              # Lighthouse budgets: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1
```

All must pass (Constitution Principle V).

## Manual validation scenarios (on a phone or 390px viewport)

1. **Discover (US1)**: open `/`, reach a cake detail in ≤ 2 taps; apply Eggless + Birthday filters;
   confirm a paused cake shows "Back soon" and cannot be added. Enable reduced motion and confirm
   nothing animates.
2. **Build & cart (US2)**: on a cake, choose 1 kg + a topper and confirm the live price equals
   size price + topper; type a 41-character message (blocked at 40); upload a 12 MB file (friendly
   error); add to cart; reload and confirm the cart persists; edit the item.
3. **Checkout (US3)**: with a 2-day lead-time cake, confirm today and tomorrow are disabled; enter a
   non-serviceable PIN code (offered pickup); pay with a Razorpay test card/UPI; confirm the
   celebratory confirmation, the email, and that the date's remaining capacity dropped by one.
   Repeat with a failed payment and confirm no order exists and the hold expires.
4. **Overbooking**: set a date's capacity to 1, open checkout for it in two browsers, pay in one,
   then try the other: it must be told the date is full before being charged.
5. **Back office (US5)**: sign in as owner at `/admin` on a phone; create a cake with photos and
   options in under 5 minutes; block a date and confirm it shows blocked in the storefront; move the
   test order Confirmed → Baking → Ready → Out for delivery → Delivered.
6. **Track (US4)**: open the tracking link from the email and confirm each status change appears
   and triggers an email; confirm a random token returns not found.
7. **Accounts (US6)**: sign in with an email code, see past orders, re-order, favourite a cake,
   and confirm it appears on a second device.
8. **PWA**: install to home screen; go offline and confirm the branded offline page and that the
   cart is kept.

## Expected outcome

Every scenario behaves as described in the acceptance scenarios of [spec.md](./spec.md), and the
API responses match [contracts/api-v1.md](./contracts/api-v1.md).

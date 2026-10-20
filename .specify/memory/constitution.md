# CozyCakes Constitution

## Core Principles

### I. Spec-Driven, Always (NON-NEGOTIABLE)

CozyCakes is built with GitHub Spec Kit. Specifications are the source of truth; code follows them.

- Every new feature starts with `/speckit-specify` → (`/speckit-clarify`) → `/speckit-plan` →
  `/speckit-tasks` → `/speckit-implement`. No feature code is written before its spec and plan exist
  and have been reviewed by the project owner.
- Every pull request that changes behaviour, UI, data, or architecture MUST update the affected
  spec artifacts (`spec.md`, `plan.md`, `data-model.md`, `contracts/`, `tasks.md`, or this
  constitution) in the same pull request. A PR whose code and specs disagree MUST NOT be merged.
- Pure refactors, dependency bumps, and typo fixes that change no behaviour are exempt, and the PR
  description MUST say "No spec impact" with a one-line reason.
- Small changes to an existing feature amend that feature's spec; a genuinely new capability gets
  a new numbered feature directory under `specs/`.

Rationale: the project owner wants the specs to stay a trustworthy description of the product as it
grows iteratively, so anyone (human or agent) can pick it up from the specs alone.

### II. Delight Over Convention

The customer experience MUST feel warm, personal, and special, deliberately unlike a traditional
grid-and-sidebar ecommerce store.

- Browsing is story-led and visual: large photography, editorial layouts, playful motion, and a
  guided "build your cake" flow rather than dense product tables and filter sidebars.
- Every primary screen MUST include at least one considered moment of delight (micro-interaction,
  tasteful animation, personalised copy) that does not slow the task down.
- Motion MUST respect `prefers-reduced-motion`; delight never blocks or delays a purchase.
- Visual decisions come from a single design-token set (colour, type, spacing, radius, motion) so
  the brand stays coherent across web and the future mobile app.

Rationale: the brand promise is "cozy"; a boring store would undercut the product.

### III. Mobile-First, App-Ready

- Every screen is designed and built for a 360px-wide phone first, then scaled up to tablet and
  desktop. No feature ships if it is unusable on a phone.
- The web app MUST be an installable Progressive Web App (manifest, icons, offline fallback page).
- Business logic, validation schemas, and API contracts live in shared, framework-agnostic
  packages and are exposed through a versioned HTTP API, so a native mobile app can be added later
  without rewriting the backend or duplicating rules.

Rationale: the owner plans to extend the site into a mobile app; decisions now must not block that.

### IV. Trustworthy Commerce

- Prices, availability, and order totals are always computed and validated on the server; the
  client is never trusted for money.
- Card/UPI details never touch CozyCakes servers; payments go through a PCI-compliant provider's
  hosted or embedded checkout, and orders are confirmed only from a verified provider webhook.
- Customer personal data is limited to what fulfilment needs, stored securely, and never sold or
  shared beyond fulfilment and payment providers.
- Admin features require authenticated staff accounts; every order state change is recorded with
  who made it and when.

Rationale: a small home business lives on trust; one payment or privacy failure is unrecoverable.

### V. Quality Gates: Tested, Accessible, Fast

- Domain logic (pricing, lead times, capacity, order state machine) MUST have unit tests written
  alongside the code. Each P1 user journey MUST have an end-to-end test.
- UI MUST meet WCAG 2.2 AA: keyboard reachable, visible focus, 4.5:1 text contrast, alt text on
  imagery, and automated accessibility checks in CI.
- Performance budget on a mid-range phone over 4G: Largest Contentful Paint ≤ 2.5s, Interaction to
  Next Paint ≤ 200ms, Cumulative Layout Shift ≤ 0.1. Images are responsive and optimised.
- CI (lint, type-check, unit, e2e, accessibility) MUST be green before merge.

Rationale: delight only counts if it works for everyone, quickly, on the phones customers use.

### VI. Simple and Small

- Prefer managed services and boring, well-documented tools over custom infrastructure; one
  deployable web app plus shared packages until there is a concrete reason for more.
- No speculative features: build what the current spec asks for; the scope grows with the owner.
- Any added complexity (new service, new datastore, new framework) MUST be justified in the plan's
  Complexity Tracking table.

Rationale: a single-baker business needs something cheap to run and easy to change.

## Technology & Platform Constraints

- Language: TypeScript (strict mode) end to end.
- Default web stack: Next.js (App Router) with React, Tailwind CSS driven by shared design tokens,
  and a motion library for animation. Changing the stack is a constitution-level amendment.
- Data: a managed relational database (PostgreSQL) accessed through a typed ORM with migrations
  under version control.
- The HTTP API is documented in each feature's `contracts/` and versioned (`/api/v1`). Breaking
  changes require a new version.
- Secrets live in environment variables, never in the repository.
- Hosting targets low or zero fixed cost at the expected volume of a home bakery.

## Development Workflow

1. Owner describes a change → a feature spec is created or amended (Principle I).
2. Open questions are resolved with `/speckit-clarify` or recorded as assumptions the owner can
   overturn.
3. Plan and tasks are generated; the owner reviews the spec PR before implementation begins for
   any new feature.
4. Implementation PRs reference the spec and tasks they deliver, tick completed tasks in
   `tasks.md`, and include screenshots or recordings for UI changes at phone and desktop widths.
5. Every PR description states which spec files it updates (or "No spec impact" with a reason).
6. `main` is always deployable; work happens on short-lived branches merged via pull request.

## Governance

- This constitution supersedes other practices in the repository. Plans MUST pass the Constitution
  Check gate before research and again after design.
- Amendments are made by pull request that edits this file, states the version bump, and updates
  any dependent templates or specs affected.
- Versioning: MAJOR for removing or redefining a principle, MINOR for adding a principle or
  materially expanding guidance, PATCH for clarifications.
- Reviewers MUST check spec/code consistency (Principle I) and the quality gates (Principle V) on
  every PR. Runtime guidance for coding agents lives in `CLAUDE.md`.

**Version**: 1.0.0 | **Ratified**: 2026-10-20 | **Last Amended**: 2026-10-20

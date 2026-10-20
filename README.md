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

## Status

Specification phase. Implementation starts after the owner reviews the specs.

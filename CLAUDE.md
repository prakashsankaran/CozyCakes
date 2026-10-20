# CozyCakes: guidance for coding agents

- This project is spec-driven with GitHub Spec Kit. Read `.specify/memory/constitution.md` first;
  it overrides everything else here.
- Specs live in `specs/NNN-feature-name/` (spec, plan, research, data-model, contracts, quickstart,
  tasks). Use the `/speckit-*` skills in `.claude/skills/`.
- Every PR that changes behaviour, UI, data, or architecture MUST update the affected spec files in
  the same PR, and the PR description must list them (see `.github/pull_request_template.md`).
- Design must feel warm, modern, and delightful, never like a conventional ecommerce template.
  Build mobile-first and keep domain logic in shared packages so a mobile app can reuse it.

## Active feature

- `specs/001-cozycakes-storefront/`: end-to-end MVP storefront and back office.

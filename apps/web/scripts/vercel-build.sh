#!/usr/bin/env bash
# Vercel build (tasks T081): prepare the database, then build the app.
# Migrations are idempotent; the seed only (re)loads the sample menu when it is missing or older
# than the version in packages/db/src/seed.ts.
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set: skipping migrations and seed (pages will show an error until it is)."
elif [ "${VERCEL_ENV:-}" = "preview" ] && [ "${PREVIEW_DATABASE:-}" != "separate" ]; then
  # Previews use the live database until they get their own Neon branch (tasks T082), so a PR's
  # migrations must wait for the production deploy after it merges. Once previews have their own
  # branch, set PREVIEW_DATABASE=separate for the Preview environment to migrate them too.
  echo "Preview build: leaving the shared database alone (set PREVIEW_DATABASE=separate once previews have their own)."
else
  pnpm --filter @cozycakes/db db:migrate
  pnpm --filter @cozycakes/db db:seed --if-outdated
fi

pnpm next build

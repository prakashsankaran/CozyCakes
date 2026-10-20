#!/usr/bin/env bash
# Vercel build (tasks T081): prepare the database, then build the app.
# Migrations are idempotent; the seed only (re)loads the sample menu when it is missing or older
# than the version in packages/db/src/seed.ts.
set -euo pipefail

if [ -n "${DATABASE_URL:-}" ]; then
  pnpm --filter @cozycakes/db db:migrate
  pnpm --filter @cozycakes/db db:seed --if-outdated
else
  echo "DATABASE_URL is not set: skipping migrations and seed (pages will show an error until it is)."
fi

pnpm next build

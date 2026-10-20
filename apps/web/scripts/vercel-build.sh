#!/usr/bin/env bash
# Vercel build (tasks T081): prepare the database, then build the app.
# Migrations are idempotent; the seed only fills an empty catalog and never overwrites real data.
set -euo pipefail

if [ -n "${DATABASE_URL:-}" ]; then
  pnpm --filter @cozycakes/db db:migrate
  pnpm --filter @cozycakes/db db:seed --if-empty
else
  echo "DATABASE_URL is not set: skipping migrations and seed (pages will show an error until it is)."
fi

pnpm next build

#!/usr/bin/env bash
# Applies the talent schema to the local database after `supabase db reset` (A-7): every talent/migrations/*.sql in
# name order, then talent/seed.sql if present. Part of `npm run db:reset`, locally and in CI.
# Local and CI only: the owner applies talent migrations to hisn-talent by hand (A-10).
set -euo pipefail
cd "$(dirname "$0")/../.."

export LC_ALL=C   # name order, independent of the machine's locale
shopt -s nullglob
files=(talent/migrations/*.sql)
if [ -f talent/seed.sql ]; then files+=(talent/seed.sql); fi

if [ ${#files[@]} -eq 0 ]; then
  echo "apply-talent: no talent migrations"
  exit 0
fi

# SUPABASE_DB_URL when set (CI, .env.local exported); otherwise the running local stack's (owner decision).
db_url="${SUPABASE_DB_URL:-}"
if [ -z "$db_url" ]; then
  db_url=$(supabase status -o env --override-name db.url=SUPABASE_DB_URL 2>/dev/null | sed -n 's/^SUPABASE_DB_URL="\(.*\)"$/\1/p')
fi
if [ -z "$db_url" ]; then
  echo "apply-talent: SUPABASE_DB_URL is not set and \`supabase status\` gave no database URL (is \`supabase start\` running?)" >&2
  exit 1
fi

for file in "${files[@]}"; do
  echo "apply-talent: $file"
  psql "$db_url" -v ON_ERROR_STOP=1 -q -f "$file"
done

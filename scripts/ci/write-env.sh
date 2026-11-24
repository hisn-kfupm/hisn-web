#!/usr/bin/env bash
# Writes .env.local from the running local Supabase (A-7): `npm run env:local`, after `supabase start`.
# Used by CI and by developers. Local values only: never production or talent credentials (CLAUDE.md).
set -euo pipefail
cd "$(dirname "$0")/../.."

status=$(supabase status -o env \
  --override-name api.url=NEXT_PUBLIC_SUPABASE_URL \
  --override-name auth.anon_key=NEXT_PUBLIC_SUPABASE_ANON_KEY \
  --override-name auth.service_role_key=SUPABASE_SERVICE_ROLE_KEY \
  --override-name auth.jwt_secret=SUPABASE_JWT_SECRET \
  --override-name db.url=SUPABASE_DB_URL 2>/dev/null)

value() { printf '%s\n' "$status" | sed -n "s/^$1=\"\(.*\)\"\$/\1/p"; }
url=$(value NEXT_PUBLIC_SUPABASE_URL)
anon_key=$(value NEXT_PUBLIC_SUPABASE_ANON_KEY)
if [ -z "$url" ] || [ -z "$anon_key" ]; then
  echo "env:local: \`supabase status\` gave no API URL or anon key (is \`supabase start\` running?)" >&2
  exit 1
fi

{
  printf '%s\n' "$status"
  # locally the talent client points at the same database (lib/db/talent.ts)
  echo "TALENT_SUPABASE_URL=\"$url\""
  echo "TALENT_SUPABASE_ANON_KEY=\"$anon_key\""
  echo "TOKEN_SECRET=local-test-secret-0123456789abcdef0123"
  echo "CRON_SECRET=local-cron"
  echo "EMAIL_TRANSPORT=smtp"
  echo "SMTP_HOST=127.0.0.1"
  echo "SMTP_PORT=54325"
  echo "SITE_URL=http://localhost:3000"
  echo "MAIL_CATCHER_URL=http://127.0.0.1:54324"
  echo "TALENT_FORM_OPEN=false"
} > .env.local

echo "env:local: wrote .env.local"

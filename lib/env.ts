import 'server-only'
import { z } from 'zod'

// The talent variables are deliberately NOT here. Only lib/db/talent.ts reads them (HR-1).

export type ServerEnv = {
  NEXT_PUBLIC_SUPABASE_URL: string; NEXT_PUBLIC_SUPABASE_ANON_KEY: string; SUPABASE_SERVICE_ROLE_KEY: string;
  TOKEN_SECRET: string;                       // min 32 chars
  EMAIL_TRANSPORT: 'resend' | 'smtp'; RESEND_API_KEY?: string; SMTP_HOST?: string; SMTP_PORT?: number;
  SITE_URL: string; CRON_SECRET: string; EMAIL_ALLOWLIST?: string; NEXT_PUBLIC_SENTRY_DSN?: string;
  RESEND_WEBHOOK_SECRET?: string              // required by A-18's route; absent locally until then
}

// A blank line in .env (`NAME=`) means "not set".
const blankToUndefined = (value: unknown) => (value === '' ? undefined : value)
const required = z.preprocess(blankToUndefined, z.string())
const optional = z.preprocess(blankToUndefined, z.string().optional())

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.preprocess(blankToUndefined, z.string().url()),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: required,
  SUPABASE_SERVICE_ROLE_KEY: required,
  TOKEN_SECRET: z.preprocess(blankToUndefined, z.string().min(32)),
  EMAIL_TRANSPORT: z.preprocess(blankToUndefined, z.enum(['resend', 'smtp'])),
  RESEND_API_KEY: optional,
  SMTP_HOST: optional,
  SMTP_PORT: z.preprocess(blankToUndefined, z.coerce.number().int().positive().optional()),
  SITE_URL: z.preprocess(blankToUndefined, z.string().url()),
  CRON_SECRET: required,
  EMAIL_ALLOWLIST: optional,
  NEXT_PUBLIC_SENTRY_DSN: optional,
  RESEND_WEBHOOK_SECRET: optional,
})

let cached: ServerEnv | undefined

export function serverEnv(): ServerEnv {
  if (cached) return cached
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    // Names and reasons only, never values: these are secrets.
    const problems = parsed.error.issues.map((issue) => `${issue.path.join('.')} (${issue.message})`)
    throw new Error(`Invalid server environment: ${problems.join(', ')}`)
  }
  cached = parsed.data as ServerEnv
  return cached
}

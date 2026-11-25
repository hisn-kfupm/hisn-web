import type { StringKey } from '@/lib/i18n/t'

/** A form's errors by field name, each a key into ar.json and en.json: show it with t(locale, key). */
export type FieldErrors = Partial<Record<string, StringKey>>

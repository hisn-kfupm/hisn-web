import { z } from 'zod'
import { academicLevels, majors } from '@/lib/data/labels'
import type { FieldErrors } from '@/lib/forms/types'
import { LOCALES, type Locale } from '@/lib/i18n/locale'
import type { StringKey } from '@/lib/i18n/t'

/*
  The profile (dev-2 D2-6, spec §9.1 profiles): checked here before any write, and again by the
  table's own checks. Every error message is a string key, so a form shows it with t(locale, key).
  Also used in the browser by the account form (D1-16): nothing server-only here.
*/

export type ProfileInput = {
  full_name_ar: string
  major_code: string
  major_other?: string | null
  academic_level_code: string
  gender: 'male' | 'female'
  announcements_opt_in: boolean
  /** email language */
  locale: Locale
}

const majorCodes = new Set(majors.map((m) => m.code))
const levelCodes = new Set(academicLevels.map((l) => l.code))

const error = (key: StringKey) => ({ error: key })

/**
 * Half of a surrogate pair: a high surrogate with no low one after it, or a low one with no high one before it.
 * No u flag, so the pattern sees the two halves of a pair separately. Not String.prototype.isWellFormed: Firefox
 * has it only from 119, and this schema also runs in the browser.
 */
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/

/** text Postgres can store: no NUL character and no half of a surrogate pair */
const storable = (text: string) => !LONE_SURROGATE.test(text) && !text.includes('\u0000')

/** a length counted in characters (code points), as the table's char_length counts it: an emoji is one */
const characters = (text: string) => [...text].length

/** full_name_ar: 2 to 100 characters once trimmed */
const validNameLength = (name: string) => characters(name) >= 2 && characters(name) <= 100

/** major_other for OTHER: 2 to 80 characters once trimmed */
const validOther = (other: string | null | undefined) => {
  const text = other?.trim() ?? ''
  return storable(text) && characters(text) >= 2 && characters(text) <= 80
}

export const profileSchema: z.ZodType<ProfileInput> = z
  .object(
    {
      full_name_ar: z
        .string(error('profile.error.name'))
        .trim()
        .refine(validNameLength, error('profile.error.name'))
        .refine(storable, error('profile.error.name'))
        // at least one letter: not only invisible characters such as zero-width spaces
        .refine((name) => /\p{L}/u.test(name), error('profile.error.name')),
      major_code: z.string(error('profile.error.major')).refine((code) => majorCodes.has(code), error('profile.error.major')),
      // checked against major_code below
      major_other: z.string(error('profile.error.majorOther')).nullish(),
      academic_level_code: z.string(error('profile.error.level')).refine((code) => levelCodes.has(code), error('profile.error.level')),
      gender: z.enum(['male', 'female'], error('profile.error.gender')),
      announcements_opt_in: z.boolean(error('profile.error.announcements')).default(false),
      locale: z.enum(LOCALES, error('profile.error.locale')),
    },
    error('profile.error.invalid'),
  ) // unknown keys, is_admin among them, are dropped (zod's default)
  .refine((profile) => profile.major_code !== 'OTHER' || validOther(profile.major_other), {
    path: ['major_other'],
    ...error('profile.error.majorOther'),
    // zod skips object checks once any field is invalid; run this one whenever the input is an object
    // and its two fields are fine, so the form shows every problem at once
    when: (payload) =>
      typeof payload.value === 'object' &&
      payload.value !== null &&
      !payload.issues.some((issue) => issue.path?.[0] === 'major_code' || issue.path?.[0] === 'major_other'),
  })
  .transform((profile) => ({ ...profile, major_other: profile.major_code === 'OTHER' ? (profile.major_other?.trim() ?? null) : null }))

/** the first problem on each field, as FieldErrors; a problem with no field goes on `form` */
export function profileErrors(problem: z.ZodError): FieldErrors {
  const errors: FieldErrors = {}
  for (const issue of problem.issues) {
    const field = issue.path.length ? String(issue.path[0]) : 'form'
    errors[field] ??= issue.message as StringKey
  }
  return errors
}

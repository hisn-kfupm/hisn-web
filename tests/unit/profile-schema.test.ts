// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { profileErrors, profileSchema } from '@/lib/profile/schema'

const valid = {
  full_name_ar: 'سارة أحمد',
  major_code: 'SWE',
  academic_level_code: 'BACHELOR',
  gender: 'female',
  announcements_opt_in: true,
  locale: 'ar',
}

/** the valid input with one field left out */
const without = (field: keyof typeof valid) => Object.fromEntries(Object.entries(valid).filter(([key]) => key !== field))

/** the problems as saveProfile returns them: field → string key */
const problems = (input: unknown) => {
  const result = profileSchema.safeParse(input)
  return result.success ? {} : profileErrors(result.error)
}

/* dev-2 D2-6 */
describe('profileSchema', () => {
  it('needs major_other when the major is OTHER', () => {
    expect(problems({ ...valid, major_code: 'OTHER' })).toStrictEqual({ major_other: 'profile.error.majorOther' })
  })

  it('drops major_other for a listed major', () => {
    const result = profileSchema.safeParse({ ...valid, major_code: 'SWE', major_other: 'x' })
    expect(result.success && result.data.major_other).toBeNull()
  })

  it('rejects an unknown academic level', () => {
    expect(problems({ ...valid, academic_level_code: 'NOPE' })).toStrictEqual({ academic_level_code: 'profile.error.level' })
  })

  it('rejects an unknown gender', () => {
    expect(problems({ ...valid, gender: 'x' })).toStrictEqual({ gender: 'profile.error.gender' })
  })

  it('reads a missing announcements choice as no', () => {
    expect(profileSchema.parse(without('announcements_opt_in')).announcements_opt_in).toBe(false)
  })

  it('drops keys it does not know, is_admin included (HR-4)', () => {
    const result = profileSchema.safeParse({ ...valid, is_admin: true })
    expect(result.success).toBe(true)
    expect(result.success && 'is_admin' in result.data).toBe(false)
  })

  it('needs an email language, ar or en', () => {
    expect(problems(without('locale'))).toStrictEqual({ locale: 'profile.error.locale' })
    expect(problems({ ...valid, locale: 'fr' })).toStrictEqual({ locale: 'profile.error.locale' })
    expect(profileSchema.safeParse({ ...valid, locale: 'en' }).success).toBe(true)
  })

  /* The rest of the rules in D2-6's interface */
  it('trims the name and keeps it between 2 and 100 characters', () => {
    const result = profileSchema.safeParse({ ...valid, full_name_ar: '  سارة  ' })
    expect(result.success && result.data.full_name_ar).toBe('سارة')
    expect(problems({ ...valid, full_name_ar: ' س ' })).toStrictEqual({ full_name_ar: 'profile.error.name' })
    expect(problems({ ...valid, full_name_ar: 'س'.repeat(101) })).toStrictEqual({ full_name_ar: 'profile.error.name' })
  })

  it('keeps a trimmed major_other of 2 to 80 characters for OTHER', () => {
    const result = profileSchema.safeParse({ ...valid, major_code: 'OTHER', major_other: '  هندسة طيران  ' })
    expect(result.success && result.data.major_other).toBe('هندسة طيران')
    expect(problems({ ...valid, major_code: 'OTHER', major_other: ' x ' })).toStrictEqual({ major_other: 'profile.error.majorOther' })
    expect(problems({ ...valid, major_code: 'OTHER', major_other: 'x'.repeat(81) })).toStrictEqual({ major_other: 'profile.error.majorOther' })
  })

  it('rejects a major that is not in data/majors.json', () => {
    expect(problems({ ...valid, major_code: 'NOPE' })).toStrictEqual({ major_code: 'profile.error.major' })
  })

  // the form shows every problem at once, not one per submit
  it('reports every bad field together', () => {
    expect(Object.keys(problems({ ...valid, full_name_ar: '', major_code: 'OTHER', gender: 'x' })).sort()).toStrictEqual(['full_name_ar', 'gender', 'major_other'])
  })

  /* Input that must come back as errors, never as a crash or a database error */
  it('answers input that is not an object with a form error, without throwing', () => {
    for (const input of [null, undefined, 'x', 42, []]) expect(problems(input), String(input)).toStrictEqual({ form: 'profile.error.invalid' })
  })

  it('counts characters as the database does: an emoji is one', () => {
    expect(problems({ ...valid, major_code: 'OTHER', major_other: '😀' })).toStrictEqual({ major_other: 'profile.error.majorOther' })
    expect(profileSchema.safeParse({ ...valid, major_code: 'OTHER', major_other: '😀'.repeat(41) }).success).toBe(true)
  })

  // the table's char_length counts characters, and so does the schema, explicitly (review of #22); zod 4.6's
  // min/max count code points too, so these cases pin the rule rather than differ from zod
  it('counts the name in characters as the database does, not in UTF-16 code units', () => {
    // one character outside the BMP: two code units, one character
    expect(problems({ ...valid, full_name_ar: '𠀀' })).toStrictEqual({ full_name_ar: 'profile.error.name' })
    // 100 characters, 101 code units
    expect(profileSchema.safeParse({ ...valid, full_name_ar: 'س'.repeat(99) + '😀' }).success).toBe(true)
    expect(problems({ ...valid, full_name_ar: 'س'.repeat(100) + '😀' })).toStrictEqual({ full_name_ar: 'profile.error.name' })
  })

  it('rejects text the database cannot store: a NUL, or half a surrogate pair', () => {
    for (const bad of ['سا\u0000رة', 'سارة\ud800', '\udc00سارة']) {
      expect(problems({ ...valid, full_name_ar: bad })).toStrictEqual({ full_name_ar: 'profile.error.name' })
      expect(problems({ ...valid, major_code: 'OTHER', major_other: `تخصص ${bad}` })).toStrictEqual({ major_other: 'profile.error.majorOther' })
    }
    // for a listed major, major_other is dropped anyway
    expect(profileSchema.parse({ ...valid, major_other: 'x\u0000' }).major_other).toBeNull()
  })

  // the account form runs this schema in the browser, and Firefox has isWellFormed only from 119 (review of #22)
  it('works without String.prototype.isWellFormed', () => {
    const original = Object.getOwnPropertyDescriptor(String.prototype, 'isWellFormed')
    Reflect.deleteProperty(String.prototype, 'isWellFormed')
    try {
      expect('isWellFormed' in String.prototype).toBe(false)
      expect(profileSchema.safeParse(valid).success).toBe(true)
      expect(profileSchema.safeParse({ ...valid, major_code: 'OTHER', major_other: 'هندسة طيران' }).success).toBe(true)
      for (const bad of ['سارة\ud800', '\udc00سارة']) {
        expect(problems({ ...valid, full_name_ar: bad })).toStrictEqual({ full_name_ar: 'profile.error.name' })
        expect(problems({ ...valid, major_code: 'OTHER', major_other: `تخصص ${bad}` })).toStrictEqual({ major_other: 'profile.error.majorOther' })
      }
    } finally {
      if (original) Object.defineProperty(String.prototype, 'isWellFormed', original)
    }
    expect(typeof ''.isWellFormed).toBe('function')
  })

  it('needs a letter in the name, not only invisible characters', () => {
    expect(problems({ ...valid, full_name_ar: '​​' })).toStrictEqual({ full_name_ar: 'profile.error.name' })
  })
})

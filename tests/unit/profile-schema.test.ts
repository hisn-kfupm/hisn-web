// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { profileSchema } from '@/lib/profile/schema'

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

/** the field each problem was reported on, with its string key */
const problems = (input: unknown) => {
  const result = profileSchema.safeParse(input)
  return result.success ? {} : Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]))
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
    const result = profileSchema.safeParse(without('announcements_opt_in'))
    expect(result.success && result.data.announcements_opt_in).toBe(false)
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
})

import { describe, expect, it, vi } from 'vitest'
import { libraryDepartment } from '@/components/library/LibraryBody'
import { departments } from '@/lib/data/labels'

vi.mock('next/cache', () => ({ cacheLife: vi.fn() }))

/* dev-1 D1-12: ?d=<CODE> filters by a department code; anything else means no filter */
describe('library filter', () => {
  it('accepts a department code from the data file', () => {
    expect(libraryDepartment(departments[2].code)).toBe(departments[2].code)
  })

  it('ignores unknown codes, empty values and slugs', () => {
    expect(libraryDepartment('DEPT_99')).toBeNull()
    expect(libraryDepartment('')).toBeNull()
    expect(libraryDepartment(undefined)).toBeNull()
    expect(libraryDepartment(departments[0].slug)).toBeNull()
  })

  it('uses the first value when the parameter repeats', () => {
    expect(libraryDepartment([departments[1].code, departments[3].code])).toBe(departments[1].code)
  })
})

import majorsData from '@/data/majors.json'
import levelsData from '@/data/academic-levels.json'
import departmentsData from '@/data/departments.json'

export type DataFile = 'majors' | 'levels' | 'departments'
type Labelled = { code: string; ar: string; en: string }

export const majors: Labelled[] = majorsData
export const academicLevels: Labelled[] = levelsData
export const departments: { code: string; slug: string; icon: string }[] = departmentsData

const lists: Record<'majors' | 'levels', Labelled[]> = { majors, levels: academicLevels }

function find(file: 'majors' | 'levels', code: string): Labelled {
  const hit = lists[file].find((item) => item.code === code)
  if (!hit) throw new Error(`unknown code ${code}`)
  return hit
}

/** Arabic label for a code. Throws `unknown code X` for codes not in the data file. */
export function label(file: 'majors' | 'levels', code: string): string {
  return find(file, code).ar
}

/** English label for a code. Same throw as `label`. */
export function labelEn(file: 'majors' | 'levels', code: string): string {
  return find(file, code).en
}

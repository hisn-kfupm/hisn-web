import { describe, expect, it } from 'vitest'
import { hasDeptIcon } from '@/lib/data/dept-icons'
import { academicLevels, departments, label, labelEn, majors } from '@/lib/data/labels'
import { t, type StringKey } from '@/lib/i18n/t'

/*
  The final departments and majors, exactly as Abdullah sent them on 22 Nov 2026. The database
  checks these codes (A-3's check constraints copy them), so the data files must equal these lists;
  change both together, and only by appending after launch.
*/
const FINAL_DEPARTMENTS = [
  { code: 'SECTOR_AWARENESS', slug: 'sector-awareness', icon: 'Compass' },
  { code: 'CAREER_READINESS', slug: 'career-readiness', icon: 'Briefcase' },
  { code: 'SYSTEMS_INTEGRATION', slug: 'systems-integration', icon: 'Workflow' },
  { code: 'CYBERSECURITY', slug: 'cybersecurity', icon: 'ShieldCheck' },
  { code: 'MANUFACTURING_DESIGN', slug: 'manufacturing-design', icon: 'Factory' },
  { code: 'DATA_ANALYSIS', slug: 'data-analysis', icon: 'LineChart' },
]

const FINAL_DEPARTMENT_TITLES: Record<string, string> = {
  SECTOR_AWARENESS: 'التوعية بالقطاع',
  CAREER_READINESS: 'التأهيل المهني',
  SYSTEMS_INTEGRATION: 'الأنظمة والتكامل',
  CYBERSECURITY: 'الأمن السيبراني',
  MANUFACTURING_DESIGN: 'التصنيع والتصميم',
  DATA_ANALYSIS: 'البيانات والتحليل',
}

const FINAL_MAJORS = [
  { code: 'EE', ar: 'الهندسة الكهربائية', en: 'Electrical Engineering' },
  { code: 'ME', ar: 'الهندسة الميكانيكية', en: 'Mechanical Engineering' },
  { code: 'AE', ar: 'هندسة الطيران والفضاء', en: 'Aerospace Engineering' },
  { code: 'CE', ar: 'هندسة الحاسب', en: 'Computer Engineering' },
  { code: 'IE', ar: 'الهندسة الصناعية', en: 'Industrial Engineering' },
  { code: 'CIE', ar: 'هندسة التحكم والأجهزة', en: 'Control and Instrumentation Engineering' },
  { code: 'MATE', ar: 'هندسة المواد', en: 'Materials Engineering' },
  { code: 'CHE', ar: 'الهندسة الكيميائية', en: 'Chemical Engineering' },
  { code: 'MARE', ar: 'الهندسة البحرية', en: 'Marine Engineering' },
  { code: 'CIVE', ar: 'الهندسة المدنية', en: 'Civil Engineering' },
  { code: 'PHYS', ar: 'الفيزياء', en: 'Physics' },
  { code: 'CHEM', ar: 'الكيمياء', en: 'Chemistry' },
  { code: 'MATH', ar: 'الرياضيات', en: 'Mathematics' },
  { code: 'STAT', ar: 'الإحصاء', en: 'Statistics' },
  { code: 'CS', ar: 'علوم الحاسب', en: 'Computer Science' },
  { code: 'SWE', ar: 'هندسة البرمجيات', en: 'Software Engineering' },
  { code: 'SEC', ar: 'الأمن السيبراني', en: 'Cybersecurity' },
  { code: 'AIDS', ar: 'الذكاء الاصطناعي وعلوم البيانات', en: 'Artificial Intelligence and Data Science' },
  { code: 'IS', ar: 'نظم المعلومات', en: 'Information Systems' },
  { code: 'BA', ar: 'إدارة الأعمال', en: 'Business Administration' },
  { code: 'SCM', ar: 'سلاسل الإمداد', en: 'Supply Chain Management' },
  { code: 'FIN', ar: 'المالية', en: 'Finance' },
  { code: 'ACC', ar: 'المحاسبة', en: 'Accounting' },
  { code: 'ECON', ar: 'الاقتصاد', en: 'Economics' },
  { code: 'HR', ar: 'الموارد البشرية', en: 'Human Resources' },
  { code: 'LAW', ar: 'القانون', en: 'Law' },
  { code: 'IRPS', ar: 'العلاقات الدولية والعلوم السياسية', en: 'International Relations and Political Science' },
  { code: 'TRANS', ar: 'الترجمة', en: 'Translation' },
  { code: 'OTHER', ar: 'أخرى', en: 'Other' },
]

describe('the final departments and majors', () => {
  it('are the data files, exactly and in order', () => {
    expect(departments).toEqual(FINAL_DEPARTMENTS)
    expect(majors).toEqual(FINAL_MAJORS)
  })
  it('give each department its final Arabic title in ar.json, without the draft marker', () => {
    for (const d of departments) expect(t('ar', `dept.${d.code}.title` as StringKey)).toBe(FINAL_DEPARTMENT_TITLES[d.code])
  })
  it('have an icon for every department', () => {
    for (const d of departments) expect(hasDeptIcon(d.icon)).toBe(true)
  })
})

describe('labels', () => {
  it('maps codes to Arabic and English', () => {
    expect(label('majors', 'OTHER', 'ar')).toBe('أخرى')
    expect(label('majors', 'OTHER', 'en')).toBe('Other')
    expect(label('levels', 'PHD', 'ar')).toBe('دكتوراه')
    expect(label('levels', 'PHD', 'en')).toBe('Doctorate')
    expect(labelEn('levels', 'BACHELOR')).toBe("Bachelor's")
  })
  it('throws on unknown codes in both languages', () => {
    expect(() => label('majors', 'NOPE', 'ar')).toThrow('unknown code NOPE')
    expect(() => label('majors', 'NOPE', 'en')).toThrow('unknown code NOPE')
    expect(() => labelEn('majors', 'NOPE')).toThrow('unknown code NOPE')
  })
  it('has an English name for every major and level', () => {
    for (const item of [...majors, ...academicLevels]) expect(item.en.trim()).not.toBe('')
  })
  it('keeps OTHER last', () => {
    expect(majors[majors.length - 1].code).toBe('OTHER')
  })
  it('has unique uppercase major codes and Arabic names', () => {
    expect(new Set(majors.map((m) => m.code)).size).toBe(majors.length)
    for (const m of majors) {
      expect(m.code).toMatch(/^[A-Z]+$/)
      expect(m.ar.trim()).not.toBe('')
    }
  })
  it('has unique department codes and clean slugs', () => {
    expect(new Set(departments.map((d) => d.code)).size).toBe(departments.length)
    for (const d of departments) expect(d.slug).toMatch(/^[a-z0-9-]+$/)
  })
})

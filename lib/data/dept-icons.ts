import { Briefcase, Compass, Factory, LineChart, Shield, ShieldCheck, Workflow, type LucideIcon } from 'lucide-react'
import { departments } from '@/lib/data/labels'

/*
  Lucide icons by the names used in data/departments.json (the final list, 22 Nov 2026). Listed
  one by one instead of importing lucide's whole `icons` object, which would ship every icon to
  the browser: when a department is added, import its icon here. tests/unit/labels.test.ts checks
  that every department has one.
*/
const ICONS: Record<string, LucideIcon> = { Shield, Compass, Briefcase, Workflow, ShieldCheck, Factory, LineChart }

export function hasDeptIcon(name: string): boolean {
  return name in ICONS
}

/** the department's icon, or Shield for an unknown or missing department */
export function deptIcon(code: string | null): LucideIcon {
  const name = departments.find((d) => d.code === code)?.icon
  return (name && ICONS[name]) || Shield
}

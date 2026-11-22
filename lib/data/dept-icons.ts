import { ChartNoAxesCombined, Compass, Factory, GraduationCap, LockKeyhole, Shield, Waypoints, type LucideIcon } from 'lucide-react'
import { departments } from '@/lib/data/labels'

/*
  Lucide icons by the names used in data/departments.json. Listed one by one instead of importing
  lucide's whole `icons` object, which would ship every icon to the browser. When A-1's real
  department icons arrive, import each one here (the current six are stand-ins); tests/unit/event-image.test.tsx checks the list.
*/
const ICONS: Record<string, LucideIcon> = { Shield, Compass, GraduationCap, Waypoints, LockKeyhole, Factory, ChartNoAxesCombined }

export function hasDeptIcon(name: string): boolean {
  return name in ICONS
}

/** the department's icon, or Shield for an unknown or missing department */
export function deptIcon(code: string | null): LucideIcon {
  const name = departments.find((d) => d.code === code)?.icon
  return (name && ICONS[name]) || Shield
}

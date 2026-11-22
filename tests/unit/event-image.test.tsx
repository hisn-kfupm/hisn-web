import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { EventImage } from '@/components/EventImage'
import { deptIcon, hasDeptIcon } from '@/lib/data/dept-icons'
import { departments } from '@/lib/data/labels'
import { Shield } from 'lucide-react'

describe('EventImage', () => {
  it('shows the event image when there is one', () => {
    const { container } = render(<EventImage imageUrl="https://x/y.png" departmentCode="DEPT_1" />)
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://x/y.png')
    expect(container.querySelector('[data-testid="dept-icon"]')).toBeNull()
  })

  it('falls back to the department icon without an image', () => {
    const { container } = render(<EventImage imageUrl={null} departmentCode="DEPT_1" />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('[data-testid="dept-icon"]')).not.toBeNull()
  })

  it('falls back to the department icon when the image fails to load', () => {
    const { container } = render(<EventImage imageUrl="https://x/broken.png" departmentCode="DEPT_1" />)
    fireEvent.error(container.querySelector('img')!)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('[data-testid="dept-icon"]')).not.toBeNull()
  })

  it('still shows an icon without a department', () => {
    const { container } = render(<EventImage imageUrl={null} departmentCode={null} />)
    expect(container.querySelector('[data-testid="dept-icon"] svg')).not.toBeNull()
  })
})

describe('deptIcon', () => {
  it('knows every icon named in departments.json', () => {
    // when A-1's real icon names arrive, add each one to the map in lib/data/dept-icons.ts
    for (const d of departments) expect(hasDeptIcon(d.icon), d.icon).toBe(true)
  })

  it('falls back to Shield for an unknown or missing department', () => {
    expect(deptIcon('NOPE')).toBe(Shield)
    expect(deptIcon(null)).toBe(Shield)
  })
})

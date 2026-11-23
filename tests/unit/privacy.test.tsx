import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import PrivacyPage from '@/app/[locale]/privacy/page'
import { TALENT_RETENTION_MONTHS } from '@/lib/config/retention'
import { t } from '@/lib/i18n/t'

/* dev-1 D1-6 (the page part) */
describe('privacy page', () => {
  it('shows the contact address and the unset retention text', () => {
    const { container } = render(<PrivacyPage />)
    expect(container.textContent).toContain('Contact@Hisn-sa.org')
    expect(TALENT_RETENTION_MONTHS).toBeNull()
    expect(container.textContent).toContain(t('privacy.retention.unset'))
  })

  it('isolates the Latin address inside the Arabic text', () => {
    const { container } = render(<PrivacyPage />)
    const bdi = container.querySelector('bdi')
    expect(bdi?.textContent).toBe('Contact@Hisn-sa.org')
    expect(bdi?.getAttribute('lang')).toBe('en')
  })

  it('has one h1 and an index of its sections', () => {
    render(<PrivacyPage />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const index = screen.getByRole('navigation', { name: t('privacy.index') })
    for (const a of index.querySelectorAll('a')) {
      const id = a.getAttribute('href')!.slice(1)
      expect(document.getElementById(id)).not.toBeNull()
    }
  })
})

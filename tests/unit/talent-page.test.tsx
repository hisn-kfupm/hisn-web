import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import TalentPage from '@/app/[locale]/talent/page'
import { t } from '@/lib/i18n/t'

/** a page's props for one language */
const inLocale = (locale: 'ar' | 'en') => ({ params: Promise.resolve({ locale }) })

/*
  The public half of dev-1 D1-17. The form waits for A-11 (fields, consent, TALENT_FORM_OPEN), so
  the page is the explanation and the «يفتح قريبًا» state: dev-1's "flag off" case.
*/
describe('talent page (form not open yet)', () => {
  it('renders no form and says the form opens soon', async () => {
    const { container } = render(await TalentPage(inLocale('ar')))
    expect(container.querySelector('form')).toBeNull()
    expect(screen.getByText(t('ar', 'talent.opensSoon'))).toBeInTheDocument()
  })

  it('has one h1, the approved line, and links to the events and the privacy page', async () => {
    render(await TalentPage(inLocale('ar')))
    const h1 = screen.getAllByRole('heading', { level: 1 })
    expect(h1).toHaveLength(1)
    expect(h1[0].textContent).toBe(t('ar', 'home.talent.line'))
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/ar/events')
    expect(hrefs).toContain('/ar/privacy')
  })

  it('never asks for the profile fields the server copies (HR-2)', async () => {
    const { container } = render(await TalentPage(inLocale('ar')))
    for (const name of ['email', 'full_name_ar', 'major_code', 'academic_level_code', 'gender']) {
      expect(container.querySelector(`[name="${name}"]`)).toBeNull()
    }
  })
})

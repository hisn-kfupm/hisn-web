import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import TalentPage from '@/app/talent/page'
import { t } from '@/lib/i18n/t'

/*
  The public half of dev-1 D1-17. The form waits for A-11 (fields, consent, TALENT_FORM_OPEN), so
  the page is the explanation and the «يفتح قريبًا» state: dev-1's "flag off" case.
*/
describe('talent page (form not open yet)', () => {
  it('renders no form and says the form opens soon', () => {
    const { container } = render(<TalentPage />)
    expect(container.querySelector('form')).toBeNull()
    expect(screen.getByText(t('talent.opensSoon'))).toBeInTheDocument()
  })

  it('has one h1, the approved line, and links to the events and the privacy page', () => {
    render(<TalentPage />)
    const h1 = screen.getAllByRole('heading', { level: 1 })
    expect(h1).toHaveLength(1)
    expect(h1[0].textContent).toBe(t('home.talent.line'))
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/events')
    expect(hrefs).toContain('/privacy')
  })

  it('never asks for the profile fields the server copies (HR-2)', () => {
    const { container } = render(<TalentPage />)
    for (const name of ['email', 'full_name_ar', 'major_code', 'academic_level_code', 'gender']) {
      expect(container.querySelector(`[name="${name}"]`)).toBeNull()
    }
  })
})

import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import RootLayout from '@/app/[locale]/layout'
import { MobileMenu } from '@/components/MobileMenu'
import { departmentNav, primaryNav } from '@/components/nav-items'

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return files(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

describe('shell without smooth scroll (revision 04 §3)', () => {
  it('has no Lenis: not a dependency, not imported anywhere', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
    expect(pkg.dependencies.lenis).toBeUndefined()
    const importers = ['app', 'components', 'lib'].flatMap(files).filter((f) => /from 'lenis'|useLenis|data-lenis/.test(readFileSync(f, 'utf8')))
    expect(importers).toEqual([])
  })

  it('puts the skip link first, then the header, main and the footer in normal flow (no curtain)', async () => {
    const html = renderToStaticMarkup(await RootLayout({ children: <p>x</p>, params: Promise.resolve({ locale: 'ar' }) }))
    const at = (s: string) => html.indexOf(s)
    expect(at('href="#main"')).toBeGreaterThan(-1)
    expect(at('href="#main"')).toBeLessThan(at('data-testid="site-header"'))
    expect(at('data-testid="site-header"')).toBeLessThan(at('id="main"'))
    expect(at('id="main"')).toBeLessThan(at('<footer'))
    expect(html).not.toMatch(/curtain/)
  })

  it('opens the mobile menu, locks the page scroll, and closes on Escape with focus back on the toggle', () => {
    render(
      <MobileMenu
        labels={{ open: 'open', close: 'close', nav: 'nav', departments: 'deps', university: 'uni' }}
        departments={departmentNav('ar')}
        items={primaryNav('ar')}
      />,
    )
    const toggle = screen.getByRole('button', { name: 'open' })
    fireEvent.click(toggle)
    expect(screen.getByTestId('mobile-menu').hidden).toBe(false)
    expect(document.documentElement.dataset.menu).toBe('open')
    expect(document.documentElement.style.overflow).toBe('hidden')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByTestId('mobile-menu').hidden).toBe(true)
    expect(document.documentElement.dataset.menu).toBeUndefined()
    expect(document.documentElement.style.overflow).toBe('')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'open' }))
  })
})

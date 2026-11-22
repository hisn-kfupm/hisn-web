import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import RootLayout from '@/app/layout'

describe('RootLayout', () => {
  it('renders an Arabic, right-to-left document', () => {
    const html = renderToStaticMarkup(<RootLayout><p>x</p></RootLayout>)
    expect(html).toContain('lang="ar"')
    expect(html).toContain('dir="rtl"')
  })
})

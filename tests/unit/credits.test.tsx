import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { render, within } from '@testing-library/react'
import CreditsPage from '@/app/credits/page'
import { CreditsList } from '@/components/credits/CreditsList'
import { Footer } from '@/components/Footer'
import { CREDITS_FILE, parseCredits } from '@/lib/data/credits'
import { allImages } from '@/lib/data/images'
import { t } from '@/lib/i18n/t'

/* CC BY and CC BY-SA ask for the credit to stay with the site: public/images/stand-in/CREDITS.md
   is linked from the footer through /credits while the stand-in photos are in use. */
const SAMPLE = `# Stand-in photographs

Some intro.

| File | Author | Source | Licence |
|---|---|---|---|
| \`hero-circuit-traces.jpg\` | Peter Shanks from Hobart, Australia | [Green circuit board II (2389301870).jpg](https://commons.wikimedia.org/wiki/File:Green_circuit_board_II_(2389301870).jpg) | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| \`hero-satellite-cleanroom.jpg\` | NASA | [AIM in clean room.jpg](https://commons.wikimedia.org/wiki/File:AIM_in_clean_room.jpg) | Public domain (US government work) |
`

describe('parseCredits', () => {
  it('reads each row of the credits table, brackets inside a link included', () => {
    expect(parseCredits(SAMPLE)).toEqual([
      {
        file: 'hero-circuit-traces.jpg',
        author: 'Peter Shanks from Hobart, Australia',
        title: 'Green circuit board II (2389301870).jpg',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Green_circuit_board_II_(2389301870).jpg',
        license: 'CC BY 2.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
      },
      {
        file: 'hero-satellite-cleanroom.jpg',
        author: 'NASA',
        title: 'AIM in clean room.jpg',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:AIM_in_clean_room.jpg',
        license: 'Public domain (US government work)',
        licenseUrl: null,
      },
    ])
  })
})

describe('the stand-in photo credits', () => {
  const credits = parseCredits(readFileSync(join(process.cwd(), CREDITS_FILE), 'utf8'))

  it('credit every photo the site shows', () => {
    const files = new Set(credits.map((c) => c.file))
    for (const image of allImages) expect(files.has(image.src.split('/').pop() as string)).toBe(true)
  })

  it('list each photo with its author, source and licence, the Latin text isolated', () => {
    const { container } = render(<CreditsList credits={credits} />)
    const rows = container.querySelectorAll<HTMLElement>('[data-credit]')
    expect(rows).toHaveLength(credits.length)
    const [first] = credits
    const row = rows[0]
    expect(within(row).getByRole('link', { name: first.title }).getAttribute('href')).toBe(first.sourceUrl)
    expect(row.textContent).toContain(first.author)
    expect(row.querySelector('bdi[lang="en"]')).not.toBeNull()
    // the thumbnail says what the photo shows, since a Commons title often doesn't
    const image = allImages.find((i) => i.src.endsWith(`/${first.file}`)) as (typeof allImages)[number]
    expect(row.querySelector('img')?.getAttribute('alt')).toBe(t(image.alt))
    expect(t(image.alt)).not.toBe('')
    // a licence with a deed links to it; public domain is the Arabic label, not the raw English cell
    const deed = credits.findIndex((c) => c.licenseUrl)
    expect(within(rows[deed]).getByRole('link', { name: credits[deed].license }).getAttribute('href')).toBe(credits[deed].licenseUrl)
    const pd = credits.findIndex((c) => !c.licenseUrl)
    expect(rows[pd].textContent).toContain(t('credits.publicDomain'))
    expect(rows[pd].textContent).not.toContain(credits[pd].license)
  })

  it('make up a static page with one heading, the trail home and the intro', () => {
    const { container } = render(<CreditsPage />)
    const headings = container.querySelectorAll('h1')
    expect(headings).toHaveLength(1)
    expect(headings[0].textContent).toBe(t('credits.title'))
    expect(within(container).getByRole('link', { name: t('crumbs.home') }).getAttribute('href')).toBe('/')
    expect(container.textContent).toContain(t('credits.intro'))
    expect(container.querySelectorAll('[data-credit]')).toHaveLength(credits.length)
  })
})

describe('Footer', () => {
  it('links to the photo credits', () => {
    const { container } = render(<Footer />)
    expect(within(container).getByRole('link', { name: t('footer.credits') }).getAttribute('href')).toBe('/credits')
  })
})

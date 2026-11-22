import { afterEach, describe, expect, it, vi } from 'vitest'
import { stripDraft, t } from '@/lib/i18n/t'
import { latestRecordings, upcomingEvents } from '@/lib/events/queries'
import ar from '@/lib/i18n/ar.json'

afterEach(() => vi.unstubAllEnvs())

describe('draft markers', () => {
  it('keeps « «مؤقت» » by default', () => {
    expect(t('nav.menuOpen')).toBe(ar['nav.menuOpen'])
    expect(t('nav.menuOpen')).toContain('«مؤقت»')
  })

  it('strips the marker and its leading space when NEXT_PUBLIC_HIDE_DRAFT_MARKERS=1', () => {
    vi.stubEnv('NEXT_PUBLIC_HIDE_DRAFT_MARKERS', '1')
    expect(t('nav.menuOpen')).toBe('فتح القائمة')
    expect(t('seats.left', { n: 3 })).toBe('تبقّى 3 مقعدًا')
  })

  it('leaves approved lines alone', () => {
    vi.stubEnv('NEXT_PUBLIC_HIDE_DRAFT_MARKERS', '1')
    expect(t('brand.slogan')).toBe(ar['brand.slogan'])
    expect(t('brand.closing')).toBe(ar['brand.closing'])
  })

  it('only reacts to the value 1', () => {
    vi.stubEnv('NEXT_PUBLIC_HIDE_DRAFT_MARKERS', '0')
    expect(t('nav.menuOpen')).toContain('«مؤقت»')
  })

  it('strips the marker from stand-in event titles and descriptions when the flag is on', async () => {
    vi.stubEnv('NEXT_PUBLIC_HIDE_DRAFT_MARKERS', '1')
    const events = [...(await upcomingEvents({ limit: 10 })), ...(await latestRecordings({ limit: 10 }))]
    expect(events.length).toBeGreaterThan(0)
    for (const e of events) {
      expect(e.title).not.toContain('مؤقت')
      expect(e.description).not.toContain('مؤقت')
    }
  })

  it('keeps the marker on stand-in rows without the flag', async () => {
    const [first] = await upcomingEvents({ limit: 1 })
    expect(first.title).toContain('«مؤقت»')
    expect(stripDraft('نص «مؤقت»')).toBe('نص «مؤقت»')
  })
})

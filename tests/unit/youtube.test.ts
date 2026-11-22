import { describe, expect, it } from 'vitest'
import { youtubeId } from '@/lib/youtube'

/* dev-1 D1-12 */
describe('youtubeId', () => {
  it('reads a watch URL', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=abc123XYZ_-')).toBe('abc123XYZ_-')
  })

  it('reads a youtu.be short link', () => {
    expect(youtubeId('https://youtu.be/abc123')).toBe('abc123')
  })

  it('reads a shorts URL', () => {
    expect(youtubeId('https://youtube.com/shorts/abc123')).toBe('abc123')
  })

  it('reads an embed URL', () => {
    expect(youtubeId('https://www.youtube.com/embed/abc123')).toBe('abc123')
  })

  it('returns null for another host', () => {
    expect(youtubeId('https://vimeo.com/1')).toBeNull()
  })

  it('returns null for text that is not a URL', () => {
    expect(youtubeId('not a url')).toBeNull()
  })

  it('accepts http, a missing www, and extra query parameters', () => {
    expect(youtubeId('http://youtube.com/watch?v=abc123&t=42')).toBe('abc123')
    expect(youtubeId('https://www.youtube.com/watch?feature=share&v=abc123')).toBe('abc123')
  })
})

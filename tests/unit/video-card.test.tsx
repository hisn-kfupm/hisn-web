import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ActiveVideoProvider } from '@/components/ActiveVideoProvider'
import { VideoCard } from '@/components/VideoCard'

const card = (videoId: string, title: string) => <VideoCard videoId={videoId} title={title} playLabel={`play ${title}`} />

/* dev-1 D1-12 */
describe('VideoCard', () => {
  it('shows the YouTube thumbnail and no player before a click', () => {
    const { container } = render(<ActiveVideoProvider>{card('abc123', 'one')}</ActiveVideoProvider>)
    const img = container.querySelector('img')
    expect(img?.getAttribute('src')).toBe('https://i.ytimg.com/vi/abc123/hqdefault.jpg')
    expect(container.querySelector('iframe')).toBeNull()
  })

  it('plays in place with the privacy-enhanced embed after a click', () => {
    const { container } = render(<ActiveVideoProvider>{card('abc123', 'one')}</ActiveVideoProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'play one' }))
    expect(container.querySelector('iframe')?.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/abc123?autoplay=1')
  })

  it('falls back to the given photo when YouTube answers with its small placeholder', () => {
    const { container } = render(
      <ActiveVideoProvider>
        <VideoCard videoId="standin0001" title="one" playLabel="play one" fallback={{ src: '/images/stand-in/event-talk-audience.jpg' }} />
      </ActiveVideoProvider>,
    )
    const thumb = container.querySelector('img') as HTMLImageElement
    Object.defineProperty(thumb, 'naturalWidth', { value: 120 })
    fireEvent.load(thumb)
    expect(container.querySelector('img[src^="https://i.ytimg.com"]')).toBeNull()
    expect(container.querySelector('img')?.getAttribute('src')).toContain('event-talk-audience')
  })

  it('plays one video at a time: starting a second card stops the first', () => {
    const { container } = render(
      <ActiveVideoProvider>
        {card('abc123', 'one')}
        {card('def456', 'two')}
      </ActiveVideoProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'play one' }))
    fireEvent.click(screen.getByRole('button', { name: 'play two' }))
    const frames = container.querySelectorAll('iframe')
    expect(frames).toHaveLength(1)
    expect(frames[0].getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/def456?autoplay=1')
  })
})

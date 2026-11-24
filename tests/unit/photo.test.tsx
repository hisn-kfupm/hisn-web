import { describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { PageHead } from '@/components/brand/PageHead'
import { Photo } from '@/components/ui/Photo'
import { images } from '@/lib/data/images'

const img = images.talent

describe('Photo', () => {
  it('has the brand grade layer unless the photo fills a large area', () => {
    const graded = render(<Photo image={img} alt="" ratio="4/3" sizes="50vw" />).container
    expect(graded.querySelector('.photo-grade')).not.toBeNull()
    const plain = render(<Photo image={img} alt="" ratio="4/3" sizes="50vw" grade={false} />).container
    expect(plain.querySelector('.photo-grade')).toBeNull()
  })

  it('puts no blend layer over a full-width page-head backdrop (brief 04 §3)', () => {
    const { container } = render(<PageHead locale="ar" title="عنوان" backdrop={{ src: img.src, blurDataURL: img.blurDataURL }} />)
    const backdrop = container.querySelector('.head-scrim')?.parentElement as HTMLElement
    expect(backdrop.querySelector('img')).not.toBeNull()
    expect(backdrop.querySelector('.photo-grade')).toBeNull()
  })

  it('renders an img with the alt text and the sizes it is given', () => {
    const { container } = render(<Photo image={img} alt="نص بديل" ratio="4/3" sizes="(min-width: 1024px) 33vw, 100vw" />)
    const el = container.querySelector('img')!
    expect(el.getAttribute('alt')).toBe('نص بديل')
    expect(el.getAttribute('sizes')).toBe('(min-width: 1024px) 33vw, 100vw')
    expect(el.getAttribute('srcset')).toContain('/_next/image')
  })

  it('is fully visible in the server HTML, before any script runs', () => {
    const html = renderToString(<Photo image={img} alt="نص" ratio="16/9" sizes="100vw" />)
    expect(html).toContain('<img')
    expect(html).not.toMatch(/opacity:\s*0|visibility:\s*hidden|clip-path/)
    expect(html).not.toMatch(/<i[\s>]/)
    expect(html).toContain('aspect-ratio:16/9')
  })

  it('loads lazily unless it is the page’s LCP photo', () => {
    const lazy = render(<Photo image={img} alt="" ratio="1/1" sizes="50vw" />).container.querySelector('img')!
    expect(lazy.getAttribute('loading')).toBe('lazy')
    const lcp = render(<Photo image={img} alt="" ratio="1/1" sizes="50vw" priority />).container.querySelector('img')!
    expect(lcp.getAttribute('loading')).not.toBe('lazy')
    expect(lcp.getAttribute('fetchpriority')).toBe('high')
  })

  it('uses a blur placeholder for local photos', () => {
    const el = render(<Photo image={img} alt="" ratio="3/4" sizes="25vw" />).container.querySelector('img')!
    expect(el.getAttribute('style') ?? '').toContain('data:image/')
  })

  it('shows a remote event image as is, without the optimiser', () => {
    const el = render(<Photo image={{ src: 'https://cdn.example.org/a.jpg' }} alt="" ratio="16/9" sizes="100vw" />).container.querySelector('img')!
    expect(el.getAttribute('src')).toBe('https://cdn.example.org/a.jpg')
  })

  it('adds no reveal cells under reduced motion', () => {
    const mm = vi.spyOn(window, 'matchMedia').mockImplementation(
      (q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList,
    )
    const { container } = render(<Photo image={img} alt="" ratio="4/3" sizes="100vw" />)
    expect(container.querySelectorAll('.photo-cells i')).toHaveLength(0)
    mm.mockRestore()
  })

  it('covers a photo below the fold with at most 24 cells and clears them once it enters', () => {
    let fire: ((entries: { isIntersecting: boolean }[]) => void) | undefined
    const io = vi.spyOn(window, 'IntersectionObserver').mockImplementation(function (this: unknown, cb: unknown) {
      fire = cb as typeof fire
      return { observe() {}, disconnect() {}, unobserve() {}, takeRecords: () => [] } as unknown as IntersectionObserver
    } as unknown as typeof IntersectionObserver)
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 5000 } as DOMRect)
    const { container } = render(<Photo image={img} alt="" ratio="1/1" sizes="100vw" />)
    const layer = container.querySelector('.photo-cells') as HTMLElement
    expect(layer.querySelectorAll('i').length).toBeGreaterThan(0)
    expect(layer.querySelectorAll('i').length).toBeLessThanOrEqual(24)
    expect(layer.hasAttribute('data-play')).toBe(false)
    act(() => fire!([{ isIntersecting: true }]))
    expect(layer.hasAttribute('data-play')).toBe(true)
    rect.mockRestore()
    io.mockRestore()
  })

  it('leaves a photo already on screen at hydration uncovered', () => {
    const { container } = render(<Photo image={img} alt="" ratio="16/9" sizes="100vw" />)
    expect(container.querySelectorAll('.photo-cells i')).toHaveLength(0)
  })
})

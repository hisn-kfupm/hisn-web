import { describe, expect, it } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import ar from '@/lib/i18n/ar.json'
import departmentsData from '@/data/departments.json'
import { allImages, departmentImage, eventCover, images } from '@/lib/data/images'

const publicDir = join(process.cwd(), 'public')

/** width and height from a JPEG's first start-of-frame marker */
function jpegSize(buf: Buffer): { width: number; height: number } {
  expect(buf[0]).toBe(0xff)
  expect(buf[1]).toBe(0xd8)
  let i = 2
  while (i < buf.length) {
    if (buf[i] !== 0xff) throw new Error('bad marker')
    const marker = buf[i + 1]
    const len = buf.readUInt16BE(i + 2)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) }
    }
    i += 2 + len
  }
  throw new Error('no frame')
}

describe('stand-in images', () => {
  it('every mapped file exists as a JPEG of at most 1800 px and about 350 KB, with the size it declares', () => {
    for (const img of allImages) {
      const file = join(publicDir, img.src)
      expect(img.src.startsWith('/images/stand-in/'), img.src).toBe(true)
      expect(statSync(file).size, img.src).toBeLessThanOrEqual(360_000)
      const size = jpegSize(readFileSync(file))
      expect(size, img.src).toEqual({ width: img.width, height: img.height })
      expect(img.width).toBeLessThanOrEqual(1800)
      expect(img.blurDataURL.startsWith('data:image/'), img.src).toBe(true)
    }
  })

  it('every alt text is an ar.json key with a draft marker', () => {
    const strings: Record<string, string> = ar
    for (const img of allImages) {
      expect(strings[img.alt], img.alt).toBeTruthy()
      expect(strings[img.alt].endsWith('«مؤقت»'), img.alt).toBe(true)
    }
  })

  it('credits every file', () => {
    const credits = readFileSync(join(publicDir, 'images/stand-in/CREDITS.md'), 'utf8')
    expect(credits).toMatch(/stand-ins/i)
    for (const img of allImages) expect(credits, img.src).toContain(img.src.split('/').pop()!)
  })

  it('covers every use the revision brief lists', () => {
    expect(images.hero.length).toBeGreaterThanOrEqual(5)
    expect(images.hero.length).toBeLessThanOrEqual(7)
    expect(Object.keys(images.verbs)).toEqual(['learn', 'qualify', 'connect'])
    expect(images.events.length).toBeGreaterThanOrEqual(4)
    expect(images.events.length).toBeLessThanOrEqual(6)
    expect(images.talent).toBeDefined()
    expect(images.library).toBeDefined()
    expect(images.notFound).toBeDefined()
  })

  it('has one photo per department in data/departments.json, all different', () => {
    const srcs = departmentsData.map((d) => departmentImage(d.code).src)
    expect(new Set(srcs).size).toBe(departmentsData.length)
  })
})

describe('eventCover', () => {
  const base = { id: 7, departmentCode: 'DEPT_4' as string | null }

  it('uses the event image when it has one', () => {
    expect(eventCover({ ...base, imageUrl: 'https://cdn.example.org/a.jpg' })).toEqual({ src: 'https://cdn.example.org/a.jpg', remote: true })
  })

  it('otherwise picks one of the department photos by event id, the same one every time', () => {
    const a = eventCover({ ...base, imageUrl: null })
    expect(a.remote).toBe(false)
    expect(eventCover({ ...base, imageUrl: null })).toEqual(a)
    const picks = new Set([1, 2, 3, 4, 5, 6].map((id) => eventCover({ id, departmentCode: 'DEPT_4', imageUrl: null }).src))
    expect(picks.size).toBeGreaterThan(1)
    expect(picks.has(departmentImage('DEPT_4').src)).toBe(true)
  })

  it('falls back to the talk and workshop scenes without a known department', () => {
    const scenes = images.events.map((i) => i.src)
    for (const departmentCode of [null, 'NOPE']) {
      for (const id of [1, 2, 3, 10]) expect(scenes).toContain(eventCover({ id, departmentCode, imageUrl: null }).src)
    }
  })

  it('treats an empty image URL as no image', () => {
    expect(eventCover({ ...base, imageUrl: '' }).remote).toBe(false)
  })
})

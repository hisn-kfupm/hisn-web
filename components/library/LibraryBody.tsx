import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cacheLife } from 'next/cache'
import { ActiveVideoProvider } from '@/components/ActiveVideoProvider'
import { VideoCard } from '@/components/VideoCard'
import { getSession } from '@/lib/auth/session-stub'
import { LIBRARY_REQUIRES_SIGN_IN } from '@/lib/config/flags'
import { eventCover } from '@/lib/data/images'
import { departments } from '@/lib/data/labels'
import { latestRecordings } from '@/lib/events/queries'
import type { PublicEvent } from '@/lib/events/types'
import { fmtNum } from '@/lib/i18n/number'
import { t, type StringKey } from '@/lib/i18n/t'
import { formatRiyadh } from '@/lib/time/riyadh'
import { youtubeId } from '@/lib/youtube'

/** ?d=<CODE>: a department code from data/departments.json, or null (no filter) for anything else */
export function libraryDepartment(param: string | string[] | undefined): string | null {
  const value = Array.isArray(param) ? param[0] : param
  return value && departments.some((d) => d.code === value) ? value : null
}

/** every recording (for the counts) and the filtered list, cached for an hour */
export async function loadLibrary(code: string | null) {
  'use cache'
  cacheLife('hours')
  const all = await latestRecordings({ limit: 60 })
  const list = code ? await latestRecordings({ limit: 60, departmentCode: code }) : all
  return { all, list }
}

/**
 * The library's filter and grid (dev-1 D1-12). It reads the request (?d= and, when the library
 * needs sign-in, the session), so the page renders it inside <Suspense>.
 */
export async function LibraryBody({ searchParams }: { searchParams: Promise<{ d?: string | string[] }> }) {
  if (LIBRARY_REQUIRES_SIGN_IN && !(await getSession())) redirect('/sign-in?returnTo=/library')
  const code = libraryDepartment((await searchParams).d)
  const { all, list } = await loadLibrary(code)
  const count = (c: string | null) => (c ? all.filter((e) => e.departmentCode === c).length : all.length)

  return (
    <section aria-labelledby="library-grid-title" className="bg-page py-12 lg:py-16">
      <div className="wrap">
        <h2 id="library-grid-title" className="sr-only">
          {t('library.grid')}
        </h2>
        <nav aria-label={t('library.filter.label')} className="mb-10">
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            <FilterChip href="/library" label={t('library.filter.all')} n={count(null)} active={code === null} />
            {departments.map((d) => (
              <FilterChip key={d.code} href={`/library?d=${d.code}`} label={t(`dept.${d.code}.title` as StringKey)} n={count(d.code)} active={code === d.code} />
            ))}
          </ul>
        </nav>
        {list.length > 0 ? (
          <ActiveVideoProvider>
            <ul data-testid="library-grid" className="m-0 grid list-none gap-x-6 gap-y-10 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((event) => (
                <RecordingItem key={event.id} event={event} />
              ))}
            </ul>
          </ActiveVideoProvider>
        ) : (
          <p className="text-muted">{code ? t('library.empty') : t('library.emptyAll')}</p>
        )}
      </div>
    </section>
  )
}

function FilterChip({ href, label, n, active }: { href: string; label: string; n: number; active: boolean }) {
  return (
    <li>
      <Link
        href={href}
        scroll={false}
        aria-current={active ? 'true' : undefined}
        className={`inline-flex min-h-11 items-center gap-2.5 border px-4 text-small font-semibold no-underline transition-colors duration-200 ${active ? 'border-deep bg-deep text-white' : 'border-line bg-white text-deep hover:border-teal hover:text-teal'} ${n === 0 && !active ? 'opacity-60' : ''}`}
      >
        {label}
        <span className={`grid min-w-6 place-items-center px-1.5 text-label ${active ? 'bg-mint text-deep' : 'bg-box text-muted'}`}>{fmtNum(n)}</span>
      </Link>
    </li>
  )
}

function RecordingItem({ event }: { event: PublicEvent }) {
  const id = event.recordingUrl ? youtubeId(event.recordingUrl) : null
  if (!id) return null
  const cover = eventCover(event)
  return (
    <li id={`recording-${event.id}`} className="recording-item scroll-mt-[calc(var(--header-h)+1.5rem)]">
      <VideoCard videoId={id} title={event.title} playLabel={t('library.play', { title: event.title })} cardId={String(event.id)} fallback={{ src: cover.src, blurDataURL: cover.remote ? undefined : cover.blurDataURL }}>
        {event.departmentCode && <p className="mt-4 text-label text-accent-strong">{t(`dept.${event.departmentCode}.title` as StringKey)}</p>}
        <h3 className="mt-1 text-[1.0625rem] leading-[1.55] font-bold text-deep lg:text-[1.125rem]">{event.title}</h3>
        <p className="mt-1 text-small text-muted">{formatRiyadh(event.startsAt, 'date')}</p>
      </VideoCard>
    </li>
  )
}

/** the grid's placeholder while the request is read */
export function LibraryFallback() {
  return (
    <section aria-hidden="true" className="bg-page py-12 lg:py-16">
      <div className="wrap">
        <div className="mb-10 h-11 max-w-[40rem] bg-box" />
        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-video bg-box" />
          ))}
        </div>
      </div>
    </section>
  )
}

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cacheLife } from 'next/cache'
import { PageHead } from '@/components/brand/PageHead'
import { SectionHead } from '@/components/brand/SectionHead'
import { LatestRecordings } from '@/components/home/LatestRecordings'
import { TalentBand } from '@/components/home/TalentBand'
import { UpcomingEvents } from '@/components/home/UpcomingEvents'
import { ArrowGlyph } from '@/components/ui/ArrowGlyph'
import { Icon } from '@/components/ui/Icon'
import { deptIcon } from '@/lib/data/dept-icons'
import { departmentImage } from '@/lib/data/images'
import { departments } from '@/lib/data/labels'
import { latestRecordings, upcomingEvents } from '@/lib/events/queries'
import { seatsTaken } from '@/lib/events/seats'
import { fmtNum } from '@/lib/i18n/number'
import { t, type StringKey } from '@/lib/i18n/t'

/*
  The body of /departments/[slug] (dev-1 D1-9). The page renders it inside <Suspense>, so reading
  `params` here keeps client navigations instant (partial prefetching) while the six known slugs are
  still prerendered in full. An unknown slug calls notFound().
*/

type Department = (typeof departments)[number]

const key = (code: string, field: string) => `dept.${code}.${field}` as StringKey

/** this department's events and recordings, cached for an hour */
async function loadDepartment(code: string) {
  'use cache'
  cacheLife('hours')
  const [events, recordings] = await Promise.all([upcomingEvents({ limit: 6, departmentCode: code }), latestRecordings({ limit: 4, departmentCode: code })])
  const taken = await seatsTaken(events.map((e) => e.id))
  return { events, recordings, taken: [...taken.entries()] }
}

export async function DepartmentView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const index = departments.findIndex((d) => d.slug === slug)
  if (index === -1) notFound()
  const dept = departments[index]
  const { events, recordings, taken } = await loadDepartment(dept.code)

  const name = t(key(dept.code, 'title'))
  const roles = [1, 2, 3, 4].map((n) => t(key(dept.code, `role${n}`))).filter((role) => role.trim() !== '')
  const image = departmentImage(dept.code)
  const prev = departments[(index + departments.length - 1) % departments.length]
  const next = departments[(index + 1) % departments.length]

  return (
    <>
      <PageHead
        crumbs={[{ href: '/', label: t('crumbs.home') }, { href: '/#departments', label: t('nav.departments') }, { label: name }]}
        kicker={
          <span className="inline-flex items-center gap-2.5">
            <Icon icon={deptIcon(dept.code)} size={20} className="text-mint" />
            {t('dept.kicker', { n: fmtNum(index + 1, { minimumIntegerDigits: 2 }) })}
          </span>
        }
        title={name}
        photo={{ image, alt: t(image.alt) }}
      >
        <p className="mt-5 max-w-[34em] text-body text-on-dark">{t(key(dept.code, 'summary'))}</p>
      </PageHead>

      <section aria-labelledby="dept-about-title" className="bg-page py-14 lg:py-20">
        <div className="wrap">
          <SectionHead number={1} id="dept-about-title" title={t('dept.about.title')} />
          <p className="max-w-[44em] text-[1.125rem] leading-[1.9] text-text">{t(key(dept.code, 'description'))}</p>
          {roles.length > 0 && (
            <>
              <h3 className="mt-12 text-h3 text-deep">{t('dept.roles.title')}</h3>
              <ol data-testid="roles" className="mt-6 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
                {roles.map((role, i) => (
                  <li key={role} className={`role-brick border-t-4 border-teal bg-white p-5 ${i % 2 === 1 ? 'lg:mt-8' : ''}`}>
                    <span aria-hidden="true" className="grid size-9 place-items-center bg-deep text-[1.0625rem] font-bold text-mint">
                      {fmtNum(i + 1)}
                    </span>
                    <span className="mt-4 block text-[1.0625rem] leading-[1.6] font-semibold text-deep">{role}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </section>

      <UpcomingEvents number={2} events={events} taken={new Map(taken)} title={t('dept.events.title')} headId="dept-events-title" emptyText={t('dept.events.none')} testId="dept-events" />
      <LatestRecordings number={3} recordings={recordings} title={t('dept.recordings.title')} headId="dept-recordings-title" link={{ href: `/library?d=${dept.code}`, label: t('home.recordings.all') }} emptyText={t('dept.recordings.none')} testId="dept-recordings" />
      <TalentBand />

      <nav aria-label={t('dept.siblings')} className="bg-box">
        <div className="wrap grid gap-4 py-10 sm:grid-cols-2 lg:py-14">
          <SiblingLink dept={prev} label={t('dept.prev')} />
          <SiblingLink dept={next} label={t('dept.next')} />
        </div>
      </nav>
    </>
  )
}

function SiblingLink({ dept, label }: { dept: Department; label: string }) {
  return (
    <Link href={`/departments/${dept.slug}`} className="group flex items-center gap-4 border-t-4 border-teal bg-white p-5 text-deep no-underline transition-colors duration-300 hover:bg-deep hover:text-white focus-visible:bg-deep focus-visible:text-white">
      <Icon icon={deptIcon(dept.code)} size={28} className="shrink-0 text-teal group-hover:text-mint group-focus-visible:text-mint" />
      <span className="flex-1">
        <span className="block text-label text-muted group-hover:text-on-dark group-focus-visible:text-on-dark">{label}</span>
        <span className="mt-1 block text-[1.125rem] leading-[1.5] font-bold">{t(key(dept.code, 'title'))}</span>
      </span>
      <ArrowGlyph size={20} />
    </Link>
  )
}

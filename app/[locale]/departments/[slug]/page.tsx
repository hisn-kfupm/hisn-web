import { Suspense } from 'react'
import type { Metadata } from 'next'
import { PageHead } from '@/components/brand/PageHead'
import { DepartmentView } from '@/components/department/DepartmentView'
import { departments } from '@/lib/data/labels'
import { t, type StringKey } from '@/lib/i18n/t'

/*
  /departments/[slug], one page per department (dev-1 D1-9; spec §6.4): the title and summary, the
  description, example roles, this department's upcoming events and recordings, the talent
  invitation, then the previous and next departments (components/department/DepartmentView).

  Static: generateStaticParams lists the six slugs from data/departments.json, so each page is
  prerendered; an unknown slug renders on request and calls notFound(). dev-1's
  `revalidate = 3600` is the view's cached loader ('use cache' + cacheLife('hours')), because Cache
  Components rejects the segment export. The body sits in <Suspense> so reading `params` does not
  block instant navigation; the fallback is the head with the section's name.
*/

type Params = Promise<{ slug: string }>

const key = (code: string, field: string) => `dept.${code}.${field}` as StringKey

export function generateStaticParams(): { slug: string }[] {
  return departments.map((d) => ({ slug: d.slug }))
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const dept = departments.find((d) => d.slug === slug)
  return dept ? { title: t(key(dept.code, 'title')), description: t(key(dept.code, 'summary')) } : {}
}

export default function DepartmentPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<PageHead kicker={t('nav.departments')} title={t('nav.departments')} />}>
      <DepartmentView params={params} />
    </Suspense>
  )
}

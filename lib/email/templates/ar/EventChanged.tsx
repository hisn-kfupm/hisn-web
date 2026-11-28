import type { EventChangedProps } from '@/lib/email/types'
import { t } from '@/lib/i18n/t'
import { EventChangedBody } from '../parts'
import Layout from './Layout'

/** Arabic (dev-2 D2-3): the full updated details, the meeting link of an online event, and the cancel link. */
export default function EventChanged(props: EventChangedProps) {
  return (
    <Layout preview={t('ar', 'email.event_changed.heading')}>
      <EventChangedBody locale="ar" {...props} />
    </Layout>
  )
}

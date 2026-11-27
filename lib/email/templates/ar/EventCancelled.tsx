import type { EventCancelledProps } from '@/lib/email/types'
import { t } from '@/lib/i18n/t'
import { EventCancelledBody } from '../parts'
import Layout from './Layout'

/** Arabic (dev-2 D2-3): the event was cancelled. */
export default function EventCancelled(props: EventCancelledProps) {
  return (
    <Layout preview={t('ar', 'email.event_cancelled.heading')}>
      <EventCancelledBody locale="ar" {...props} />
    </Layout>
  )
}

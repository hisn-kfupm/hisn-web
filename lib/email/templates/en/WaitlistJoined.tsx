import type { WaitlistJoinedProps } from '@/lib/email/types'
import { t } from '@/lib/i18n/t'
import { WaitlistJoinedBody } from '../parts'
import Layout from './Layout'

/** English (dev-2 D2-3): on the waitlist: the position and the leave link, never the meeting link. */
export default function WaitlistJoined(props: WaitlistJoinedProps) {
  return (
    <Layout preview={t('en', 'email.waitlist_joined.heading')}>
      <WaitlistJoinedBody locale="en" {...props} />
    </Layout>
  )
}

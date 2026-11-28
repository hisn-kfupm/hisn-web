import type { AnnouncementProps } from '@/lib/email/types'
import { t } from '@/lib/i18n/t'
import { AnnouncementBody } from '../parts'
import Layout from './Layout'

/** English (dev-2 D2-3): a new event, with the unsubscribe link; no name, since the recipient may have no account. */
export default function Announcement(props: AnnouncementProps) {
  return (
    <Layout preview={t('en', 'email.announcement.heading')}>
      <AnnouncementBody locale="en" {...props} />
    </Layout>
  )
}

import type { ConfirmationProps } from '@/lib/email/types'
import { t } from '@/lib/i18n/t'
import { RegisteredBody } from '../parts'
import Layout from './Layout'

/** Arabic (dev-2 D2-3): registered: the details, the meeting link of an online event, the calendar file note and the cancel link. */
export default function Confirmation(props: ConfirmationProps) {
  return (
    <Layout preview={t('ar', 'email.confirmation.heading')}>
      <RegisteredBody locale="ar" kind="confirmation" {...props} />
    </Layout>
  )
}

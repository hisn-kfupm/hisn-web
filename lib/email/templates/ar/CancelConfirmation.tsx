import type { CancelConfirmationProps } from '@/lib/email/types'
import { t } from '@/lib/i18n/t'
import { CancelConfirmationBody } from '../parts'
import Layout from './Layout'

/** Arabic (dev-2 D2-3): a registration or a waitlist place was cancelled. */
export default function CancelConfirmation(props: CancelConfirmationProps) {
  return (
    <Layout preview={t('ar', props.wasWaitlisted ? 'email.cancel_confirmation.heading.waitlist' : 'email.cancel_confirmation.heading.registration')}>
      <CancelConfirmationBody locale="ar" {...props} />
    </Layout>
  )
}

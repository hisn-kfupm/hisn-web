import type { PromotedProps } from '@/lib/email/types'
import { t } from '@/lib/i18n/t'
import { RegisteredBody } from '../parts'
import Layout from './Layout'

/** English (dev-2 D2-3): a seat came free: the same content as Confirmation (spec §7.5). */
export default function Promoted(props: PromotedProps) {
  return (
    <Layout preview={t('en', 'email.promoted.heading')}>
      <RegisteredBody locale="en" kind="promoted" {...props} />
    </Layout>
  )
}

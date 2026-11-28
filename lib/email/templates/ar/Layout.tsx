import type { ReactNode } from 'react'
import { Body, Container, Head, Hr, Html, Link, Preview, Text } from '@react-email/components'
import { CONTACT_EMAIL } from '@/lib/config/contact'
import { t } from '@/lib/i18n/t'
import { styles } from '../parts'

/**
 * The Arabic emails' layout (dev-2 D2-3): right to left, the Hisn header, and the contact address in the
 * footer. The direction is repeated on the container because some clients (Gmail) drop <html> and <body>.
 */
export default function Layout({ preview, children }: { preview: string; children: ReactNode }) {
  return (
    <Html lang="ar" dir="rtl">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body} dir="rtl">
        <Container style={styles.container} lang="ar" dir="rtl">
          <Text style={styles.brand}>{t('ar', 'brand.name')}</Text>
          {children}
          <Hr style={styles.rule} />
          <Text style={styles.small}>
            {t('ar', 'email.footer.contact')}{' '}
            <Link href={`mailto:${CONTACT_EMAIL}`} style={styles.link}>
              <bdi lang="en">{CONTACT_EMAIL}</bdi>
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

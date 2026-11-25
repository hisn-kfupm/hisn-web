import { t } from '@/lib/i18n/t'
import type { Locale } from '@/lib/i18n/locale'

export type SignInError = 'invalid' | 'rate_limited' | 'send_failed' | 'wrong' | 'expired'

/** every string the sign-in form shows, resolved on the server (client components take strings as props) */
export type SignInLabels = {
  email: string
  personalHint: string
  institutionalWarning: string
  send: string
  /** «أرسلنا رمزًا من ٦ أرقام إلى»; the address follows, isolated in <bdi> */
  codeSentTo: string
  code: string
  verify: string
  checkJunk: string
  resend: string
  /** «يمكنك طلب رمز جديد بعد {time}»; the client fills {time} with the wait as m:ss */
  resendIn: string
  changeEmail: string
  errors: Record<SignInError, string>
}

export function signInLabels(locale: Locale): SignInLabels {
  return {
    email: t(locale, 'signin.email'),
    personalHint: t(locale, 'signin.personalHint'),
    institutionalWarning: t(locale, 'signin.institutionalWarning'),
    send: t(locale, 'signin.send'),
    codeSentTo: t(locale, 'signin.codeSentTo'),
    code: t(locale, 'signin.code'),
    verify: t(locale, 'signin.verify'),
    checkJunk: t(locale, 'signin.checkJunk'),
    resend: t(locale, 'signin.resend'),
    resendIn: t(locale, 'signin.resendIn', { time: '{time}' }),
    changeEmail: t(locale, 'signin.changeEmail'),
    errors: {
      invalid: t(locale, 'signin.error.invalid'),
      rate_limited: t(locale, 'signin.error.rate_limited'),
      send_failed: t(locale, 'signin.error.send_failed'),
      wrong: t(locale, 'signin.error.wrong'),
      expired: t(locale, 'signin.error.expired'),
    },
  }
}

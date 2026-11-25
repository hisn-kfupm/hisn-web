'use client'
import { useTransition } from 'react'
import Link from 'next/link'
import { LogOut, UserRound } from 'lucide-react'
import { Icon } from '@/components/ui/Icon'
import { Bdi } from '@/components/Bdi'
import { buttonClass } from '@/components/ui/button'
import { useDisclosure } from '@/components/ui/useDisclosure'
import { signOut } from '@/lib/auth/sign-out-stub' // D2-4: '@/lib/auth/session'
import type { Locale } from '@/lib/i18n/locale'
import { localePath } from '@/lib/i18n/paths'

type Props = { locale: Locale; email: string; labels: { account: string; menu: string; signOut: string } }

/**
 * Signed-in entry (dev-1 D1-5, spec §6.3): a disclosure with «حسابي» and «تسجيل الخروج». Signing
 * out keeps the language: signOut(locale) returns the person to /{locale}.
 */
export function AccountMenu({ locale, email, labels }: Props) {
  const { open, close, toggle, id, buttonRef, panelRef } = useDisclosure<HTMLButtonElement, HTMLDivElement>()
  const [leaving, startLeaving] = useTransition()
  const item = 'flex min-h-11 w-full items-center gap-2 px-4 text-start font-medium text-deep no-underline hover:bg-box disabled:opacity-60'
  return (
    <div className="relative">
      <button ref={buttonRef} type="button" aria-expanded={open} aria-controls={id} onClick={toggle} aria-label={labels.menu} className={buttonClass({ variant: 'secondary', tone: 'dark', size: 'sm', className: 'max-[359px]:w-11 max-[359px]:px-0' })}>
        <Icon icon={UserRound} size={18} />
        <span className="max-[359px]:sr-only">{labels.account}</span>
      </button>
      <div
        ref={panelRef}
        id={id}
        hidden={!open}
        className="absolute end-0 top-full z-30 mt-2 min-w-64 border border-line bg-white py-2 text-deep shadow-[0_12px_32px_rgb(2_44_51/0.18)]"
      >
        <p className="truncate px-4 pt-1 pb-2 text-small text-muted"><Bdi lang="en">{email}</Bdi></p>
        <Link href={localePath(locale, '/account')} onClick={() => close()} className={item}>
          {labels.account}
        </Link>
        <button type="button" disabled={leaving} onClick={() => startLeaving(() => signOut(locale))} className={item}>
          <Icon icon={LogOut} size={18} mirror className="text-muted" />
          {labels.signOut}
        </button>
      </div>
    </div>
  )
}

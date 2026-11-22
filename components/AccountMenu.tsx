'use client'
import Link from 'next/link'
import { UserRound } from 'lucide-react'
import { Icon } from '@/components/ui/Icon'
import { Bdi } from '@/components/Bdi'
import { buttonClass } from '@/components/ui/button'
import { useDisclosure } from '@/components/ui/useDisclosure'

type Props = { email: string; labels: { account: string; menu: string } }

/** Signed-in entry: a disclosure with «حسابي». Sign-out joins once D2-4 lands (dev-1 D1-5 stub). */
export function AccountMenu({ email, labels }: Props) {
  const { open, close, toggle, id, buttonRef, panelRef } = useDisclosure<HTMLButtonElement, HTMLDivElement>()
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
        <Link href="/account" onClick={() => close()} className="flex min-h-11 items-center px-4 font-medium text-deep no-underline hover:bg-box">
          {labels.account}
        </Link>
      </div>
    </div>
  )
}

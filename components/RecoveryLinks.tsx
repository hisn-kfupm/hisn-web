import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Icon } from '@/components/ui/Icon'
import { primaryNav } from '@/components/nav-items'

/** Brick links to the main sections, used on the 404 and error pages. */
export function RecoveryLinks() {
  return (
    <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-3">
      {primaryNav().map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className="group relative flex min-h-20 items-center justify-between gap-3 border border-line bg-white px-5 text-h3 text-deep no-underline before:absolute before:inset-x-[-1px] before:-top-px before:h-0.5 before:origin-(--start) before:scale-x-0 before:bg-teal before:transition-transform before:duration-200 before:ease-brand hover:before:scale-x-100 focus-visible:before:scale-x-100"
          >
            {item.label}
            <Icon icon={ArrowRight} mirror className="text-teal" />
          </Link>
        </li>
      ))}
    </ul>
  )
}

import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react'
import Link from 'next/link'
import { buttonClass } from './button'
import { ArrowGlyph } from './ArrowGlyph'

type Look = {
  variant?: 'primary' | 'secondary' | 'ghost'
  tone?: 'light' | 'dark'
  size?: 'md' | 'sm' | 'lg'
  block?: boolean
  /** a forward arrow after the label that nudges on hover */
  arrow?: boolean
  className?: string
  children: ReactNode
}

function Inner({ arrow, variant, children }: Pick<Look, 'arrow' | 'variant' | 'children'>) {
  return (
    <>
      {variant === 'ghost' ? <span className="draw-line pb-0.5">{children}</span> : children}
      {arrow && <ArrowGlyph />}
    </>
  )
}

/** <button> with the fill-wipe hover and 1 px press. */
export function Button({ variant, tone, size, block, arrow, className, children, type = 'button', ...rest }: Look & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>) {
  return (
    <button type={type} className={buttonClass({ variant, tone, size, block, className })} {...rest}>
      <Inner arrow={arrow} variant={variant}>{children}</Inner>
    </button>
  )
}

/** next/link styled as a button. */
export function LinkButton({ variant, tone, size, block, arrow, className, children, ...rest }: Look & Omit<ComponentProps<typeof Link>, 'className' | 'children'>) {
  return (
    <Link className={buttonClass({ variant, tone, size, block, className })} {...rest}>
      <Inner arrow={arrow} variant={variant}>{children}</Inner>
    </Link>
  )
}

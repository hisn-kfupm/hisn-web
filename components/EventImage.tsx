'use client'
import { useState } from 'react'
import { BattlementBand } from '@/components/brand/BattlementBand'
import { Icon } from '@/components/ui/Icon'
import { deptIcon } from '@/lib/data/dept-icons'
import { cn } from '@/lib/cn'

type Props = { imageUrl: string | null; departmentCode: string | null; className?: string }

/**
 * Event image at 2:1 (dev-1 D1-8): the image → the department's icon → Shield. Also falls back
 * when the image fails to load. A plain <img>, not next/image, because admins paste any host.
 */
export function EventImage({ imageUrl, departmentCode, className }: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  if (imageUrl && failedUrl !== imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- dev-1 D1-8 asks for a plain <img>
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailedUrl(imageUrl)}
        className={cn('block aspect-[2/1] w-full bg-box object-cover', className)}
      />
    )
  }

  return (
    <div className={cn('relative grid aspect-[2/1] w-full place-items-center overflow-hidden bg-box text-teal', className)}>
      <span data-testid="dept-icon" className="mb-(--sq)">
        <Icon icon={deptIcon(departmentCode)} size={40} />
      </span>
      <BattlementBand tone="page" edge="bottom" />
    </div>
  )
}

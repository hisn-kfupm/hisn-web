'use client'

import { useState, type ReactNode } from 'react'
import { Play } from 'lucide-react'
import { Photo } from '@/components/ui/Photo'
import { youtubeEmbed, youtubeThumb } from '@/lib/youtube'
import { useActiveVideo } from './ActiveVideoProvider'

type Props = {
  videoId: string
  /** the recording's title: the player's accessible name */
  title: string
  /** the play button's accessible name, resolved on the server */
  playLabel: string
  /** unique per card when two cards could show the same video; defaults to the video id */
  cardId?: string
  /** shown instead of the YouTube thumbnail when it fails to load (stand-in ids are not real videos) */
  fallback?: { src: string; blurDataURL?: string }
  /** the card's text, rendered on the server */
  children?: ReactNode
}

/**
 * A library card (dev-1 D1-12): the YouTube thumbnail with a mint play square; a click swaps it
 * for the youtube-nocookie player in the same frame, so the video plays in place. Only one card
 * plays at a time (ActiveVideoProvider). No YouTube script or cookie loads before the click.
 */
export function VideoCard({ videoId, title, playLabel, cardId = videoId, fallback, children }: Props) {
  const { activeId, activate } = useActiveVideo()
  const [thumbFailed, setThumbFailed] = useState(false)
  const playing = activeId === cardId

  return (
    <article className="video-card group relative">
      <div className="photo" style={{ aspectRatio: '16/9' }}>
        {playing ? (
          <iframe src={youtubeEmbed(videoId)} title={title} allow="autoplay; encrypted-media" allowFullScreen className="absolute inset-0 size-full border-0" />
        ) : (
          <>
            {thumbFailed && fallback ? (
              <Photo image={fallback} alt="" ratio="16/9" reveal={false} className="photo-fill" sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 92vw" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- dev-1 D1-12: YouTube's own thumbnail, not run through the optimiser
              <img
                src={youtubeThumb(videoId)}
                alt=""
                loading="lazy"
                decoding="async"
                onError={() => setThumbFailed(true)}
                // an unknown video gets YouTube's 120×90 grey placeholder (a real hqdefault is 480 wide)
                onLoad={(e) => {
                  const w = e.currentTarget.naturalWidth
                  if (w > 0 && w <= 120) setThumbFailed(true)
                }}
                className="photo-img absolute inset-0 size-full object-cover"
              />
            )}
            <span aria-hidden="true" className="photo-grade" />
            <button type="button" aria-label={playLabel} onClick={() => activate(cardId)} className="absolute inset-0 z-10 cursor-pointer">
              <span aria-hidden="true" className="video-play absolute start-0 bottom-0 grid size-12 place-items-center bg-mint text-deep lg:size-14">
                <Play focusable="false" strokeWidth={2} className="size-5 fill-current lg:size-6" />
              </span>
            </button>
          </>
        )}
      </div>
      {children}
    </article>
  )
}

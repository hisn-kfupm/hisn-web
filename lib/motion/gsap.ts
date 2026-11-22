'use client'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CustomEase } from 'gsap/CustomEase'
import { useGSAP } from '@gsap/react'
import { EASE_PATHS } from './eases'

let registered = false

/**
 * Registers the GSAP plugins and the custom eases once. Every component that animates with GSAP
 * calls it at the top of its useGSAP callback (it is idempotent). Browser only.
 *
 * Revision 04 §3: only the plugins still in use are registered, and nothing in the layout imports
 * this module, so pages whose motion is CSS and IntersectionObserver (the homepage) ship no GSAP.
 * SplitText, Flip, Observer, Draggable, DrawSVG and Inertia went with the pinned verbs, the drag
 * strip, the department dissolve and the stepped talent course; import one here again if a new
 * feature truly needs it.
 */
export function registerMotion() {
  if (registered || typeof window === 'undefined') return
  registered = true
  gsap.registerPlugin(useGSAP, ScrollTrigger, CustomEase)
  for (const [name, path] of Object.entries(EASE_PATHS)) CustomEase.create(name, path)
  gsap.defaults({ ease: 'settle', duration: 0.6 })
  // phones: the address bar collapsing must not trigger a full refresh mid-scroll
  ScrollTrigger.config({ ignoreMobileResize: true })
}

export { gsap, ScrollTrigger, CustomEase, useGSAP }

import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

gsap.registerPlugin(ScrollTrigger)

// The running instance, so other landing components can scroll through it
let active = null

// Glide back to the top of the page (instant when smooth scrolling is off)
export function scrollToTop() {
  if (active) active.scrollTo(0, { duration: 1.1 })
  else window.scrollTo(0, 0)
}

// Inertial wheel scrolling for the landing page. Lenis still drives the native
// window scroll, so fixed elements, window.scrollY and IntersectionObservers keep
// working; it just eases each step. Touch keeps the platform's own momentum, and
// reduced-motion users get plain scrolling.
export default function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 })
    active = lenis

    // One clock for both: Lenis steps on GSAP's ticker and ScrollTrigger reads every frame
    const tick = (time) => lenis.raf(time * 1000)
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    // Same-page anchors glide instead of jumping. The URL and keyboard focus still
    // follow, so the skip link and back button behave as they would natively.
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const link = e.target.closest?.('a[href^="#"]')
      const hash = link?.getAttribute('href')
      const target = hash && hash.length > 1 && document.getElementById(decodeURIComponent(hash.slice(1)))
      if (!target) return

      e.preventDefault()
      history.pushState(null, '', hash)
      lenis.scrollTo(target, { duration: 1.1 })
      if (!target.hasAttribute('tabindex') && !target.matches('a, button, input, select, textarea')) {
        target.setAttribute('tabindex', '-1')
      }
      target.focus({ preventScroll: true })
    }
    document.addEventListener('click', onClick)

    return () => {
      document.removeEventListener('click', onClick)
      gsap.ticker.remove(tick)
      gsap.ticker.lagSmoothing(500, 33)
      lenis.destroy()
      if (active === lenis) active = null
    }
  }, [])
}

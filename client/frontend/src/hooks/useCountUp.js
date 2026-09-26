import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

// Animates a displayed number from its previous value to `value`.
// Accepts numbers or strings with a numeric part ("42%"), keeping any suffix.
export default function useCountUp(value, { duration = 0.9 } = {}) {
  const str = String(value)
  const match = str.match(/^(-?\d+(?:\.\d+)?)(.*)$/)
  const target = match ? parseFloat(match[1]) : null
  const suffix = match ? match[2] : ''
  const [display, setDisplay] = useState(`0${suffix}`)
  const current = useRef({ n: 0 })

  useEffect(() => {
    if (target === null) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const tween = gsap.to(current.current, {
      n: target,
      duration: reduce ? 0 : duration,
      ease: 'expo.out',
      onUpdate: () => setDisplay(`${Math.round(current.current.n)}${suffix}`),
    })
    return () => tween.kill()
  }, [target, suffix, duration])

  return target === null ? str : display
}

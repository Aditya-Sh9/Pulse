import { Link, useNavigate } from 'react-router-dom'
import gsap from 'gsap'

// A router Link that fades the landing page out before handing over to the app,
// so leaving the marketing page feels like one continuous motion. Modified clicks
// (new tab, etc.) and reduced-motion users get a normal, instant Link.
export default function AppLink({ to, state, onClick, ...props }) {
  const navigate = useNavigate()

  const handleClick = (e) => {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const root = document.querySelector('[data-landing-root]')
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    e.preventDefault()
    gsap.to(root, {
      autoAlpha: 0,
      y: -12,
      duration: 0.28,
      ease: 'power2.in',
      onComplete: () => navigate(to, { state }),
    })
  }

  return <Link to={to} state={state} onClick={handleClick} {...props} />
}

import { Link, useLocation } from 'react-router-dom'
import { scrollToTop } from '../../hooks/useSmoothScroll'

// A link to the landing page. When you're already on it, it scrolls back to the
// top instead of doing nothing; anywhere else it's a normal router Link.
export default function HomeLink({ onClick, ...props }) {
  const { pathname } = useLocation()

  const handleClick = (e) => {
    onClick?.(e)
    if (pathname !== '/' || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    // Drop a leftover #section so a reload lands at the top too
    if (window.location.hash) history.replaceState(history.state, '', '/')
    scrollToTop()
  }

  return <Link to="/" onClick={handleClick} {...props} />
}

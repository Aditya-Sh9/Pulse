import { useEffect } from 'react'

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'
].join(',')

// Keeps Tab/Shift+Tab inside `ref` while `active`, and hands focus back to
// whatever opened the dialog when it closes (WCAG 2.4.3 focus order).
export default function useFocusTrap(ref, active = true) {
  useEffect(() => {
    if (!active || !ref.current) return
    const container = ref.current
    const opener = document.activeElement

    const focusables = () => [...container.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null || el === document.activeElement)

    // Respect autoFocus inside the dialog; otherwise focus the first control
    if (!container.contains(document.activeElement)) {
      const first = focusables()[0]
      ;(first || container).focus({ preventScroll: true })
    }

    const onKeyDown = (e) => {
      if (e.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) { e.preventDefault(); return }
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }

    container.addEventListener('keydown', onKeyDown)
    return () => {
      container.removeEventListener('keydown', onKeyDown)
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) {
        opener.focus({ preventScroll: true })
      }
    }
  }, [ref, active])
}

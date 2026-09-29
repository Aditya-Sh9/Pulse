import { useEffect } from 'react'

// Tiny event bus for global keyboard shortcuts, so the key handler doesn't need to
// know which page is mounted. Pages subscribe to the shortcuts they support.
const EVENT = 'pulse:shortcut'

export const emitShortcut = (name) => window.dispatchEvent(new CustomEvent(EVENT, { detail: name }))

export function useShortcut(name, handler) {
  useEffect(() => {
    const listener = (e) => { if (e.detail === name) handler() }
    window.addEventListener(EVENT, listener)
    return () => window.removeEventListener(EVENT, listener)
  }, [name, handler])
}

import React, { useEffect, useRef } from 'react'
import useFocusTrap from '../hooks/useFocusTrap'

// Accessible dialog shell: backdrop, Escape to close, focus trap + focus return.
// `as` lets forms be the dialog element itself.
export default function Modal({
  onClose, labelledBy, label, children, as: Tag = 'div', className = '', role = 'dialog', z = 'z-[100]', ...rest
}) {
  const ref = useRef(null)
  useFocusTrap(ref, true)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); onClose() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className={`fixed inset-0 ${z} flex items-center justify-center p-4`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} aria-hidden="true" />
      <Tag
        ref={ref}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : label}
        tabIndex={-1}
        className={`relative z-10 w-full max-h-[calc(100dvh-2rem)] overflow-y-auto focus:outline-none animate-in fade-in zoom-in-95 duration-200 ${className}`}
        {...rest}
      >
        {children}
      </Tag>
    </div>
  )
}

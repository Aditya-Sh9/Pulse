import React from 'react'

// Loading state: a short heartbeat trace that keeps drawing itself.
// `inline` fills its container instead of the whole viewport.
export default function PulseLoader({ label = 'Loading…', inline = false }) {
  return (
    <div className={`${inline ? 'h-full min-h-[50vh]' : 'min-h-dvh'} flex items-center justify-center bg-base`} role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-5">
        <svg viewBox="0 0 120 40" className="w-28" aria-hidden="true">
          <path d="M0 20 H34 L42 20 L48 8 L56 32 L62 4 L68 20 H120" fill="none" className="stroke-edge" strokeWidth="1.5" strokeLinejoin="round" />
          <path
            d="M0 20 H34 L42 20 L48 8 L56 32 L62 4 L68 20 H120"
            fill="none"
            className="stroke-accent-400 pulse-loader-trace"
            strokeWidth="1.75"
            strokeLinejoin="round"
            strokeLinecap="round"
            pathLength="100"
          />
        </svg>
        <p className="text-sm text-neutral-400">{label}</p>
      </div>
    </div>
  )
}

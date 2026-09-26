// The Pulse wordmark: a flat ink tile with the ECG trace, no glow or gradient.
export default function PulseMark({ className = '', label = true }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="7" className="fill-ink" />
        <path
          d="M5 17h5l2.5-6 4 11 3-8 1.5 3H27"
          fill="none"
          className="stroke-paper"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label && <span className="font-display text-lg font-bold tracking-tight text-ink">Pulse</span>}
    </span>
  )
}

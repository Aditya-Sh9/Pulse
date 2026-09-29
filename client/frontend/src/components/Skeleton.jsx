import React from 'react'

// Shimmer-free placeholder blocks (static under reduced motion via the global rule)
export function Skeleton({ className = '', ...rest }) {
  return <div aria-hidden="true" className={`rounded-md bg-raised/70 animate-pulse ${className}`} {...rest} />
}

// Busy region for lists/tables while their first snapshot loads
export function SkeletonRows({ rows = 6, label = 'Loading…' }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="space-y-2 py-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-2 py-2.5">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 flex-1" style={{ maxWidth: `${60 + ((i * 37) % 35)}%` }} />
          <Skeleton className="h-4 w-20 hidden sm:block" />
          <Skeleton className="h-4 w-16 hidden md:block" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonCards({ count = 3 }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading tasks" className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="bg-card p-4 rounded-lg border border-raised space-y-3">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  )
}

// Consistent empty state: icon, message, optional primary action
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="py-14 px-6 flex flex-col items-center justify-center text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-raised ring-1 ring-inset ring-edge flex items-center justify-center mb-4">
          <Icon size={22} className="text-neutral-400" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-[16px] leading-6 font-semibold text-neutral-100">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-neutral-400 max-w-sm">{description}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-accent-600 px-4 text-sm font-semibold text-white hover:bg-accent-500 transition-colors"
        >
          {action.icon && <action.icon size={16} aria-hidden="true" />} {action.label}
        </button>
      )}
    </div>
  )
}

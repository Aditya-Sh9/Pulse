// Due dates are stored as local calendar days ("YYYY-MM-DD").
// `new Date('2026-02-01')` parses as UTC midnight, which shifts the day in western timezones,
// so always go through these helpers.

export const toDateKey = (date = new Date()) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const parseDateKey = (key) => {
  if (!key || typeof key !== 'string') return null
  const [y, m, d] = key.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export const formatDue = (key, options = { month: 'short', day: 'numeric' }) => {
  const date = parseDateKey(key)
  return date ? date.toLocaleDateString('en-US', options) : null
}

export const isOverdue = (key) => !!key && key < toDateKey()

// Firestore Timestamp | ISO string | Date → Date
export const toJsDate = (value) => {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const timeAgo = (value) => {
  const date = toJsDate(value)
  if (!date) return 'Just now'
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

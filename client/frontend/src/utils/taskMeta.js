// Shared task constants and pure helpers (kept out of component files for fast refresh)

export const RECURRENCE_OPTIONS = [
  { value: '', label: 'Does not repeat' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
]

export const MAX_LABELS = 8
export const normalizeLabel = (raw) => raw.trim().replace(/\s+/g, ' ').slice(0, 24)

export const EMPTY_FILTERS = { status: '', priority: '', label: '', assignee: '' }
export const FILTER_KEYS = Object.keys(EMPTY_FILTERS)

export const hasActiveFilters = (filters) => FILTER_KEYS.some(k => filters[k])

export const applyTaskFilters = (tasks, filters) => tasks.filter(t =>
  (!filters.status || t.status === filters.status) &&
  (!filters.priority || t.priority === filters.priority) &&
  (!filters.label || (t.labels || []).includes(filters.label)) &&
  (!filters.assignee || (filters.assignee === 'unassigned' ? !t.assigneeId : t.assigneeId === filters.assignee))
)

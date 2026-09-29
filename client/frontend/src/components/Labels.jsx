import React, { useState, useId } from 'react'
import { X, Tag } from 'lucide-react'
import { MAX_LABELS, normalizeLabel } from '../utils/taskMeta'

// Stable color per label name (from a small palette tuned for the dark surfaces)
const PALETTE = [
  'bg-sky-500/15 text-sky-300 ring-sky-500/30',
  'bg-violet-500/15 text-violet-300 ring-violet-500/30',
  'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  'bg-rose-500/15 text-rose-300 ring-rose-500/30',
  'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  'bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/30',
  'bg-cyan-500/15 text-cyan-300 ring-cyan-500/30',
]
const colorFor = (label) => {
  let h = 0
  for (const ch of label) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]
}


export function LabelChip({ label, onRemove, size = 'sm' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ring-1 ring-inset font-medium ${size === 'xs' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs'} ${colorFor(label)}`}>
      {label}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove label ${label}`} className="-mr-0.5 p-0.5 rounded-full hover:bg-white/10">
          <X size={11} />
        </button>
      )}
    </span>
  )
}

// Chip input: Enter or comma adds, Backspace on empty removes the last one.
// Suggestions come from labels already used in the workspace.
export function LabelInput({ value = [], onChange, suggestions = [], id }) {
  const [draft, setDraft] = useState('')
  const autoId = useId()
  const inputId = id || autoId
  const listId = `${inputId}-suggestions`

  const add = (raw) => {
    const label = normalizeLabel(raw)
    if (!label || value.length >= MAX_LABELS || value.some(l => l.toLowerCase() === label.toLowerCase())) return
    onChange([...value, label])
    setDraft('')
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 min-h-10 w-full bg-base border border-edge rounded-lg px-2.5 py-1.5 focus-within:border-accent-500 focus-within:ring-1 focus-within:ring-accent-500 transition-all">
      <Tag size={14} className="text-neutral-500 flex-shrink-0" aria-hidden="true" />
      {value.map(l => <LabelChip key={l} label={l} onRemove={() => onChange(value.filter(x => x !== l))} />)}
      {value.length < MAX_LABELS && (
        <input
          id={inputId}
          list={listId}
          value={draft}
          onChange={(e) => {
            const v = e.target.value
            if (v.endsWith(',')) add(v.slice(0, -1))
            else setDraft(v)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim()) { e.preventDefault(); add(draft) }
            if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1))
          }}
          onBlur={() => draft.trim() && add(draft)}
          placeholder={value.length ? '' : 'Add labels (Enter to add)'}
          className="flex-1 min-w-[8rem] bg-transparent text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none py-1"
        />
      )}
      <datalist id={listId}>
        {suggestions.filter(s => !value.includes(s)).map(s => <option key={s} value={s} />)}
      </datalist>
    </div>
  )
}

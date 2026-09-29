import React, { useState, useRef, useEffect } from 'react'
import { Bookmark, BookmarkPlus, Trash2, X, Check } from 'lucide-react'
import { useProject } from '../context/ProjectContext'
import { useAuth } from '../context/AuthContext'
import { FILTER_KEYS, EMPTY_FILTERS, hasActiveFilters } from '../utils/taskMeta'

const selectCls = (active) => `bg-card border rounded-md pl-2 pr-7 py-1.5 text-sm focus:outline-none focus:border-accent-500/60 cursor-pointer max-w-[10rem] ${active ? 'border-accent-500/40 text-accent-200' : 'border-raised text-neutral-300'}`

// Status / priority / label / assignee filters plus per-user saved views.
// `scope` is the project the views are saved against.
export default function FilterBar({ filters, onChange, scope, showStatus = true }) {
  const { currentUser } = useAuth()
  const { members, allLabels, myProfile, saveFilter, deleteFilter } = useProject()
  const [viewsOpen, setViewsOpen] = useState(false)
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const menuRef = useRef(null)

  const views = (myProfile?.savedFilters || []).filter(v => !v.projectId || v.projectId === scope)
  const active = hasActiveFilters(filters)
  const set = (key, value) => onChange({ ...filters, [key]: value })

  useEffect(() => {
    if (!viewsOpen) return
    const close = (e) => { if (!menuRef.current?.contains(e.target)) { setViewsOpen(false); setNaming(false) } }
    const onKey = (e) => { if (e.key === 'Escape') { setViewsOpen(false); setNaming(false) } }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [viewsOpen])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    const picked = Object.fromEntries(FILTER_KEYS.map(k => [k, filters[k]]))
    await saveFilter(name, { projectId: scope || null, ...picked })
    setName('')
    setNaming(false)
    setViewsOpen(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filters">
      {showStatus && (
        <select aria-label="Filter by status" value={filters.status} onChange={(e) => set('status', e.target.value)} className={selectCls(filters.status)}>
          <option value="">Any status</option>
          <option value="TO DO">To do</option>
          <option value="IN PROGRESS">In progress</option>
          <option value="COMPLETE">Complete</option>
        </select>
      )}
      <select aria-label="Filter by priority" value={filters.priority} onChange={(e) => set('priority', e.target.value)} className={selectCls(filters.priority)}>
        <option value="">Any priority</option>
        <option value="High">High</option>
        <option value="Normal">Normal</option>
        <option value="Low">Low</option>
      </select>
      <select aria-label="Filter by assignee" value={filters.assignee} onChange={(e) => set('assignee', e.target.value)} className={selectCls(filters.assignee)}>
        <option value="">Anyone</option>
        <option value={currentUser?.uid}>Me</option>
        <option value="unassigned">Unassigned</option>
        {members.filter(m => m.id !== currentUser?.uid).map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
      </select>
      {allLabels.length > 0 && (
        <select aria-label="Filter by label" value={filters.label} onChange={(e) => set('label', e.target.value)} className={selectCls(filters.label)}>
          <option value="">Any label</option>
          {allLabels.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      )}
      {active && (
        <button type="button" onClick={() => onChange(EMPTY_FILTERS)} className="flex items-center gap-1 px-2 py-1.5 rounded-md text-sm text-neutral-400 hover:text-white hover:bg-raised">
          <X size={13} aria-hidden="true" /> Clear
        </button>
      )}

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={viewsOpen}
          onClick={() => setViewsOpen(o => !o)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm text-neutral-300 hover:text-white hover:bg-raised border border-transparent"
        >
          <Bookmark size={14} aria-hidden="true" /> Views{views.length ? <span className="text-neutral-400 tabular-nums">({views.length})</span> : null}
        </button>

        {viewsOpen && (
          <div role="menu" className="absolute left-0 top-full mt-1 w-64 bg-raised border border-edge rounded-lg shadow-2xl z-50 p-1.5 animate-in fade-in slide-in-from-top-1">
            {views.length === 0 && !naming && (
              <p className="px-2.5 py-2 text-xs text-neutral-400">No saved views yet. Set some filters, then save them here.</p>
            )}
            {views.map(v => (
              <div key={v.id} className="flex items-center gap-1 group">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { onChange(Object.fromEntries(FILTER_KEYS.map(k => [k, v[k] || '']))); setViewsOpen(false) }}
                  className="flex-1 text-left px-2.5 py-2 rounded text-sm text-neutral-200 hover:bg-edge truncate"
                >
                  {v.name}
                </button>
                <button
                  type="button"
                  onClick={() => deleteFilter(v.id)}
                  aria-label={`Delete saved view ${v.name}`}
                  className="p-1.5 rounded text-neutral-400 hover:text-red-400 hover:bg-red-500/10 opacity-60 group-hover:opacity-100 focus:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <div className="h-px bg-edge my-1" />
            {naming ? (
              <form onSubmit={handleSave} className="flex items-center gap-1 p-1">
                <label htmlFor="saved-view-name" className="sr-only">View name</label>
                <input
                  id="saved-view-name"
                  autoFocus
                  value={name}
                  maxLength={40}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. My high priority"
                  className="flex-1 min-w-0 bg-base border border-edge rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-accent-500"
                />
                <button type="submit" aria-label="Save view" disabled={!name.trim()} className="p-1.5 rounded bg-accent-600 text-white disabled:opacity-50">
                  <Check size={14} />
                </button>
              </form>
            ) : (
              <button
                type="button"
                role="menuitem"
                disabled={!active}
                onClick={() => setNaming(true)}
                title={active ? undefined : 'Choose at least one filter first'}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded text-sm text-accent-300 hover:bg-edge disabled:text-neutral-500 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              >
                <BookmarkPlus size={14} aria-hidden="true" /> Save current filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, CheckSquare, LayoutGrid, Folder, User, Clock, X,
  Home, Inbox, MessageSquare, Trophy, CheckCircle, Settings, CornerDownLeft
} from 'lucide-react'
import { useProject } from '../context/ProjectContext'
import { useShortcut } from '../utils/shortcuts'

const RECENT_KEY = 'pulse:recentSearches'
const MAX_PER_GROUP = 6

const readRecent = () => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || [] } catch { return [] }
}

const QUICK_LINKS = [
  { id: 'go-home', label: 'Go to Home', path: '/dashboard', icon: Home },
  { id: 'go-my-tasks', label: 'Go to My Tasks', path: '/dashboard/my-tasks', icon: CheckCircle },
  { id: 'go-inbox', label: 'Go to Inbox', path: '/dashboard/inbox', icon: Inbox },
  { id: 'go-messages', label: 'Go to Messages', path: '/dashboard/messages', icon: MessageSquare },
  { id: 'go-leaderboard', label: 'Go to Leaderboard', path: '/dashboard/leaderboard', icon: Trophy },
  { id: 'go-settings', label: 'Go to Settings', path: '/dashboard/settings', icon: Settings },
]

const ICONS = { task: CheckSquare, project: LayoutGrid, space: Folder, member: User, recent: Clock }

// Global search as an ARIA combobox: ↑/↓ to move, Enter to open, Esc to close.
// Empty query shows recent searches and quick navigation.
export default function CommandPalette() {
  const navigate = useNavigate()
  const { tasks, projects, spaces, members, toggleSpaceExpanded, openTaskDrawer } = useProject()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [recent, setRecent] = useState(readRecent)
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const focusSearch = useCallback(() => {
    setOpen(true)
    inputRef.current?.focus()
  }, [])
  useShortcut('focus-search', focusSearch)

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        focusSearch()
      }
    }
    const onClick = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [focusSearch])

  // Flat, ordered option list; groups are derived from it for rendering
  const options = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      return [
        ...recent.map(r => ({ key: `recent-${r}`, type: 'recent', group: 'Recent searches', label: r, value: r })),
        ...QUICK_LINKS.map(l => ({ key: l.id, type: 'link', group: 'Jump to', label: l.label, path: l.path, icon: l.icon })),
      ]
    }
    const match = (s) => s && s.toLowerCase().includes(q)
    return [
      ...tasks.filter(t => match(t.title) || match(t.description) || (t.labels || []).some(match)).slice(0, MAX_PER_GROUP)
        .map(t => ({ key: `task-${t.id}`, type: 'task', group: 'Tasks', label: t.title, meta: t.status, item: t })),
      ...projects.filter(p => match(p.name)).slice(0, MAX_PER_GROUP)
        .map(p => ({ key: `project-${p.id}`, type: 'project', group: 'Projects', label: p.name, item: p })),
      ...spaces.filter(s => match(s.name)).slice(0, MAX_PER_GROUP)
        .map(s => ({ key: `space-${s.id}`, type: 'space', group: 'Spaces', label: s.name, item: s })),
      ...members.filter(m => match(m.name) || match(m.email)).slice(0, MAX_PER_GROUP)
        .map(m => ({ key: `member-${m.id}`, type: 'member', group: 'People', label: m.name || m.email, meta: m.email, item: m })),
    ]
  }, [query, recent, tasks, projects, spaces, members])

  // Keep the highlighted option valid as results change
  const [lastLen, setLastLen] = useState(options.length)
  if (lastLen !== options.length) {
    setLastLen(options.length)
    setActiveIndex(0)
  }

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const remember = (term) => {
    const t = term.trim()
    if (!t) return
    const next = [t, ...recent.filter(r => r.toLowerCase() !== t.toLowerCase())].slice(0, 5)
    setRecent(next)
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch { /* storage unavailable */ }
  }

  const clearRecent = () => {
    setRecent([])
    try { localStorage.removeItem(RECENT_KEY) } catch { /* storage unavailable */ }
    inputRef.current?.focus()
  }

  const select = (option) => {
    if (!option) return
    if (option.type === 'recent') {
      setQuery(option.value)
      inputRef.current?.focus()
      return
    }
    remember(query)
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()

    const { item } = option
    if (option.type === 'link') navigate(option.path)
    else if (option.type === 'task') openTaskDrawer(item)
    else if (option.type === 'project') navigate(`/dashboard/list/${item.id}`)
    else if (option.type === 'member') navigate(`/dashboard/messages/${item.id}`)
    else if (option.type === 'space') {
      if (!item.isExpanded) toggleSpaceExpanded(item.id)
      const first = projects.find(p => p.spaceId === item.id)
      navigate(first ? `/dashboard/list/${first.id}` : '/dashboard')
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActiveIndex(i => (options.length ? (i + 1) % options.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => (options.length ? (i - 1 + options.length) % options.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      select(options[activeIndex])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (query) setQuery('')
      else { setOpen(false); inputRef.current?.blur() }
    }
  }

  const groups = []
  options.forEach((o, index) => {
    const last = groups[groups.length - 1]
    if (!last || last.name !== o.group) groups.push({ name: o.group, items: [{ ...o, index }] })
    else last.items.push({ ...o, index })
  })

  const listId = 'command-palette-listbox'
  const activeId = options[activeIndex] ? `cp-opt-${activeIndex}` : undefined

  return (
    <div className="relative w-full max-w-md" ref={rootRef}>
      <Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? activeId : undefined}
        aria-autocomplete="list"
        aria-label="Search tasks, projects, spaces and people"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onKeyDown={onKeyDown}
        placeholder="Search or jump to…"
        className="w-full bg-base text-neutral-200 text-sm rounded-lg py-2 pl-10 pr-16 focus:outline-none focus:ring-1 focus:ring-accent-500 border border-edge focus:border-accent-500/50 placeholder-neutral-500 transition-all"
      />
      <kbd className="hidden sm:flex absolute inset-y-0 right-3 my-auto h-fit items-center pointer-events-none text-[11px] text-neutral-400 border border-edge rounded px-1.5 py-0.5 bg-card font-sans">Ctrl K</kbd>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-raised rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div ref={listRef} id={listId} role="listbox" aria-label="Search results" className="max-h-96 overflow-y-auto custom-scrollbar py-1">
            {options.length === 0 ? (
              <p className="px-4 py-8 text-center text-neutral-400 text-sm">No results for “{query}”</p>
            ) : groups.map(group => (
              <div key={group.name} role="group" aria-label={group.name}>
                <div className="flex items-center justify-between px-4 pt-2.5 pb-1">
                  <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">{group.name}</span>
                  {group.name === 'Recent searches' && (
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={clearRecent} className="text-[11px] text-neutral-400 hover:text-white">Clear</button>
                  )}
                </div>
                {group.items.map(option => {
                  const Icon = option.icon || ICONS[option.type]
                  const active = option.index === activeIndex
                  return (
                    <div
                      key={option.key}
                      id={`cp-opt-${option.index}`}
                      data-index={option.index}
                      role="option"
                      aria-selected={active}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseMove={() => setActiveIndex(option.index)}
                      onClick={() => select(option)}
                      className={`mx-1 px-3 py-2 rounded-lg cursor-pointer flex items-center gap-3 ${active ? 'bg-raised text-white' : 'text-neutral-200'}`}
                    >
                      <Icon size={15} aria-hidden="true" className={active ? 'text-accent-400' : 'text-neutral-500'} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{option.label}</p>
                        {option.type === 'member' && option.meta && <p className="text-[11px] text-neutral-400 truncate">{option.meta}</p>}
                      </div>
                      {option.type === 'task' && (
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded uppercase tracking-wide flex-shrink-0 ${option.meta === 'COMPLETE' ? 'bg-green-500/15 text-green-300' : option.meta === 'IN PROGRESS' ? 'bg-ember-500/15 text-ember-300' : 'bg-neutral-500/15 text-neutral-300'}`}>
                          {option.meta}
                        </span>
                      )}
                      {active && <CornerDownLeft size={13} aria-hidden="true" className="text-neutral-500 flex-shrink-0" />}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          <div className="hidden sm:flex items-center gap-4 px-4 py-2 border-t border-raised text-[11px] text-neutral-400">
            <span><kbd className="font-sans">↑↓</kbd> navigate</span>
            <span><kbd className="font-sans">Enter</kbd> open</span>
            <span><kbd className="font-sans">Esc</kbd> close</span>
            {query && (
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setQuery(''); inputRef.current?.focus() }} className="ml-auto flex items-center gap-1 hover:text-white">
                <X size={11} /> Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

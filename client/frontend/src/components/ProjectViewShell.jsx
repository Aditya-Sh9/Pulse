import React, { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate, Link as RouterLink } from 'react-router-dom'
import { List, Calendar, Kanban, Table, ChevronDown, LayoutGrid, Folder, Link, SearchX } from 'lucide-react'
import { useProject } from '../context/ProjectContext'
import { projectUrl, copyToClipboard } from '../utils/links'

const VIEWS = [
  { id: 'list', label: 'List', icon: List },
  { id: 'board', label: 'Board', icon: Kanban },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'table', label: 'Table', icon: Table },
]

// Shared header (breadcrumb, project switcher, share, view tabs) for the four project views
export default function ProjectViewShell({ projectId, view, actions, children }) {
  const navigate = useNavigate()
  const { projects, spaces, members, showToast } = useProject()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const switcherRef = useRef(null)

  const currentProject = projects.find(p => String(p.id) === String(projectId))
  const space = spaces.find(s => s.id === currentProject?.spaceId)

  useEffect(() => {
    if (!switcherOpen) return
    const close = (e) => { if (!switcherRef.current?.contains(e.target)) setSwitcherOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setSwitcherOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [switcherOpen])

  const handleShare = async () => {
    const ok = await copyToClipboard(projectUrl(projectId, view))
    showToast(ok ? 'Project link copied' : 'Could not access the clipboard', ok ? 'success' : 'error')
  }

  // Projects load asynchronously; only call it missing once the list has arrived
  if (projects.length > 0 && !currentProject) {
    return (
      <div className="h-full min-h-[60vh] flex items-center justify-center p-8">
        <div className="max-w-sm text-center">
          <SearchX size={28} className="mx-auto mb-4 text-neutral-500" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-neutral-50">Project not found</h2>
          <p className="mt-2 text-sm text-neutral-400">It may have been deleted, or the link is wrong.</p>
          <RouterLink to="/dashboard" className="mt-5 inline-flex h-9 items-center rounded-lg border border-edge bg-card px-4 text-sm font-medium text-neutral-100 hover:bg-raised">
            Back to Home
          </RouterLink>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-base text-neutral-200">
      <div className="bg-card border-b border-raised flex-shrink-0">
        <div className="px-4 sm:px-6 pt-4 pb-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-neutral-400 relative min-w-0" ref={switcherRef}>
            <Folder size={14} className="flex-shrink-0 hidden sm:block" aria-hidden="true" />
            <span className="truncate hidden sm:inline">{space?.name || 'Space'}</span>
            <span className="text-neutral-500 hidden sm:inline" aria-hidden="true">/</span>
            <LayoutGrid size={14} className="flex-shrink-0" aria-hidden="true" />
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={switcherOpen}
              className="flex items-center gap-1 hover:text-white min-w-0"
              onClick={() => setSwitcherOpen(o => !o)}
            >
              <span className="font-semibold text-white truncate">{currentProject?.name || 'Project'}</span>
              <ChevronDown size={14} className="flex-shrink-0" />
            </button>

            {switcherOpen && (
              <div role="listbox" className="absolute top-full left-0 mt-1 w-56 max-h-72 overflow-y-auto bg-raised border border-edge rounded-md shadow-xl z-50 py-1">
                {projects.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={p.id === projectId}
                    className={`w-full text-left px-3 py-2 hover:bg-edge text-sm cursor-pointer flex items-center gap-2 ${p.id === projectId ? 'text-white' : 'text-neutral-300'}`}
                    onClick={() => {
                      navigate(`/dashboard/${view}/${p.id}`)
                      setSwitcherOpen(false)
                    }}
                  >
                    <LayoutGrid size={12} /> <span className="truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:flex -space-x-2" aria-label={`${members.length} workspace members`}>
              {members.slice(0, 3).map(m => (
                <div key={m.id} title={m.name} className="w-6 h-6 rounded-full bg-accent-500/15 ring-1 ring-inset ring-accent-400/25 border border-card flex items-center justify-center text-[11px] text-accent-200">
                  {m.avatar}
                </div>
              ))}
              {members.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-raised border border-card flex items-center justify-center text-[11px] text-neutral-400">
                  +{members.length - 3}
                </div>
              )}
            </div>
            <button type="button" onClick={handleShare} className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors">
              <Link size={12} /> Share
            </button>
          </div>
        </div>

        <div className="px-2 sm:px-4 flex items-center gap-1 mt-1 overflow-x-auto">
          {VIEWS.map(({ id, label, icon: Icon }) => (
            <NavLink
              key={id}
              to={`/dashboard/${id}/${projectId}`}
              className={({ isActive }) => `flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${isActive ? 'border-accent-500 text-white' : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-raised rounded-t-md'}`}
            >
              <Icon size={14} /> {label}
            </NavLink>
          ))}
          {actions && <div className="ml-auto flex items-center gap-2 pb-1">{actions}</div>}
        </div>
      </div>

      {children}
    </div>
  )
}

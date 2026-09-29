import React, { useEffect, useRef } from 'react'
import { Link, Copy, ExternalLink, Pencil, Copy as DuplicateIcon, Bell, BellOff, Archive, Trash2 } from 'lucide-react'
import { useProject } from '../context/ProjectContext'
import { useAuth } from '../context/AuthContext'
import { taskUrl, copyToClipboard } from '../utils/links'

const MenuItem = ({ icon: Icon, label, onClick, danger }) => (
  <button
    type="button"
    role="menuitem"
    onClick={(e) => { e.stopPropagation(); onClick() }}
    className={`w-full flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-edge transition-colors ${danger ? 'text-red-400 hover:text-red-300' : 'text-neutral-300'}`}
  >
    <Icon size={14} className={danger ? 'text-red-400' : 'text-neutral-500'} /> {label}
  </button>
)

// Per-task "…" menu shared by the List and Board views
export default function TaskActionsMenu({ task, onClose, onRename, className = 'right-0 top-8' }) {
  const ref = useRef(null)
  const { currentUser, userRole } = useAuth()
  const { openTaskDrawer, duplicateTask, toggleTaskWatch, setTaskArchived, deleteTask, confirmAction, showToast } = useProject()
  const isAdmin = userRole === 'admin'
  const watching = (task.watchers || []).includes(currentUser?.uid)

  useEffect(() => {
    const close = (e) => { if (!ref.current?.contains(e.target)) onClose() }
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const run = (fn) => () => { onClose(); fn() }

  const copy = async (text, label) => {
    const ok = await copyToClipboard(text)
    showToast(ok ? `${label} copied` : 'Could not access the clipboard', ok ? 'success' : 'error')
  }

  return (
    <div
      ref={ref}
      role="menu"
      onClick={e => e.stopPropagation()}
      className={`absolute w-60 bg-raised border border-edge rounded-lg shadow-2xl z-50 p-1.5 flex flex-col gap-1 cursor-default ${className}`}
    >
      <div className="grid grid-cols-3 gap-1 mb-1">
        <button type="button" onClick={run(() => copy(taskUrl(task), 'Task link'))} className="flex items-center justify-center gap-1 bg-edge hover:bg-edge-2 py-1.5 rounded text-[11px] text-neutral-300"><Link size={12} /> Link</button>
        <button type="button" onClick={run(() => copy(task.id, 'Task ID'))} className="flex items-center justify-center gap-1 bg-edge hover:bg-edge-2 py-1.5 rounded text-[11px] text-neutral-300"><Copy size={12} /> ID</button>
        <button type="button" onClick={run(() => openTaskDrawer(task))} className="flex items-center justify-center gap-1 bg-edge hover:bg-edge-2 py-1.5 rounded text-[11px] text-neutral-300"><ExternalLink size={12} /> Open</button>
      </div>
      <div className="h-px bg-edge my-0.5" />
      <MenuItem icon={Pencil} label="Rename" onClick={run(onRename || (() => openTaskDrawer(task)))} />
      <MenuItem icon={DuplicateIcon} label="Duplicate" onClick={run(() => duplicateTask(task))} />
      <MenuItem icon={watching ? BellOff : Bell} label={watching ? 'Cancel reminder' : 'Remind me'} onClick={run(() => toggleTaskWatch(task))} />
      {isAdmin && (
        <>
          <MenuItem icon={Archive} label={task.isArchived ? 'Unarchive' : 'Archive'} onClick={run(() => setTaskArchived(task, !task.isArchived))} />
          <div className="h-px bg-edge my-0.5" />
          <MenuItem
            icon={Trash2}
            label="Delete"
            danger
            onClick={run(() => confirmAction('Delete task', `Delete "${task.title}"? You'll have a few seconds to undo.`, () => deleteTask(task.id)))}
          />
        </>
      )}
    </div>
  )
}

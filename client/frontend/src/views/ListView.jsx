import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { useAuth } from '../context/AuthContext'
import {
  Plus, Search, ChevronDown, Flag, Circle, MoreHorizontal, Archive, CheckCircle2, ListTodo, Repeat, Lock, Paperclip
} from 'lucide-react'
import CreateTaskForm from '../components/CreateTaskForm'
import ProjectViewShell from '../components/ProjectViewShell'
import TaskActionsMenu from '../components/TaskActionsMenu'
import FilterBar from '../components/FilterBar'
import { applyTaskFilters, EMPTY_FILTERS, hasActiveFilters } from '../utils/taskMeta'
import { SkeletonRows, EmptyState } from '../components/Skeleton'
import { LabelChip } from '../components/Labels'
import { formatDue, isOverdue } from '../utils/dates'
import { useShortcut } from '../utils/shortcuts'

// --- CONSTANTS ---
const PRIORITIES = {
  High: { color: 'text-red-400' },
  Normal: { color: 'text-neutral-400' },
  Low: { color: 'text-neutral-500' }
}

const STATUSES = {
  'TO DO': { color: 'bg-neutral-500/15 text-neutral-300 ring-1 ring-inset ring-neutral-500/25' },
  'IN PROGRESS': { color: 'bg-ember-500/15 text-ember-300 ring-1 ring-inset ring-ember-500/30' },
  'COMPLETE': { color: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30' }
}

// --- HELPER COMPONENTS ---

const Dropdown = ({ options, onSelect, onClose, align = 'left', label }) => {
  const ref = useRef()
  useEffect(() => {
    const clickOutside = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', clickOutside)
    document.addEventListener('keydown', onKey)
    ref.current?.querySelector('button')?.focus()
    return () => {
      document.removeEventListener('mousedown', clickOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  // Arrow keys move between options
  const onKeyDown = (e) => {
    if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return
    e.preventDefault()
    const items = [...ref.current.querySelectorAll('button')]
    const i = items.indexOf(document.activeElement)
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
  }

  return (
    <div ref={ref} role="listbox" aria-label={label} onKeyDown={onKeyDown} className={`absolute top-full ${align === 'right' ? 'right-0' : 'left-0'} mt-1 w-44 max-h-64 overflow-y-auto bg-raised border border-edge rounded-md shadow-xl z-50 py-1`}>
      {options.map(opt => {
        const key = typeof opt === 'object' ? opt.value : opt
        const text = typeof opt === 'object' ? opt.label : opt
        return (
          <button
            type="button"
            role="option"
            aria-selected={false}
            key={key}
            className="w-full text-left px-3 py-2 hover:bg-edge focus:bg-edge focus:outline-none text-sm text-neutral-200 cursor-pointer truncate"
            onClick={(e) => { e.stopPropagation(); onSelect(key) }}
          >
            {text}
          </button>
        )
      })}
    </div>
  )
}

// --- MAIN COMPONENT ---

export default function ListView() {
  const { projectId } = useParams()
  const { tasks, loading, addTask, updateTask, members, getMemberById, openTaskDrawer } = useProject()
  const { userRole } = useAuth()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [activePopup, setActivePopup] = useState(null) // { taskId, field }
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  useShortcut('new-task', useCallback(() => setShowCreateModal(true), []))

  const projectTasks = useMemo(() => tasks.filter(t => String(t.projectId) === String(projectId)), [tasks, projectId])
  const filteredTasks = useMemo(() => applyTaskFilters(
    projectTasks.filter(t => (showArchived ? t.isArchived : !t.isArchived) && (t.title || '').toLowerCase().includes(searchQuery.toLowerCase())),
    filters
  ), [projectTasks, showArchived, searchQuery, filters])

  const closeMenu = useCallback(() => setActiveMenuId(null), [])
  const closePopup = useCallback(() => setActivePopup(null), [])

  // --- ACTIONS ---

  const handleCreateTask = (taskData) => {
    addTask({ ...taskData, projectId, status: 'TO DO' })
    setShowCreateModal(false)
  }

  const handleInlineAdd = () => {
    if (!newTaskTitle.trim()) return
    addTask({ title: newTaskTitle.trim(), projectId, status: 'TO DO', priority: 'Normal', assigneeId: '' })
    setNewTaskTitle('')
  }

  const handleUpdateTask = (id, field, value) => {
    updateTask(id, { [field]: value })
    setActivePopup(null)
  }

  const startEditing = (task) => {
    setEditingId(task.id)
    setEditText(task.title || '')
    setActiveMenuId(null)
  }

  const saveEdit = (task) => {
    const next = editText.trim()
    if (next && next !== task.title) handleUpdateTask(task.id, 'title', next)
    setEditingId(null)
  }

  const togglePopup = (taskId, field) =>
    setActivePopup(activePopup?.taskId === taskId && activePopup?.field === field ? null : { taskId, field })

  const filtered = searchQuery || hasActiveFilters(filters)

  return (
    <ProjectViewShell projectId={projectId} view="list">
      {/* Toolbar */}
      <div className="bg-base px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-raised">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <div className="relative">
            <Search size={14} aria-hidden="true" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              placeholder="Search tasks..."
              aria-label="Search tasks in this project"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-card border border-raised rounded-md pl-8 pr-3 py-1.5 text-sm text-neutral-200 focus:border-accent-500/60 focus:outline-none w-44 placeholder-neutral-500"
            />
          </div>
          <FilterBar filters={filters} onChange={setFilters} scope={projectId} />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={showArchived}
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${showArchived ? 'bg-accent-500/20 text-accent-300 ring-1 ring-inset ring-accent-500/30' : 'text-neutral-400 hover:bg-raised hover:text-white'}`}
          >
            <Archive size={14} aria-hidden="true" /> <span className="hidden sm:inline">{showArchived ? 'Hide archived' : 'Archived'}</span>
          </button>
          <button type="button" onClick={() => setShowCreateModal(true)} className="flex items-center gap-1.5 bg-white text-black text-sm font-semibold px-3 py-1.5 rounded-md hover:bg-neutral-200 transition-colors">
            <Plus size={14} aria-hidden="true" /> Add Task <kbd className="hidden md:inline text-[11px] text-neutral-500 font-sans ml-1">C</kbd>
          </button>
        </div>
      </div>

      {/* Main List Area */}
      <main className="flex-1 overflow-auto p-3 sm:p-6 pb-40">

        <div className="flex items-center gap-2 mb-2 px-2">
          <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-neutral-600 text-white">{showArchived ? 'Archived' : 'Tasks'}</span>
          <span className="text-xs text-neutral-400 font-medium tabular-nums" aria-live="polite">
            {filteredTasks.length}{filtered ? ` of ${projectTasks.filter(t => (showArchived ? t.isArchived : !t.isArchived)).length}` : ''}
          </span>
          <div className="flex-1 border-b border-raised ml-2 opacity-50" />
        </div>

        {/* Table Header */}
        <div className="hidden md:flex items-center px-2 py-2 text-xs font-semibold text-neutral-400 uppercase border-b border-raised">
          <div className="flex-1 pl-8">Name</div>
          <div className="w-28 text-center">Assignee</div>
          <div className="w-28 text-center">Due Date</div>
          <div className="w-20 text-center">Priority</div>
          <div className="w-28 text-center">Status</div>
          <div className="w-10"></div>
        </div>

        {loading.tasks ? <SkeletonRows rows={6} label="Loading tasks" /> : (
          <ul className="mb-2">
            {filteredTasks.map((task) => {
              const assignee = getMemberById(task.assigneeId)
              const overdue = task.status !== 'COMPLETE' && isOverdue(task.dueDate)
              const blocked = (task.blockedBy || []).some(id => tasks.find(t => t.id === id && t.status !== 'COMPLETE'))
              return (
                <li
                  key={task.id}
                  onClick={() => openTaskDrawer(task)}
                  className="group relative flex flex-wrap md:flex-nowrap items-center gap-y-1 px-2 py-2.5 border-b border-raised hover:bg-card text-sm text-neutral-300 transition-colors cursor-pointer"
                >
                  {/* Title Column */}
                  <div className="flex-1 flex items-center gap-3 relative min-w-0 basis-full md:basis-auto">
                    <button
                      type="button"
                      aria-label={task.status === 'COMPLETE' ? `Mark "${task.title}" as to do` : `Mark "${task.title}" complete`}
                      className="cursor-pointer text-neutral-400 hover:text-green-400 flex-shrink-0 p-0.5"
                      onClick={(e) => { e.stopPropagation(); handleUpdateTask(task.id, 'status', task.status === 'COMPLETE' ? 'TO DO' : 'COMPLETE') }}
                    >
                      {task.status === 'COMPLETE' ? <CheckCircle2 size={16} className="text-green-400" /> : <Circle size={16} strokeWidth={2} />}
                    </button>

                    {editingId === task.id ? (
                      <input
                        autoFocus
                        aria-label="Task title"
                        value={editText}
                        maxLength={300}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={() => saveEdit(task)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(task)
                          if (e.key === 'Escape') { e.preventDefault(); setEditingId(null) }
                        }}
                        className="bg-base text-white px-2 py-0.5 rounded border border-accent-500 outline-none w-full"
                      />
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openTaskDrawer(task) }}
                          onDoubleClick={(e) => { e.stopPropagation(); startEditing(task) }}
                          title="Double-click to rename"
                          className={`font-medium truncate text-left hover:text-white ${task.status === 'COMPLETE' ? 'line-through text-neutral-400' : 'text-neutral-100'}`}
                        >
                          {task.title}
                        </button>
                        {blocked && <Lock size={12} className="text-amber-400 flex-shrink-0" aria-label="Blocked by another task" />}
                        {task.recurrence && <Repeat size={12} className="text-neutral-400 flex-shrink-0" aria-label={`Repeats ${task.recurrence}`} />}
                        {task.attachments?.length > 0 && <Paperclip size={12} className="text-neutral-400 flex-shrink-0" aria-label={`${task.attachments.length} attachments`} />}
                        <span className="hidden lg:flex items-center gap-1 flex-shrink-0">
                          {(task.labels || []).slice(0, 3).map(l => <LabelChip key={l} label={l} size="xs" />)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Assignee Column */}
                  <div className="w-auto md:w-28 flex md:justify-center relative ml-8 md:ml-0 mr-3 md:mr-0">
                    <div
                      className={`flex items-center gap-1.5 md:w-28 group/assignee relative rounded px-1 py-0.5 ${userRole === 'admin' ? 'cursor-pointer hover:bg-raised' : ''}`}
                      role={userRole === 'admin' ? 'button' : undefined}
                      tabIndex={userRole === 'admin' ? 0 : undefined}
                      aria-label={userRole === 'admin' ? `Assignee: ${assignee?.name || 'Unassigned'}. Change assignee` : undefined}
                      onKeyDown={(e) => { if (userRole === 'admin' && e.key === 'Enter') { e.stopPropagation(); togglePopup(task.id, 'assignee') } }}
                      onClick={(e) => {
                        if (userRole !== 'admin') return
                        e.stopPropagation()
                        togglePopup(task.id, 'assignee')
                      }}
                    >
                      <div className="w-6 h-6 rounded-full bg-accent-500/15 ring-1 ring-inset ring-accent-400/25 flex items-center justify-center text-[11px] font-bold text-accent-200 flex-shrink-0" aria-hidden="true">
                        {assignee?.name?.[0]?.toUpperCase() || '–'}
                      </div>
                      <span className="text-xs text-neutral-300 truncate flex-1">{assignee?.name?.split(' ')[0] || 'Unassigned'}</span>
                      {userRole === 'admin' && (
                        <>
                          <ChevronDown size={12} aria-hidden="true" className="hidden md:block text-neutral-500 opacity-0 group-hover/assignee:opacity-100 transition-opacity" />
                          {activePopup?.taskId === task.id && activePopup?.field === 'assignee' && (
                            <Dropdown
                              label="Assignee"
                              options={[
                                { value: '', label: 'Unassigned' },
                                ...members.map(m => ({ value: m.id, label: m.name || m.email }))
                              ]}
                              onSelect={(val) => handleUpdateTask(task.id, 'assigneeId', val)}
                              onClose={closePopup}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Due Date Column */}
                  <div className={`md:w-28 md:text-center text-xs mr-3 md:mr-0 ${overdue ? 'text-red-400 font-semibold' : 'text-neutral-400'}`}>
                    {overdue && <span className="sr-only">Overdue, </span>}
                    {formatDue(task.dueDate) || <span className="md:inline hidden">-</span>}
                  </div>

                  {/* Priority Column */}
                  <div className="md:w-20 flex justify-center relative mr-2 md:mr-0">
                    <button
                      type="button"
                      aria-label={`Priority: ${task.priority || 'none'}. Change priority`}
                      onClick={(e) => { e.stopPropagation(); togglePopup(task.id, 'priority') }}
                      className="cursor-pointer hover:bg-raised p-1.5 rounded"
                    >
                      <Flag size={14} className={PRIORITIES[task.priority]?.color || 'text-neutral-500'} />
                    </button>
                    {activePopup?.taskId === task.id && activePopup?.field === 'priority' && (
                      <Dropdown label="Priority" options={Object.keys(PRIORITIES)} onSelect={(val) => handleUpdateTask(task.id, 'priority', val)} onClose={closePopup} />
                    )}
                  </div>

                  {/* Status Column */}
                  <div className="md:w-28 flex justify-center relative ml-auto md:ml-0">
                    <button
                      type="button"
                      aria-label={`Status: ${task.status}. Change status`}
                      onClick={(e) => { e.stopPropagation(); togglePopup(task.id, 'status') }}
                      className={`px-2 py-1 ${STATUSES[task.status]?.color || 'bg-neutral-700 text-neutral-200'} text-[11px] font-semibold uppercase tracking-wide rounded-md cursor-pointer transition-opacity hover:opacity-80 whitespace-nowrap`}
                    >
                      {task.status}
                    </button>
                    {activePopup?.taskId === task.id && activePopup?.field === 'status' && (
                      <Dropdown label="Status" options={Object.keys(STATUSES)} onSelect={(val) => handleUpdateTask(task.id, 'status', val)} onClose={closePopup} align="right" />
                    )}
                  </div>

                  {/* Menu: always visible (dimmed) so actions don't depend on hover */}
                  <div className="w-10 flex justify-center relative">
                    <button
                      type="button"
                      aria-label={`Actions for "${task.title}"`}
                      aria-haspopup="menu"
                      aria-expanded={activeMenuId === task.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveMenuId(activeMenuId === task.id ? null : task.id)
                      }}
                      className={`p-1.5 rounded hover:bg-edge transition-opacity ${activeMenuId === task.id ? 'opacity-100 bg-edge' : 'opacity-50 group-hover:opacity-100 focus:opacity-100'}`}
                    >
                      <MoreHorizontal size={16} className="text-neutral-300" />
                    </button>
                    {activeMenuId === task.id && (
                      <TaskActionsMenu task={task} onClose={closeMenu} onRename={() => startEditing(task)} />
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {!loading.tasks && filteredTasks.length === 0 && (
          filtered ? (
            <EmptyState
              icon={Search}
              title="No tasks match"
              description="Try a different search or clear the filters."
              action={{ label: 'Clear filters', onClick: () => { setFilters(EMPTY_FILTERS); setSearchQuery('') } }}
            />
          ) : showArchived ? (
            <EmptyState icon={Archive} title="Nothing archived" description="Archived tasks from this project will show up here." />
          ) : (
            <EmptyState
              icon={ListTodo}
              title="No tasks yet"
              description="Add the first task for this project. Press C anywhere in a project to create one."
              action={{ label: 'Add a task', icon: Plus, onClick: () => setShowCreateModal(true) }}
            />
          )
        )}

        {/* Inline quick add */}
        {!showArchived && !loading.tasks && (
          <div className="flex items-center gap-3 px-2 py-2 text-sm text-neutral-400 hover:bg-card rounded-md transition-colors group">
            <Plus size={16} className="text-neutral-500" aria-hidden="true" />
            <input
              id="new-task-input"
              aria-label="New task title"
              value={newTaskTitle}
              maxLength={300}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInlineAdd()}
              placeholder="Quick add a task and press Enter…"
              className="bg-transparent border-none focus:outline-none flex-1 placeholder-neutral-500 text-neutral-200 py-1"
            />
          </div>
        )}
      </main>

      {showCreateModal && (
        <CreateTaskForm onCreate={handleCreateTask} onCancel={() => setShowCreateModal(false)} defaultStatus="TO DO" />
      )}
    </ProjectViewShell>
  )
}

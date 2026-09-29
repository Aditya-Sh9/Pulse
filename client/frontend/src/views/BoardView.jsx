import React, { useState, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useProject, taskSortKey } from '../context/ProjectContext'
import { Plus, MoreHorizontal, Clock, UserCircle, Archive, Lock, Repeat, Paperclip, CheckSquare } from 'lucide-react'
import CreateTaskForm from '../components/CreateTaskForm'
import ProjectViewShell from '../components/ProjectViewShell'
import TaskActionsMenu from '../components/TaskActionsMenu'
import FilterBar from '../components/FilterBar'
import { applyTaskFilters, EMPTY_FILTERS } from '../utils/taskMeta'
import { SkeletonCards } from '../components/Skeleton'
import { LabelChip } from '../components/Labels'
import { formatDue, isOverdue } from '../utils/dates'
import { useShortcut } from '../utils/shortcuts'

// --- CONSTANTS ---
const COLUMNS = [
  { id: 'TO DO', label: 'To Do', color: 'bg-neutral-400' },
  { id: 'IN PROGRESS', label: 'In Progress', color: 'bg-ember-500' },
  { id: 'COMPLETE', label: 'Complete', color: 'bg-green-500' }
]

const PRIORITIES = {
  High: { color: 'text-red-300 bg-red-400/10 border-red-400/25' },
  Normal: { color: 'text-neutral-200 bg-neutral-500/10 border-neutral-500/30' },
  Low: { color: 'text-neutral-300 bg-neutral-400/10 border-neutral-400/25' }
}

const DropIndicator = () => <div aria-hidden="true" className="h-1 rounded-full bg-accent-400/80 -my-1.5" />

export default function BoardView() {
  const { projectId } = useParams()
  const { tasks, loading, addTask, moveTask, reorderTask, getMemberById, openTaskDrawer } = useProject()

  // UI States
  const [draggedTaskId, setDraggedTaskId] = useState(null)
  // Where the dragged card would land: { status, beforeId } (beforeId null = end of column)
  const [dropTarget, setDropTarget] = useState(null)
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [defaultStatus, setDefaultStatus] = useState('TO DO')
  const [showArchived, setShowArchived] = useState(false)
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  const closeMenu = useCallback(() => setActiveMenuId(null), [])
  useShortcut('new-task', useCallback(() => { setDefaultStatus('TO DO'); setShowCreateModal(true) }, []))

  const projectTasks = useMemo(() => applyTaskFilters(
    tasks.filter(t => String(t.projectId) === String(projectId) && (showArchived ? t.isArchived : !t.isArchived)),
    filters
  ), [tasks, projectId, showArchived, filters])

  const byColumn = useMemo(() => Object.fromEntries(COLUMNS.map(c => [
    c.id,
    projectTasks.filter(t => t.status === c.id).sort((a, b) => taskSortKey(a) - taskSortKey(b))
  ])), [projectTasks])

  // --- Task Handlers ---
  const handleCreateTask = (taskData) => {
    addTask({ ...taskData, projectId, status: defaultStatus })
    setShowCreateModal(false)
  }

  const openCreate = (status) => {
    setDefaultStatus(status)
    setShowCreateModal(true)
  }

  // --- Drag & Drop Handlers ---
  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', taskId)
  }

  const handleDragEnd = () => {
    setDraggedTaskId(null)
    setDropTarget(null)
  }

  // Hovering the top/bottom half of a card targets the slot before/after it
  const handleCardDragOver = (e, status, task, nextTaskId) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const before = e.clientY < rect.top + rect.height / 2
    const beforeId = before ? task.id : nextTaskId
    if (dropTarget?.status !== status || dropTarget?.beforeId !== beforeId) setDropTarget({ status, beforeId })
  }

  const handleDrop = (e, status) => {
    e.preventDefault()
    const taskId = draggedTaskId || e.dataTransfer.getData('text/plain')
    const beforeId = dropTarget?.status === status ? dropTarget.beforeId : null
    if (taskId && beforeId !== taskId) reorderTask(taskId, status, beforeId)
    setDropTarget(null)
    setDraggedTaskId(null)
  }

  return (
    <ProjectViewShell
      projectId={projectId}
      view="board"
      actions={
        <button
          type="button"
          aria-pressed={showArchived}
          onClick={() => setShowArchived(!showArchived)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${showArchived ? 'bg-accent-500/20 text-accent-300' : 'text-neutral-400 hover:text-white hover:bg-raised'}`}
        >
          <Archive size={14} aria-hidden="true" /> <span className="hidden sm:inline">{showArchived ? 'Hide archived' : 'Archived'}</span>
        </button>
      }
    >
      <div className="px-4 sm:px-6 pt-3 flex flex-wrap items-center gap-2">
        <FilterBar filters={filters} onChange={setFilters} scope={projectId} showStatus={false} />
      </div>

      {/* --- Kanban Board: horizontal scroll with snap on small screens --- */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 sm:p-6 snap-x snap-mandatory md:snap-none">
        <div className="flex h-full gap-4 sm:gap-6">

          {COLUMNS.map(column => {
            const columnTasks = byColumn[column.id]
            const targeted = dropTarget?.status === column.id

            return (
              <section
                key={column.id}
                aria-labelledby={`col-${column.id}`}
                className="flex-1 flex flex-col w-[85vw] sm:w-auto min-w-[85vw] sm:min-w-[300px] h-full snap-start"
                onDragOver={(e) => {
                  e.preventDefault()
                  if (!targeted || dropTarget.beforeId !== null) {
                    // Empty space below the cards = end of column
                    if (e.target === e.currentTarget || e.target.dataset?.dropzone) setDropTarget({ status: column.id, beforeId: null })
                  }
                }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropTarget(null) }}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3 px-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${column.color}`} aria-hidden="true"></span>
                    <h2 id={`col-${column.id}`} className="text-sm font-bold text-neutral-200 uppercase tracking-wide">{column.label}</h2>
                    <span className="text-xs text-neutral-300 bg-card px-2 py-0.5 rounded-full tabular-nums" aria-label={`${columnTasks.length} tasks`}>{columnTasks.length}</span>
                  </div>
                  {!showArchived && (
                    <button
                      type="button"
                      aria-label={`Add task to ${column.label}`}
                      onClick={() => openCreate(column.id)}
                      className="p-1.5 hover:bg-raised rounded text-neutral-400 hover:text-white transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  )}
                </div>

                {/* Drop Zone */}
                <div
                  data-dropzone="true"
                  className={`flex-1 bg-panel rounded-xl border p-3 overflow-y-auto space-y-3 transition-colors ${targeted ? 'border-accent-500/50 bg-accent-500/5' : 'border-raised/50'}`}
                >
                  {loading.tasks ? <SkeletonCards count={column.id === 'TO DO' ? 3 : 2} /> : columnTasks.map((task, index) => {
                    const assignee = getMemberById(task.assigneeId)
                    const overdue = task.status !== 'COMPLETE' && isOverdue(task.dueDate)
                    const doneSubtasks = (task.subtasks || []).filter(s => s.completed).length
                    const blocked = (task.blockedBy || []).some(id => tasks.find(t => t.id === id && t.status !== 'COMPLETE'))
                    const nextId = columnTasks[index + 1]?.id ?? null

                    return (
                      <React.Fragment key={task.id}>
                        {targeted && dropTarget.beforeId === task.id && draggedTaskId !== task.id && <DropIndicator />}
                        <article
                          draggable
                          tabIndex={0}
                          aria-label={`${task.title}. ${task.priority || 'Normal'} priority${task.dueDate ? `, due ${formatDue(task.dueDate)}` : ''}${blocked ? ', blocked' : ''}`}
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleCardDragOver(e, column.id, task, nextId)}
                          onClick={() => openTaskDrawer(task)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) openTaskDrawer(task) }}
                          className={`group bg-card p-4 rounded-lg border shadow-sm hover:border-accent-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/60 cursor-grab active:cursor-grabbing transition-[border-color,opacity] duration-200 ${draggedTaskId === task.id ? 'opacity-40 border-dashed border-accent-500/40' : 'border-raised'}`}
                        >
                          {/* Tags Row */}
                          <div className="flex justify-between items-start mb-2 relative gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${PRIORITIES[task.priority]?.color || 'text-neutral-400 border-neutral-700'}`}>
                                {task.priority}
                              </span>
                              {blocked && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25"><Lock size={10} aria-hidden="true" /> Blocked</span>}
                            </div>
                            <button
                              type="button"
                              aria-label={`Actions for "${task.title}"`}
                              aria-haspopup="menu"
                              aria-expanded={activeMenuId === task.id}
                              onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === task.id ? null : task.id) }}
                              className={`p-1 -m-1 rounded transition-opacity ${activeMenuId === task.id ? 'opacity-100 text-white bg-edge' : 'opacity-50 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 text-neutral-300 hover:text-white'}`}
                            >
                              <MoreHorizontal size={16} />
                            </button>

                            {activeMenuId === task.id && (
                              <TaskActionsMenu task={task} onClose={closeMenu} className="right-0 top-6" />
                            )}
                          </div>

                          {/* Title */}
                          <h3 className="text-sm font-medium text-neutral-100 mb-2 leading-snug break-words">
                            {task.title}
                          </h3>

                          {task.labels?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {task.labels.slice(0, 4).map(l => <LabelChip key={l} label={l} size="xs" />)}
                              {task.labels.length > 4 && <span className="text-[11px] text-neutral-400">+{task.labels.length - 4}</span>}
                            </div>
                          )}

                          {/* Footer Row */}
                          <div className="flex items-center justify-between pt-3 border-t border-white/5 gap-2">
                            <div className="flex items-center gap-3 text-neutral-400 text-xs min-w-0">
                              <span className={`flex items-center gap-1 ${overdue ? 'text-red-400 font-semibold' : ''}`}>
                                <Clock size={12} aria-hidden="true" />
                                {overdue && <span className="sr-only">Overdue:</span>}
                                {formatDue(task.dueDate) || '–'}
                              </span>
                              {task.subtasks?.length > 0 && (
                                <span className="flex items-center gap-1 tabular-nums"><CheckSquare size={12} aria-hidden="true" />{doneSubtasks}/{task.subtasks.length}</span>
                              )}
                              {task.attachments?.length > 0 && (
                                <span className="flex items-center gap-1 tabular-nums"><Paperclip size={12} aria-hidden="true" />{task.attachments.length}</span>
                              )}
                              {task.recurrence && <Repeat size={12} aria-label={`Repeats ${task.recurrence}`} />}
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Keyboard/touch alternative to drag-and-drop */}
                              <label className="sr-only" htmlFor={`move-${task.id}`}>Move “{task.title}” to column</label>
                              <select
                                id={`move-${task.id}`}
                                value={task.status}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => moveTask(task.id, e.target.value)}
                                className="bg-transparent text-[11px] text-neutral-300 hover:text-white focus:text-white rounded px-1 py-1 min-h-6 border border-transparent hover:border-edge focus:outline-none focus:ring-1 focus:ring-accent-500 cursor-pointer"
                              >
                                {COLUMNS.map(c => <option key={c.id} value={c.id} className="bg-card">{c.label}</option>)}
                              </select>
                              {assignee ? (
                                <div
                                  role="img"
                                  className="w-6 h-6 rounded-full bg-raised ring-1 ring-inset ring-edge flex items-center justify-center text-[11px] font-semibold text-neutral-100 flex-shrink-0"
                                  title={assignee.name}
                                  aria-label={`Assigned to ${assignee.name}`}
                                >
                                  {assignee.name?.[0]?.toUpperCase() || 'U'}
                                </div>
                              ) : (
                                <div role="img" title="Unassigned" aria-label="Unassigned" className="w-6 h-6 rounded-full border border-dashed border-neutral-500 flex items-center justify-center text-neutral-500">
                                  <UserCircle size={14} />
                                </div>
                              )}
                            </div>
                          </div>
                        </article>
                      </React.Fragment>
                    )
                  })}

                  {targeted && dropTarget.beforeId === null && columnTasks.length > 0 && <DropIndicator />}

                  {/* Empty State / Drop Target Hint */}
                  {!loading.tasks && columnTasks.length === 0 && (
                    <div data-dropzone="true" className="h-28 rounded-lg border-2 border-dashed border-raised flex flex-col items-center justify-center gap-2 text-neutral-400 text-xs">
                      <span data-dropzone="true">{showArchived ? 'No archived tasks' : 'Drop tasks here'}</span>
                      {!showArchived && (
                        <button type="button" onClick={() => openCreate(column.id)} className="flex items-center gap-1 text-accent-300 hover:text-accent-200 font-medium">
                          <Plus size={12} aria-hidden="true" /> Add task
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      </div>

      {showCreateModal && (
        <CreateTaskForm onCreate={handleCreateTask} onCancel={() => setShowCreateModal(false)} defaultStatus={defaultStatus} />
      )}
    </ProjectViewShell>
  )
}

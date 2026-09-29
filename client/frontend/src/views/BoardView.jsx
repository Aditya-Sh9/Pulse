import React, { useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { Plus, MoreHorizontal, Clock, UserCircle, Archive } from 'lucide-react'
import CreateTaskForm from '../components/CreateTaskForm'
import ProjectViewShell from '../components/ProjectViewShell'
import TaskActionsMenu from '../components/TaskActionsMenu'
import { formatDue, isOverdue } from '../utils/dates'

// --- CONSTANTS ---
const COLUMNS = [
  { id: 'TO DO', label: 'To Do', color: 'bg-neutral-500' },
  { id: 'IN PROGRESS', label: 'In Progress', color: 'bg-ember-500' },
  { id: 'COMPLETE', label: 'Complete', color: 'bg-green-500' }
]

const PRIORITIES = {
  High: { color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  Normal: { color: 'text-neutral-300 bg-neutral-500/10 border-neutral-500/25' },
  Low: { color: 'text-neutral-400 bg-neutral-400/10 border-neutral-400/20' }
}

export default function BoardView() {
  const { projectId } = useParams()
  const { tasks, addTask, moveTask, getMemberById, openTaskDrawer } = useProject()

  // UI States
  const [draggedTaskId, setDraggedTaskId] = useState(null)
  const [dragOverColumn, setDragOverColumn] = useState(null)
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [defaultStatus, setDefaultStatus] = useState('TO DO')
  const [showArchived, setShowArchived] = useState(false)

  const closeMenu = useCallback(() => setActiveMenuId(null), [])

  const projectTasks = tasks.filter(t => String(t.projectId) === String(projectId) && (showArchived ? t.isArchived : !t.isArchived))

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
    e.currentTarget.style.opacity = '0.5'
  }

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1'
    setDraggedTaskId(null)
    setDragOverColumn(null)
  }

  const handleDrop = (e, status) => {
    e.preventDefault()
    if (draggedTaskId) moveTask(draggedTaskId, status)
    setDragOverColumn(null)
  }

  return (
    <ProjectViewShell
      projectId={projectId}
      view="board"
      actions={
        <button
          type="button"
          onClick={() => setShowArchived(!showArchived)}
          className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${showArchived ? 'bg-accent-500/20 text-accent-400' : 'text-neutral-400 hover:text-white hover:bg-raised'}`}
        >
          <Archive size={12} /> {showArchived ? 'Hide Archived' : 'Show Archived'}
        </button>
      }
    >
      {/* --- Kanban Board --- */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <div className="flex h-full gap-6 min-w-[1000px]">

          {COLUMNS.map(column => {
            const columnTasks = projectTasks.filter(t => t.status === column.id)

            return (
              <section
                key={column.id}
                aria-label={`${column.label} column`}
                className="flex-1 flex flex-col min-w-[300px] h-full"
                onDragOver={(e) => { e.preventDefault(); setDragOverColumn(column.id) }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverColumn(null) }}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${column.color}`}></span>
                    <h2 className="text-sm font-bold text-neutral-300 uppercase tracking-wide">{column.label}</h2>
                    <span className="text-xs text-neutral-500 bg-card px-2 py-0.5 rounded-full">{columnTasks.length}</span>
                  </div>
                  {!showArchived && (
                    <button
                      type="button"
                      aria-label={`Add task to ${column.label}`}
                      onClick={() => openCreate(column.id)}
                      className="p-1 hover:bg-raised rounded text-neutral-500 hover:text-white transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>

                {/* Drop Zone */}
                <div className={`flex-1 bg-panel rounded-xl border p-3 overflow-y-auto space-y-3 transition-colors ${dragOverColumn === column.id ? 'border-accent-500/50 bg-accent-500/5' : 'border-raised/50'}`}>
                  {columnTasks.map(task => {
                    const assignee = getMemberById(task.assigneeId)
                    const overdue = task.status !== 'COMPLETE' && isOverdue(task.dueDate)
                    const doneSubtasks = (task.subtasks || []).filter(s => s.completed).length

                    return (
                      <div
                        key={task.id}
                        draggable
                        tabIndex={0}
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => openTaskDrawer(task)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) openTaskDrawer(task) }}
                        className="group bg-card p-4 rounded-lg border border-raised shadow-sm hover:border-accent-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/60 cursor-grab active:cursor-grabbing transition-all duration-200"
                      >
                        {/* Tags Row */}
                        <div className="flex justify-between items-start mb-2 relative">
                          <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${PRIORITIES[task.priority]?.color || 'text-neutral-500 border-neutral-700'}`}>
                            {task.priority}
                          </div>
                          <button
                            type="button"
                            aria-label="Task actions"
                            aria-haspopup="menu"
                            onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === task.id ? null : task.id) }}
                            className={`p-0.5 rounded transition-colors ${activeMenuId === task.id ? 'opacity-100 text-white bg-edge' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 text-neutral-600 hover:text-white'}`}
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          {activeMenuId === task.id && (
                            <TaskActionsMenu task={task} onClose={closeMenu} className="right-0 top-6" />
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="text-sm font-medium text-neutral-200 mb-3 leading-snug break-words">
                          {task.title}
                        </h3>

                        {/* Footer Row */}
                        <div className="flex items-center justify-between pt-3 border-t border-white/5 gap-2">
                          <div className="flex items-center gap-3 text-neutral-500 text-xs min-w-0">
                            <div className={`flex items-center gap-1 ${overdue ? 'text-red-400 font-semibold' : task.dueDate ? 'text-neutral-400' : ''}`}>
                              <Clock size={12} />
                              {formatDue(task.dueDate) || '-'}
                            </div>
                            {task.subtasks?.length > 0 && (
                              <span className="tabular-nums">{doneSubtasks}/{task.subtasks.length}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Keyboard/touch alternative to drag-and-drop */}
                            <select
                              aria-label="Move to column"
                              value={task.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => moveTask(task.id, e.target.value)}
                              className="bg-transparent text-[10px] text-neutral-500 hover:text-neutral-200 focus:text-neutral-200 rounded px-1 py-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-accent-500 cursor-pointer"
                            >
                              {COLUMNS.map(c => <option key={c.id} value={c.id} className="bg-card">{c.label}</option>)}
                            </select>
                            {assignee ? (
                              <div
                                className="w-6 h-6 rounded-full bg-raised ring-1 ring-inset ring-edge flex items-center justify-center text-[10px] font-semibold text-neutral-200 flex-shrink-0"
                                title={assignee.name}
                              >
                                {assignee.name?.[0]?.toUpperCase() || 'U'}
                              </div>
                            ) : (
                              <div title="Unassigned" className="w-6 h-6 rounded-full border border-dashed border-neutral-600 flex items-center justify-center text-neutral-600">
                                <UserCircle size={14} />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Empty State / Drop Target Hint */}
                  {columnTasks.length === 0 && (
                    <div className="h-24 rounded-lg border-2 border-dashed border-raised flex flex-col items-center justify-center text-neutral-600 text-xs">
                      <span>{showArchived ? 'No archived tasks' : 'Drop tasks here'}</span>
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

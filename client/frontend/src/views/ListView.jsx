import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { useAuth } from '../context/AuthContext'
import {
  Plus, Filter, Search, ChevronDown, Flag, Circle, MoreHorizontal, Archive, CheckCircle2
} from 'lucide-react'
import CreateTaskForm from '../components/CreateTaskForm'
import ProjectViewShell from '../components/ProjectViewShell'
import TaskActionsMenu from '../components/TaskActionsMenu'
import { formatDue, isOverdue } from '../utils/dates'

// --- CONSTANTS ---
const PRIORITIES = {
  High: { color: 'text-red-500' },
  Normal: { color: 'text-neutral-400' },
  Low: { color: 'text-neutral-500' }
}

const STATUSES = {
  'TO DO': { color: 'bg-neutral-500/15 text-neutral-300 ring-1 ring-inset ring-neutral-500/25' },
  'IN PROGRESS': { color: 'bg-ember-500/15 text-ember-300 ring-1 ring-inset ring-ember-500/30' },
  'COMPLETE': { color: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30' }
}

// --- HELPER COMPONENTS ---

const Dropdown = ({ options, onSelect, onClose, align = 'left' }) => {
  const ref = useRef()
  useEffect(() => {
    const clickOutside = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', clickOutside)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', clickOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div ref={ref} role="listbox" className={`absolute top-full ${align === 'right' ? 'right-0' : 'left-0'} mt-1 w-40 max-h-64 overflow-y-auto bg-raised border border-edge rounded-md shadow-xl z-50 py-1`}>
      {options.map(opt => {
        const key = typeof opt === 'object' ? opt.value : opt
        const label = typeof opt === 'object' ? opt.label : opt
        return (
          <button
            type="button"
            role="option"
            key={key}
            className="w-full text-left px-3 py-1.5 hover:bg-edge text-xs text-neutral-300 cursor-pointer truncate"
            onClick={(e) => { e.stopPropagation(); onSelect(key) }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

// --- MAIN COMPONENT ---

export default function ListView() {
  const { projectId } = useParams()
  const { tasks, addTask, updateTask, members, getMemberById, openTaskDrawer } = useProject()
  const { userRole } = useAuth()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  // Popup state: { taskId, field }
  const [activePopup, setActivePopup] = useState(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [showPriorityFilter, setShowPriorityFilter] = useState(false)
  const [priorityFilter, setPriorityFilter] = useState('') // '' means All

  const projectTasks = tasks.filter(t => String(t.projectId) === String(projectId))

  const filteredTasks = projectTasks.filter(t =>
    (showArchived ? t.isArchived : !t.isArchived) &&
    (t.title || '').toLowerCase().includes(searchQuery.toLowerCase()) &&
    (priorityFilter ? t.priority === priorityFilter : true)
  )

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

  return (
    <ProjectViewShell projectId={projectId} view="list">
      {/* Toolbar */}
      <div className="bg-base px-6 py-3 flex items-center justify-between border-b border-raised">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1.5 text-neutral-500" />
            <input
              placeholder="Search tasks..."
              aria-label="Search tasks"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border border-raised rounded-md pl-7 pr-3 py-1 text-xs text-neutral-300 focus:border-neutral-500 focus:outline-none w-40 hover:bg-card"
            />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPriorityFilter(!showPriorityFilter)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-colors ${priorityFilter ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30' : 'text-neutral-400 hover:bg-raised'}`}
            >
              <Filter size={12} /> {priorityFilter || 'Priority'}
            </button>

            {showPriorityFilter && (
              <Dropdown
                options={[{ label: 'All Priorities', value: '' }, ...Object.keys(PRIORITIES)]}
                onSelect={(val) => { setPriorityFilter(val); setShowPriorityFilter(false) }}
                onClose={() => setShowPriorityFilter(false)}
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${showArchived ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30' : 'text-neutral-400 hover:bg-raised'}`}
          >
            <Archive size={14} /> {showArchived ? 'Hide Archived' : 'Show Archived'}
          </button>
          <button type="button" onClick={() => setShowCreateModal(true)} className="bg-white text-black text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-neutral-200 transition-colors">
            Add Task
          </button>
        </div>
      </div>

      {/* Main List Area */}
      <main className="flex-1 overflow-auto p-6 pb-40">

        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-500 text-white">{showArchived ? 'Archived' : 'Tasks'}</span>
          <span className="text-xs text-neutral-500 font-medium">{filteredTasks.length}</span>
          <div className="flex-1 border-b border-raised ml-2 opacity-50" />
        </div>

        {/* Table Header */}
        <div className="flex items-center px-2 py-2 text-xs font-semibold text-neutral-500 uppercase border-b border-raised">
          <div className="flex-1 pl-8">Name</div>
          <div className="w-28 text-center">Assignee</div>
          <div className="w-28 text-center">Due Date</div>
          <div className="w-24 text-center">Priority</div>
          <div className="w-28 text-center">Status</div>
          <div className="w-10"></div>
        </div>

        {/* Table Rows */}
        <div className="mb-2">
          {filteredTasks.map((task) => {
            const assignee = getMemberById(task.assigneeId)
            const overdue = task.status !== 'COMPLETE' && isOverdue(task.dueDate)
            return (
              <div
                key={task.id}
                onClick={() => openTaskDrawer(task)}
                className="group relative flex items-center px-2 py-2 border-b border-raised hover:bg-card text-sm text-neutral-300 transition-colors cursor-pointer"
              >
                {/* Title Column */}
                <div className="flex-1 flex items-center gap-3 relative overflow-hidden">
                  <button
                    type="button"
                    aria-label={task.status === 'COMPLETE' ? 'Mark as to do' : 'Mark complete'}
                    className="cursor-pointer text-neutral-500 hover:text-green-500 flex-shrink-0"
                    onClick={(e) => { e.stopPropagation(); handleUpdateTask(task.id, 'status', task.status === 'COMPLETE' ? 'TO DO' : 'COMPLETE') }}
                  >
                    {task.status === 'COMPLETE' ? (
                      <CheckCircle2 size={14} className="text-green-500" />
                    ) : (
                      <Circle size={14} strokeWidth={2} />
                    )}
                  </button>

                  {editingId === task.id ? (
                    <input
                      autoFocus
                      value={editText}
                      maxLength={300}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => saveEdit(task)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(task)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="bg-base text-white px-2 py-0.5 rounded border border-accent-500 outline-none w-full"
                    />
                  ) : (
                    <span
                      onDoubleClick={(e) => { e.stopPropagation(); startEditing(task) }}
                      title="Double-click to rename"
                      className={`font-medium truncate hover:text-white ${task.status === 'COMPLETE' ? 'line-through text-neutral-500' : 'text-neutral-200'}`}
                    >
                      {task.title}
                    </span>
                  )}
                </div>

                {/* Assignee Column */}
                <div className="w-28 flex justify-center relative">
                  <div
                    className={`flex items-center gap-1.5 w-28 group/assignee relative ${userRole === 'admin' ? 'cursor-pointer' : ''}`}
                    onClick={(e) => {
                      if (userRole !== 'admin') return
                      e.stopPropagation()
                      togglePopup(task.id, 'assignee')
                    }}
                  >
                    <div className="w-6 h-6 rounded-full bg-accent-500/15 ring-1 ring-inset ring-accent-400/25 flex items-center justify-center text-[10px] font-bold text-accent-200 flex-shrink-0">
                      {assignee?.name?.[0]?.toUpperCase() || '–'}
                    </div>
                    <span className="text-xs text-neutral-400 truncate flex-1">{assignee?.name?.split(' ')[0] || 'Unassigned'}</span>

                    {userRole === 'admin' && (
                      <>
                        <ChevronDown size={12} className="text-neutral-600 opacity-0 group-hover/assignee:opacity-100 transition-opacity" />
                        {activePopup?.taskId === task.id && activePopup?.field === 'assignee' && (
                          <Dropdown
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
                <div className={`w-28 text-center text-xs ${overdue ? 'text-red-400 font-semibold' : 'text-neutral-500'}`}>
                  {formatDue(task.dueDate) || '-'}
                </div>

                {/* Priority Column */}
                <div className="w-24 flex justify-center relative">
                  <button
                    type="button"
                    aria-label={`Priority: ${task.priority || 'none'}`}
                    onClick={(e) => { e.stopPropagation(); togglePopup(task.id, 'priority') }}
                    className="cursor-pointer hover:bg-raised p-1 rounded"
                  >
                    <Flag size={14} className={PRIORITIES[task.priority]?.color || 'text-neutral-600'} />
                  </button>
                  {activePopup?.taskId === task.id && activePopup?.field === 'priority' && (
                    <Dropdown
                      options={Object.keys(PRIORITIES)}
                      onSelect={(val) => handleUpdateTask(task.id, 'priority', val)}
                      onClose={closePopup}
                    />
                  )}
                </div>

                {/* Status Column */}
                <div className="w-28 flex justify-center relative">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); togglePopup(task.id, 'status') }}
                    className={`px-2 py-0.5 ${STATUSES[task.status]?.color || 'bg-neutral-700 text-neutral-200'} text-[10px] font-semibold uppercase tracking-wide rounded-md cursor-pointer transition-opacity hover:opacity-80`}
                  >
                    {task.status}
                  </button>
                  {activePopup?.taskId === task.id && activePopup?.field === 'status' && (
                    <Dropdown
                      options={Object.keys(STATUSES)}
                      onSelect={(val) => handleUpdateTask(task.id, 'status', val)}
                      onClose={closePopup}
                      align="right"
                    />
                  )}
                </div>

                {/* Menu */}
                <div className="w-10 flex justify-center relative">
                  <button
                    type="button"
                    aria-label="Task actions"
                    aria-haspopup="menu"
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveMenuId(activeMenuId === task.id ? null : task.id)
                    }}
                    className={`p-1 rounded hover:bg-edge transition-colors ${activeMenuId === task.id ? 'opacity-100 bg-edge' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'}`}
                  >
                    <MoreHorizontal size={16} className="text-neutral-500 hover:text-neutral-200" />
                  </button>

                  {activeMenuId === task.id && (
                    <TaskActionsMenu task={task} onClose={closeMenu} onRename={() => startEditing(task)} />
                  )}
                </div>
              </div>
            )
          })}

          {filteredTasks.length === 0 && (
            <div className="py-10 text-center text-sm text-neutral-500">
              {searchQuery || priorityFilter ? 'No tasks match your filters.' : showArchived ? 'No archived tasks.' : 'No tasks yet. Add the first one below.'}
            </div>
          )}
        </div>

        {/* Inline quick add */}
        {!showArchived && (
          <div className="flex items-center gap-3 px-2 py-2 text-sm text-neutral-400 hover:bg-card rounded-md transition-colors group">
            <Plus size={16} className="text-neutral-500" />
            <input
              id="new-task-input"
              aria-label="New task title"
              value={newTaskTitle}
              maxLength={300}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInlineAdd()}
              placeholder="New Task..."
              className="bg-transparent border-none focus:outline-none flex-1 placeholder-neutral-600 text-neutral-300"
            />
            <button type="button" onClick={handleInlineAdd} className="text-xs bg-raised px-2 py-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white hover:text-black transition-all">Enter</button>
          </div>
        )}
      </main>

      {showCreateModal && (
        <CreateTaskForm onCreate={handleCreateTask} onCancel={() => setShowCreateModal(false)} defaultStatus="TO DO" />
      )}
    </ProjectViewShell>
  )
}

import React, { useState, useMemo, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { useAuth } from '../context/AuthContext'
import { Search, Flag, ArrowUp, ArrowDown, ArrowUpDown, Archive, Plus, Table as TableIcon } from 'lucide-react'
import CreateTaskForm from '../components/CreateTaskForm'
import ProjectViewShell from '../components/ProjectViewShell'
import { formatDue, isOverdue } from '../utils/dates'
import FilterBar from '../components/FilterBar'
import { applyTaskFilters, EMPTY_FILTERS, hasActiveFilters } from '../utils/taskMeta'
import { SkeletonRows, EmptyState } from '../components/Skeleton'
import { LabelChip } from '../components/Labels'
import { useShortcut } from '../utils/shortcuts'

// --- CONSTANTS ---
const PRIORITIES = {
  High: { color: 'text-red-400 bg-red-400/10 border-red-400/20', rank: 0 },
  Normal: { color: 'text-neutral-300 bg-neutral-500/10 border-neutral-500/25', rank: 1 },
  Low: { color: 'text-neutral-400 bg-neutral-400/10 border-neutral-400/20', rank: 2 }
}

const STATUSES = { 'TO DO': 0, 'IN PROGRESS': 1, 'COMPLETE': 2 }

const COLUMNS = [
  { field: 'title', label: 'Task Name', width: 'w-[34%]', align: 'text-left' },
  { field: 'labels', label: 'Labels', width: 'w-[16%]', align: 'text-left' },
  { field: 'assignee', label: 'Assignee', width: 'w-[13%]', align: 'text-center' },
  { field: 'status', label: 'Status', width: 'w-[13%]', align: 'text-center' },
  { field: 'dueDate', label: 'Due Date', width: 'w-[12%]', align: 'text-center' },
  { field: 'priority', label: 'Priority', width: 'w-[12%]', align: 'text-center' },
]

export default function TableView() {
  const { projectId } = useParams()
  const { tasks, loading, updateTask, addTask, members, getMemberById, openTaskDrawer } = useProject()
  const { userRole } = useAuth()

  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [showArchived, setShowArchived] = useState(false)
  const [sort, setSort] = useState({ field: null, dir: 'asc' })
  const [editingCell, setEditingCell] = useState(null) // { taskId, field }
  const [editValue, setEditValue] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('') // For the "Quick Add" row
  const [showCreateModal, setShowCreateModal] = useState(false)
  useShortcut('new-task', useCallback(() => setShowCreateModal(true), []))

  const filteredTasks = useMemo(() => {
    const q = searchQuery.toLowerCase()
    const rows = applyTaskFilters(tasks.filter(t =>
      String(t.projectId) === String(projectId) &&
      (showArchived ? t.isArchived : !t.isArchived) &&
      (t.title || '').toLowerCase().includes(q)
    ), filters)
    if (!sort.field) return rows

    const value = (t) => {
      switch (sort.field) {
        case 'assignee': return (getMemberById(t.assigneeId)?.name || '￿').toLowerCase()
        case 'status': return STATUSES[t.status] ?? 9
        case 'priority': return PRIORITIES[t.priority]?.rank ?? 9
        case 'dueDate': return t.dueDate || '￿'
        case 'labels': return ((t.labels || [])[0] || '￿').toLowerCase()
        default: return (t.title || '').toLowerCase()
      }
    }
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => (value(a) > value(b) ? dir : value(a) < value(b) ? -dir : 0))
  }, [tasks, projectId, showArchived, searchQuery, filters, sort, getMemberById])

  const toggleSort = (field) => setSort(prev => (
    prev.field !== field ? { field, dir: 'asc' }
      : prev.dir === 'asc' ? { field, dir: 'desc' }
        : { field: null, dir: 'asc' }
  ))

  // --- Handlers ---

  const handleCellEdit = (task, field) => {
    if (field === 'labels') { openTaskDrawer(task); return }
    if (field === 'assignee' && userRole !== 'admin') return
    setEditingCell({ taskId: task.id, field })
    setEditValue(field === 'assignee' ? (task.assigneeId || '') : (task[field] || ''))
  }

  const handleSaveCell = (task, field) => {
    const key = field === 'assignee' ? 'assigneeId' : field
    const current = task[key] || ''
    const next = field === 'title' ? editValue.trim() : editValue
    if (next !== current && !(field === 'title' && !next)) updateTask(task.id, { [key]: next })
    setEditingCell(null)
  }

  const handleKeyDown = (e, task, field) => {
    if (e.key === 'Enter') handleSaveCell(task, field)
    if (e.key === 'Escape') setEditingCell(null)
  }

  const handleQuickAdd = (e) => {
    if (e.key === 'Enter' && newTaskTitle.trim()) {
      addTask({ title: newTaskTitle.trim(), projectId, status: 'TO DO', priority: 'Normal', assigneeId: '' })
      setNewTaskTitle('')
    }
  }

  const handleCreateTask = (taskData) => {
    addTask({ ...taskData, projectId, status: 'TO DO' })
    setShowCreateModal(false)
  }

  // --- Renderers ---

  const renderCell = (task, field) => {
    const isEditing = editingCell?.taskId === task.id && editingCell?.field === field
    const commonInputClass = 'w-full bg-base text-white text-xs px-2 py-1.5 rounded border border-accent-500 focus:outline-none'

    if (isEditing) {
      const selectProps = {
        autoFocus: true,
        value: editValue,
        onChange: (e) => setEditValue(e.target.value),
        onBlur: () => handleSaveCell(task, field),
        onKeyDown: (e) => handleKeyDown(e, task, field),
        onClick: (e) => e.stopPropagation(),
        className: commonInputClass,
      }
      if (field === 'assignee') {
        return (
          <select {...selectProps} aria-label="Assignee">
            <option value="">Unassigned</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
          </select>
        )
      }
      if (field === 'priority') {
        return (
          <select {...selectProps} aria-label="Priority">
            {Object.keys(PRIORITIES).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        )
      }
      if (field === 'status') {
        return (
          <select {...selectProps} aria-label="Status">
            {Object.keys(STATUSES).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )
      }
      return (
        <input
          {...selectProps}
          aria-label={field === 'dueDate' ? 'Due date' : 'Title'}
          type={field === 'dueDate' ? 'date' : 'text'}
          maxLength={field === 'title' ? 300 : undefined}
          className={`${commonInputClass} [color-scheme:dark]`}
        />
      )
    }

    // VIEW MODE
    switch (field) {
      case 'title':
        return (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); openTaskDrawer(task) }}
            title="Open task (click the empty cell area to rename)"
            className="font-medium text-neutral-200 truncate block text-left hover:text-accent-400 transition-colors max-w-full"
          >
            {task.title}
          </button>
        )
      case 'assignee': {
        const assignee = getMemberById(task.assigneeId)
        return (
          <div className={`flex items-center gap-1.5 ${userRole === 'admin' ? 'hover:bg-edge' : ''} px-1.5 py-0.5 rounded transition-colors`}>
            <div className="w-5 h-5 rounded-full bg-accent-500/15 ring-1 ring-inset ring-accent-400/25 flex items-center justify-center text-[11px] font-bold text-accent-200">
              {assignee?.name?.[0]?.toUpperCase() || '–'}
            </div>
            <span className="text-xs text-neutral-400 font-medium">
              {assignee?.name?.split(' ')[0] || 'Unassigned'}
            </span>
          </div>
        )
      }
      case 'dueDate': {
        const overdue = task.status !== 'COMPLETE' && isOverdue(task.dueDate)
        return (
          <span className={overdue ? 'text-red-400 font-semibold' : task.dueDate ? 'text-neutral-300' : 'text-neutral-500 italic'}>
            {formatDue(task.dueDate) || '-'}
          </span>
        )
      }
      case 'priority':
        return (
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border ${PRIORITIES[task.priority]?.color || 'text-neutral-500 border-neutral-700'}`}>
            <Flag size={10} />
            {task.priority}
          </div>
        )
      case 'labels':
        return (
          <div className="flex flex-wrap gap-1">
            {(task.labels || []).slice(0, 2).map(l => <LabelChip key={l} label={l} size="xs" />)}
            {(task.labels || []).length > 2 && <span className="text-[11px] text-neutral-400">+{task.labels.length - 2}</span>}
          </div>
        )
      case 'status':
        return (
          <div className="flex items-center justify-center gap-2">
            <div className={`w-2 h-2 rounded-full ${task.status === 'COMPLETE' ? 'bg-green-500' : task.status === 'IN PROGRESS' ? 'bg-ember-500' : 'bg-neutral-500'}`} />
            <span className="text-[11px] font-medium text-neutral-300">{task.status}</span>
          </div>
        )
      default:
        return <span>{task[field]}</span>
    }
  }

  return (
    <ProjectViewShell projectId={projectId} view="table">
      {/* Toolbar */}
      <div className="bg-base px-6 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-raised">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative group">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-accent-400 transition-colors" />
            <input
              placeholder="Filter tasks..."
              aria-label="Filter tasks by title"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-card border border-raised rounded-md pl-8 pr-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-accent-500/50 w-48 transition-all"
            />
          </div>
          <FilterBar filters={filters} onChange={setFilters} scope={projectId} />
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${showArchived ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30' : 'text-neutral-400 hover:bg-raised'}`}
          >
            <Archive size={12} /> {showArchived ? 'Hide Archived' : 'Show Archived'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">{filteredTasks.length} tasks</span>
          <button type="button" onClick={() => setShowCreateModal(true)} className="bg-white text-black text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-neutral-200 transition-colors ml-2">
            Add Task
          </button>
        </div>
      </div>

      {/* --- Data Grid Container --- */}
      <div className="flex-1 overflow-auto bg-base p-6">
        <div className="min-w-[800px] border border-raised rounded-lg overflow-hidden bg-card">

          <table className="w-full text-left border-collapse">
            <thead className="bg-panel text-xs font-bold text-neutral-500 uppercase tracking-wider">
              <tr>
                {COLUMNS.map(col => {
                  const active = sort.field === col.field
                  const SortIcon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
                  return (
                    <th
                      key={col.field}
                      scope="col"
                      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      className={`${col.field === 'title' ? 'px-6' : 'px-4'} py-3 border-b border-raised ${col.width} font-semibold ${col.align}`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(col.field)}
                        className={`inline-flex items-center gap-1.5 uppercase tracking-wider hover:text-neutral-300 transition-colors ${active ? 'text-neutral-200' : ''}`}
                      >
                        {col.label} <SortIcon size={11} className={active ? '' : 'opacity-40'} />
                      </button>
                    </th>
                  )
                })}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-raised">
              {loading.tasks ? (
                <tr><td colSpan={COLUMNS.length} className="px-4"><SkeletonRows rows={5} label="Loading tasks" /></td></tr>
              ) : filteredTasks.length > 0 ? filteredTasks.map((task) => (
                <tr key={task.id} className="group hover:bg-raised/50 transition-colors text-sm">
                  {COLUMNS.map(col => (
                    <td
                      key={col.field}
                      className={`${col.field === 'title' ? 'px-6' : 'px-4'} py-2.5 border-r border-transparent group-hover:border-raised last:border-r-0 cursor-pointer ${col.align}`}
                      onClick={() => handleCellEdit(task, col.field)}
                    >
                      <div className={`min-h-[24px] flex items-center ${col.field === 'title' ? '' : 'justify-center'}`}>
                        {renderCell(task, col.field)}
                      </div>
                    </td>
                  ))}
                </tr>
              )) : (
                <tr>
                  <td colSpan={COLUMNS.length}>
                    {searchQuery || hasActiveFilters(filters)
                      ? <EmptyState icon={Search} title="No tasks match" description="Try a different search or clear the filters." action={{ label: 'Clear filters', onClick: () => { setFilters(EMPTY_FILTERS); setSearchQuery('') } }} />
                      : <EmptyState icon={TableIcon} title={showArchived ? 'Nothing archived' : 'No tasks yet'} description={showArchived ? undefined : 'Use the quick-add row below or press C.'} action={showArchived ? undefined : { label: 'Add a task', icon: Plus, onClick: () => setShowCreateModal(true) }} />}
                  </td>
                </tr>
              )}

              {/* Quick Add Row */}
              {!showArchived && (
                <tr className="bg-base/30 hover:bg-base/50 transition-colors border-t border-raised">
                  <td className="px-6 py-2.5" colSpan={COLUMNS.length}>
                    <input
                      value={newTaskTitle}
                      maxLength={300}
                      aria-label="Quick add task"
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={handleQuickAdd}
                      placeholder="+ Add a new task and press Enter..."
                      className="bg-transparent border-none outline-none text-sm text-neutral-300 placeholder-neutral-500 w-full h-8"
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <CreateTaskForm onCreate={handleCreateTask} onCancel={() => setShowCreateModal(false)} defaultStatus="TO DO" />
      )}
    </ProjectViewShell>
  )
}

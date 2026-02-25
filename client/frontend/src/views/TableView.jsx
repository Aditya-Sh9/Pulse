import React, { useState } from 'react'
import { NavLink, useParams, useNavigate } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { useAuth } from '../context/AuthContext'
import {
  List, Calendar, Kanban, Table, Plus, Filter, Search,
  ChevronDown, LayoutGrid, Flag, UserCircle, CheckCircle2, Circle
} from 'lucide-react'
import CreateTaskForm from '../components/CreateTaskForm'

// --- CONSTANTS ---
const PRIORITIES = {
  High: { color: 'text-red-400 bg-red-400/10 border-red-400/20', icon: Flag },
  Normal: { color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', icon: Flag },
  Low: { color: 'text-slate-400 bg-slate-400/10 border-slate-400/20', icon: Flag }
}

const STATUSES = {
  'TO DO': { color: 'bg-slate-500', icon: Circle },
  'IN PROGRESS': { color: 'bg-blue-500', icon: Circle },
  'COMPLETE': { color: 'bg-green-500', icon: CheckCircle2 }
}

// Navigation Tab Link (Matching CalendarView style)
const TabLink = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${isActive ? 'border-purple-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-[#2B2D31] rounded-t-md'}`}>
    <Icon size={14} /> {label}
  </NavLink>
)

export default function TableView() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { tasks, updateTask, addTask, members, getMemberById, projects, openTaskDrawer } = useProject()
  const { currentUser, userRole } = useAuth()

  const [showProjectDropdown, setShowProjectDropdown] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [editingCell, setEditingCell] = useState(null) // { taskId, field }
  const [editValue, setEditValue] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('') // For the "Quick Add" row
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [defaultStatus, setDefaultStatus] = useState('TO DO')

  // 1. Resolve Project & Tasks (String ID Fix)
  const currentProject = projects.find(p => String(p.id) === String(projectId))
  const projectTasks = tasks.filter(t => String(t.projectId) === String(projectId))

  // 2. Filter Logic
  const filteredTasks = projectTasks.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // --- Handlers ---

  const handleCellEdit = (taskId, field) => {
    setEditingCell({ taskId, field })
    const task = projectTasks.find(t => t.id === taskId)
    // Pre-fill value
    if (field === 'assignee') setEditValue(task.assigneeId || '')
    else setEditValue(task[field] || '')
  }

  const handleSaveCell = (taskId, field) => {
    if (editValue !== undefined) {
      if (field === 'assignee') updateTask(taskId, { assigneeId: editValue })
      else updateTask(taskId, { [field]: editValue })
    }
    setEditingCell(null)
  }

  const handleKeyDown = (e, taskId, field) => {
    if (e.key === 'Enter') handleSaveCell(taskId, field)
    if (e.key === 'Escape') setEditingCell(null)
  }

  const handleQuickAdd = (e) => {
    if (e.key === 'Enter' && newTaskTitle.trim()) {
      addTask({
        title: newTaskTitle,
        projectId: projectId, // Passed as string
        status: 'TO DO',
        priority: 'Normal',
        assigneeId: ''
      })
      setNewTaskTitle('')
    }
  }

  const handleCreateTask = (taskData) => {
    addTask({
      ...taskData,
      projectId: projectId,
      status: defaultStatus
    })
    setShowCreateModal(false)
  }

  // --- Renderers ---

  const renderCell = (task, field) => {
    const isEditing = editingCell?.taskId === task.id && editingCell?.field === field

    // EDIT MODE
    if (isEditing) {
      const commonInputClass = "w-full bg-[#111] text-white text-xs px-2 py-1.5 rounded border border-purple-500 focus:outline-none shadow-xl"

      if (field === 'assignee') {
        return (
          userRole === 'admin' ? (
            <select
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => handleSaveCell(task.id, field)}
              className={commonInputClass}
            >
              <option value="">Unassigned</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          ) : (
            // Non-admin view in edit mode (should not happen if click is disabled)
            // Or just show the current assignee without an input
            <div className="flex items-center gap-1.5 opacity-50 cursor-not-allowed">
              <div className="w-5 h-5 rounded-full bg-purple-600/50 flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
                {getMemberById(task.assigneeId)?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="text-xs text-gray-400 font-medium">
                {getMemberById(task.assigneeId)?.name?.split(' ')[0] || 'Unassigned'}
              </span>
            </div>
          )
        )
      }
      if (field === 'priority') {
        return (
          <select
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => handleSaveCell(task.id, field)}
            className={commonInputClass}
          >
            {Object.keys(PRIORITIES).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        )
      }
      if (field === 'status') {
        return (
          <select
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => handleSaveCell(task.id, field)}
            className={commonInputClass}
          >
            {Object.keys(STATUSES).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )
      }
      // Default Input (Title, Date)
      return (
        <input
          autoFocus
          type={field === 'dueDate' ? 'date' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => handleSaveCell(task.id, field)}
          onKeyDown={(e) => handleKeyDown(e, task.id, field)}
          className={commonInputClass}
        />
      )
    }

    // VIEW MODE
    switch (field) {
      case 'title':
        return (
          <span
            onClick={(e) => { e.stopPropagation(); openTaskDrawer(task); }}
            className="font-medium text-gray-200 truncate block hover:text-purple-400 transition-colors">
            {task.title}
          </span>
        )
      case 'assignee':
        const assignee = getMemberById(task.assigneeId)
        return (
          <div
            onClick={() => {
              if (userRole === 'admin') {
                handleCellEdit(task.id, 'assignee')
              }
            }}
            className={`flex items-center gap-1.5 ${userRole === 'admin' ? 'cursor-pointer hover:bg-[#3E4045]' : 'cursor-default'} px-1.5 py-0.5 rounded -ml-1.5 transition-colors group`}
          >
            <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
              {assignee?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="text-xs text-gray-400 font-medium group-hover:text-gray-300">
              {assignee?.name?.split(' ')[0] || 'Unassigned'}
            </span>
          </div>
        )
      case 'dueDate':
        return (
          <span className={task.dueDate ? 'text-gray-300' : 'text-gray-600 italic'}>
            {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
          </span>
        )
      case 'priority':
        const PriorityIcon = PRIORITIES[task.priority]?.icon || Flag
        return (
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${PRIORITIES[task.priority]?.color || 'text-slate-500 border-slate-700'}`}>
            <PriorityIcon size={10} />
            {task.priority}
          </div>
        )
      case 'status':
        return (
          <div className="flex items-center justify-center gap-2">
            <div className={`w-2 h-2 rounded-full ${task.status === 'COMPLETE' ? 'bg-green-500' : task.status === 'IN PROGRESS' ? 'bg-blue-500' : 'bg-slate-500'}`} />
            <span className="text-[11px] font-medium text-gray-300">{task.status}</span>
          </div>
        )
      default:
        return <span>{task[field]}</span>
    }
  }

  return (
    <>
      {/* Header & Tabs */}
      <div className="bg-[#1E1F21] border-b border-[#2B2D31]">
        <div className="px-6 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-400 relative">
            <span className="bg-[#323438] w-5 h-5 flex items-center justify-center rounded text-[10px]">TS</span>
            <span>Team Space</span>
            <span className="text-gray-600">/</span>
            <LayoutGrid size={14} />
            <div
              className="flex items-center gap-1 cursor-pointer hover:text-white"
              onClick={() => setShowProjectDropdown(!showProjectDropdown)}
            >
              <span className="font-semibold text-white">{currentProject?.name || 'Project'}</span>
              <ChevronDown size={14} />
            </div>

            {showProjectDropdown && (
              <div className="absolute top-full left-32 mt-1 w-48 bg-[#2B2D31] border border-[#3E4045] rounded-md shadow-xl z-50 py-1">
                {projects.map(p => (
                  <div
                    key={p.id}
                    className="px-3 py-2 hover:bg-[#3E4045] text-sm text-gray-300 cursor-pointer flex items-center gap-2"
                    onClick={() => {
                      navigate(`/dashboard/table/${p.id}`);
                      setShowProjectDropdown(false);
                    }}
                  >
                    <LayoutGrid size={12} /> {p.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 hover:text-white cursor-pointer transition-colors">Share</span>
          </div>
        </div>
        <div className="px-4 flex items-center gap-1 mt-1">
          <TabLink to={`/dashboard/list/${projectId}`} icon={List} label="List" />
          <TabLink to={`/dashboard/board/${projectId}`} icon={Kanban} label="Board" />
          <TabLink to={`/dashboard/calendar/${projectId}`} icon={Calendar} label="Calendar" />
          <TabLink to={`/dashboard/table/${projectId}`} icon={Table} label="Table" />
          <button className="flex items-center gap-1 px-2 text-xs font-medium text-gray-400 hover:text-white">
            <Plus size={12} /> View
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-[#111] px-6 py-3 flex items-center justify-between border-b border-[#2B2D31]">
        <div className="flex items-center gap-2">
          <div className="relative group">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
            <input
              placeholder="Filter tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#1E1F21] border border-[#2B2D31] rounded-md pl-8 pr-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-purple-500/50 w-48 transition-all"
            />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E1F21] border border-[#2B2D31] hover:bg-[#2B2D31]/80 rounded-md text-xs font-medium text-gray-300 transition-all">
            <Filter size={12} /> Filter
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{filteredTasks.length} tasks</span>
          <button onClick={() => setShowCreateModal(true)} className="bg-white text-black text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-gray-200 transition-colors ml-2">
            Add Task
          </button>
        </div>
      </div>

      {/* --- Data Grid Container --- */}
      <div className="flex-1 overflow-auto bg-[#111] p-6">
        <div className="min-w-[800px] border border-[#2B2D31] rounded-lg overflow-hidden bg-[#1E1F21]">

          <table className="w-full text-left border-collapse">
            {/* Table Header */}
            <thead className="bg-[#15171C] text-xs font-bold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 border-b border-[#2B2D31] w-[40%] font-semibold">
                  <div className="flex items-center gap-2 hover:text-gray-300 cursor-pointer transition-colors">
                    Task Name <ChevronDown size={10} className="opacity-50" />
                  </div>
                </th>
                <th className="px-4 py-3 border-b border-[#2B2D31] w-[15%] font-semibold text-center">Assignee</th>
                <th className="px-4 py-3 border-b border-[#2B2D31] w-[15%] font-semibold text-center">Status</th>
                <th className="px-4 py-3 border-b border-[#2B2D31] w-[15%] font-semibold text-center">Due Date</th>
                <th className="px-4 py-3 border-b border-[#2B2D31] w-[15%] font-semibold text-center">Priority</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-[#2B2D31]">
              {filteredTasks.length > 0 ? filteredTasks.map((task) => (
                <tr
                  key={task.id}
                  className="group hover:bg-[#2B2D31]/50 transition-colors text-sm"
                >
                  {/* Title Cell */}
                  <td
                    className="px-6 py-2.5 border-r border-transparent group-hover:border-[#2B2D31] cursor-pointer"
                    onClick={() => handleCellEdit(task.id, 'title')}
                  >
                    <div className="min-h-[24px] flex items-center">
                      {renderCell(task, 'title')}
                    </div>
                  </td>

                  {/* Assignee Cell */}
                  <td
                    className="px-4 py-2.5 border-r border-transparent group-hover:border-[#2B2D31] cursor-pointer text-center"
                  // The onClick for assignee is now handled inside renderCell for view mode
                  >
                    <div className="min-h-[24px] flex items-center justify-center">
                      {renderCell(task, 'assignee')}
                    </div>
                  </td>

                  {/* Status Cell */}
                  <td
                    className="px-4 py-2.5 border-r border-transparent group-hover:border-[#2B2D31] cursor-pointer text-center"
                    onClick={() => handleCellEdit(task.id, 'status')}
                  >
                    <div className="min-h-[24px] flex items-center justify-center">
                      {renderCell(task, 'status')}
                    </div>
                  </td>

                  {/* Due Date Cell */}
                  <td
                    className="px-4 py-2.5 border-r border-transparent group-hover:border-[#2B2D31] cursor-pointer text-center"
                    onClick={() => handleCellEdit(task.id, 'dueDate')}
                  >
                    <div className="min-h-[24px] flex items-center justify-center">
                      {renderCell(task, 'dueDate')}
                    </div>
                  </td>

                  {/* Priority Cell */}
                  <td
                    className="px-4 py-2.5 cursor-pointer text-center"
                    onClick={() => handleCellEdit(task.id, 'priority')}
                  >
                    <div className="min-h-[24px] flex items-center justify-center">
                      {renderCell(task, 'priority')}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    No tasks found.
                  </td>
                </tr>
              )}

              {/* Quick Add Row */}
              <tr className="bg-[#111]/30 hover:bg-[#111]/50 transition-colors border-t border-[#2B2D31]">
                <td className="px-6 py-2.5">
                  <div className="flex items-center gap-3 text-gray-500 group-focus-within:text-purple-400">
                    <Plus size={16} />
                    <input
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={handleQuickAdd}
                      placeholder="Add a new task..."
                      className="bg-transparent border-none outline-none text-sm text-gray-300 placeholder-gray-600 flex-1 h-8"
                    />
                  </div>
                </td>
                <td colSpan="4"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <CreateTaskForm onCreate={handleCreateTask} onCancel={() => setShowCreateModal(false)} members={members} defaultStatus={defaultStatus} />
        </div>
      )}
    </>
  )
}
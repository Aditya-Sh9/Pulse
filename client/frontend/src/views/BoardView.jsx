import React, { useState } from 'react'
import { NavLink, useParams, useNavigate } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { useAuth } from '../context/AuthContext'
import {
  List, Calendar, Kanban, Table, Plus, MoreHorizontal,
  LayoutGrid, ChevronDown, Circle, CheckCircle2, Clock, Flag,
  UserCircle, Pencil, Copy as DuplicateIcon, Bell, Archive, Trash2, Link, ExternalLink, Copy, X
} from 'lucide-react'
import CreateTaskForm from '../components/CreateTaskForm'

// --- CONSTANTS ---
const COLUMNS = [
  { id: 'TO DO', label: 'To Do', color: 'bg-slate-500' },
  { id: 'IN PROGRESS', label: 'In Progress', color: 'bg-blue-500' },
  { id: 'COMPLETE', label: 'Complete', color: 'bg-green-500' }
]

const PRIORITIES = {
  High: { color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  Normal: { color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  Low: { color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' }
}

// Navigation Link Component
const TabLink = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${isActive ? 'border-purple-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-[#2B2D31] rounded-t-md'}`}>
    <Icon size={14} /> {label}
  </NavLink>
)

// Shared Helper Components
const MenuItem = ({ icon: Icon, label, onClick, danger }) => (
  <button onClick={(e) => { e.stopPropagation(); onClick && onClick() }} className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-[#3E4045] transition-colors ${danger ? 'text-red-400 hover:text-red-300' : 'text-gray-300'}`}>
    <Icon size={14} className={danger ? "text-red-400" : "text-gray-500"} /> {label}
  </button>
)

export default function BoardView() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { tasks, addTask, updateTask, deleteTask, moveTask, members, getMemberById, projects, openTaskDrawer } = useProject()
  const { currentUser, userRole } = useAuth()

  // UI States
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [draggedTaskId, setDraggedTaskId] = useState(null)
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [activeColMenuId, setActiveColMenuId] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [defaultStatus, setDefaultStatus] = useState('TO DO')
  const [showArchived, setShowArchived] = useState(false)

  const menuRef = React.useRef(null)

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null)
        setActiveColMenuId(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // 1. Resolve Project & Tasks (String IDs & Ignore Archived)
  const currentProject = projects.find(p => String(p.id) === String(projectId))
  const projectTasks = tasks.filter(t => String(t.projectId) === String(projectId) && (showArchived ? t.isArchived : !t.isArchived))

  // --- Task Handlers ---
  const handleCreateTask = (taskData) => {
    addTask({
      ...taskData,
      projectId: projectId,
      status: defaultStatus
    })
    setShowCreateModal(false)
  }

  const handleDeleteTask = (id) => {
    deleteTask(id)
    setActiveMenuId(null)
  }

  const handleUpdateTask = (id, field, value) => {
    updateTask(id, { [field]: value })
    setActiveMenuId(null)
  }

  const duplicateTask = (task) => {
    const { id, ...rest } = task
    addTask({
      ...rest,
      title: `${task.title} (Copy)`,
      projectId: projectId
    })
    setActiveMenuId(null)
  }

  // --- Drag & Drop Handlers ---
  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId)
    e.dataTransfer.effectAllowed = "move"
    // Add a ghost effect if desired
    e.target.style.opacity = '0.5'
  }

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1'
    setDraggedTaskId(null)
  }

  const handleDragOver = (e) => {
    e.preventDefault() // Necessary to allow dropping
  }

  const handleDrop = (e, status) => {
    e.preventDefault()
    if (draggedTaskId) {
      moveTask(draggedTaskId, status)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0F1117] text-gray-200">

      {/* --- Header & Tabs --- */}
      <div className="bg-[#1E1F21] border-b border-[#2B2D31] flex-shrink-0">
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
                      navigate(`/dashboard/board/${p.id}`);
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
            <div className="flex -space-x-2">
              {members.slice(0, 3).map(m => (
                <div key={m.id} className="w-6 h-6 rounded-full bg-indigo-600 border border-[#1E1F21] flex items-center justify-center text-[9px] text-white">
                  {m.avatar}
                </div>
              ))}
              <button className="w-6 h-6 rounded-full bg-[#2B2D31] border border-[#1E1F21] flex items-center justify-center text-[10px] text-gray-400 hover:text-white hover:bg-[#3E4045]">
                +
              </button>
            </div>
          </div>
        </div>
        <div className="px-4 flex items-center gap-1 mt-1">
          <TabLink to={`/dashboard/list/${projectId}`} icon={List} label="List" />
          <TabLink to={`/dashboard/board/${projectId}`} icon={Kanban} label="Board" />
          <TabLink to={`/dashboard/calendar/${projectId}`} icon={Calendar} label="Calendar" />
          <TabLink to={`/dashboard/table/${projectId}`} icon={Table} label="Table" />
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-1 px-3 py-1 ml-auto text-xs font-medium rounded-md transition-colors ${showArchived ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-white hover:bg-[#2B2D31]'}`}
          >
            <Archive size={12} /> {showArchived ? 'Hide Archived' : 'Show Archived'}
          </button>
          <button className="flex items-center gap-1 px-2 text-xs font-medium text-gray-400 hover:text-white">
            <Plus size={12} /> View
          </button>
        </div>
      </div>

      {/* --- Kanban Board --- */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <div className="flex h-full gap-6 min-w-[1000px]">

          {COLUMNS.map(column => {
            const columnTasks = projectTasks.filter(t => t.status === column.id)

            return (
              <div
                key={column.id}
                className="flex-1 flex flex-col min-w-[300px] h-full"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${column.color}`}></span>
                    <span className="text-sm font-bold text-gray-300 uppercase tracking-wide">{column.label}</span>
                    <span className="text-xs text-gray-500 bg-[#1E1F21] px-2 py-0.5 rounded-full">{columnTasks.length}</span>
                  </div>
                  <div className="flex items-center gap-1 relative">
                    <button
                      onClick={() => { setDefaultStatus(column.id); setShowCreateModal(true); }}
                      className="p-1 hover:bg-[#2B2D31] rounded text-gray-500 hover:text-white transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveColMenuId(activeColMenuId === column.id ? null : column.id); setActiveMenuId(null); }}
                      className="p-1 hover:bg-[#2B2D31] rounded text-gray-500 hover:text-white transition-colors"
                    >
                      <MoreHorizontal size={14} />
                    </button>

                    {activeColMenuId === column.id && (
                      <div ref={menuRef} className="absolute right-0 top-8 w-48 bg-[#2B2D31] border border-[#3E4045] rounded-lg shadow-2xl z-50 p-1 flex flex-col">
                        <MenuItem icon={Plus} label="Add Task" onClick={() => { setDefaultStatus(column.id); setShowCreateModal(true); setActiveColMenuId(null); }} />
                        <MenuItem icon={Trash2} label="Clear Column" danger={true} onClick={() => alert(`Cleared ${column.label} column!`)} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Drop Zone */}
                <div className="flex-1 bg-[#161719]/50 rounded-xl border border-[#2B2D31]/50 p-3 overflow-y-auto space-y-3">
                  {columnTasks.map(task => {
                    const assignee = getMemberById(task.assigneeId)

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => openTaskDrawer(task)}
                        className="group bg-[#1E1F21] p-4 rounded-lg border border-[#2B2D31] shadow-sm hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-900/10 cursor-grab active:cursor-grabbing transition-all duration-200"
                      >
                        {/* Tags Row */}
                        <div className="flex justify-between items-start mb-2 relative">
                          <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${PRIORITIES[task.priority]?.color || 'text-gray-500 border-gray-700'}`}>
                            {task.priority}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === task.id ? null : task.id); setActiveColMenuId(null); }}
                            className={`p-0.5 rounded transition-colors ${activeMenuId === task.id ? 'opacity-100 text-white bg-[#3E4045]' : 'opacity-0 group-hover:opacity-100 text-gray-600 hover:text-white'}`}
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          {activeMenuId === task.id && (
                            <div ref={menuRef} className="absolute right-0 top-6 w-60 bg-[#2B2D31] border border-[#3E4045] rounded-lg shadow-2xl z-50 p-1.5 flex flex-col gap-1 cursor-default" onClick={e => e.stopPropagation()}>
                              <div className="grid grid-cols-3 gap-1 mb-1">
                                <button className="flex items-center justify-center gap-1 bg-[#3E4045] hover:bg-[#4E5055] py-1.5 rounded text-[10px] text-gray-300"><Link size={12} /> Link</button>
                                <button className="flex items-center justify-center gap-1 bg-[#3E4045] hover:bg-[#4E5055] py-1.5 rounded text-[10px] text-gray-300"><Copy size={12} /> ID</button>
                                <button className="flex items-center justify-center gap-1 bg-[#3E4045] hover:bg-[#4E5055] py-1.5 rounded text-[10px] text-gray-300"><ExternalLink size={12} /> New</button>
                              </div>
                              <div className="h-px bg-[#3E4045] my-0.5" />
                              <MenuItem icon={Pencil} label="Rename" onClick={() => { setActiveMenuId(null); openTaskDrawer(task); }} />
                              <MenuItem icon={DuplicateIcon} label="Duplicate" onClick={() => duplicateTask(task)} />
                              <MenuItem icon={Bell} label="Remind me" onClick={() => { setActiveMenuId(null); alert(`Reminder set for: ${task.title}. We'll notify you soon!`); }} />
                              <MenuItem icon={Archive} label={task.isArchived ? "Unarchive" : "Archive"} onClick={() => handleUpdateTask(task.id, 'isArchived', !task.isArchived)} />
                              <div className="h-px bg-[#3E4045] my-0.5" />
                              <MenuItem icon={Trash2} label="Delete" danger={true} onClick={() => handleDeleteTask(task.id)} />
                            </div>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="text-sm font-medium text-gray-200 mb-3 leading-snug">
                          {task.title}
                        </h4>

                        {/* Footer Row */}
                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                          <div className="flex items-center gap-3 text-gray-500 text-xs">
                            <div className={`flex items-center gap-1 ${task.dueDate ? 'text-gray-400' : ''}`}>
                              <Clock size={12} />
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '-'}
                            </div>
                          </div>

                          {/* Avatar */}
                          <div>
                            {assignee ? (
                              <div
                                className={`w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm flex-shrink-0 ${userRole === 'admin' ? 'cursor-pointer hover:ring-2 hover:ring-blue-400/50' : ''}`}
                                title={assignee?.name || 'Unassigned'}
                                onClick={(e) => {
                                  if (userRole === 'admin') {
                                    e.stopPropagation()
                                    setActiveMenuId(activeMenuId === `assignee-${task.id}` ? null : `assignee-${task.id}`)
                                  }
                                }}
                              >
                                {assignee?.name?.[0]?.toUpperCase() || 'U'}
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full border border-dashed border-gray-600 flex items-center justify-center text-gray-600">
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
                    <div className="h-24 rounded-lg border-2 border-dashed border-[#2B2D31] flex flex-col items-center justify-center text-gray-600 text-xs">
                      <span>Drop tasks here</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <CreateTaskForm onCreate={handleCreateTask} onCancel={() => setShowCreateModal(false)} members={members} defaultStatus={defaultStatus} />
        </div>
      )}
    </div>
  )
}
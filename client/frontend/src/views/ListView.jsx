import React, { useState, useRef, useEffect } from 'react'
import { NavLink, useParams, useNavigate } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { useAuth } from '../context/AuthContext'
import {
  List, Calendar, Kanban, Table, Plus, Filter, Search,
  ChevronDown, Flag, Circle, MoreHorizontal,
  UserCircle, GripVertical, LayoutGrid, Copy, Link, ExternalLink,
  Pencil, Copy as DuplicateIcon, Bell, Trash2, Archive, CheckCircle2,
  X
} from 'lucide-react'
import CreateTaskForm from '../components/CreateTaskForm'

// --- CONSTANTS ---
const PRIORITIES = {
  High: { color: 'text-red-500', icon: Flag },
  Normal: { color: 'text-blue-400', icon: Flag },
  Low: { color: 'text-slate-500', icon: Flag }
}

const STATUSES = {
  'TO DO': { color: 'bg-slate-500' },
  'IN PROGRESS': { color: 'bg-blue-500' },
  'COMPLETE': { color: 'bg-green-500' }
}

// --- HELPER COMPONENTS ---

const Dropdown = ({ options, onSelect, onClose, align = 'left' }) => {
  const ref = useRef()
  useEffect(() => {
    const clickOutside = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', clickOutside)
    return () => document.removeEventListener('mousedown', clickOutside)
  }, [onClose])

  return (
    <div ref={ref} className={`absolute top-full ${align === 'right' ? 'right-0' : 'left-0'} mt-1 w-40 bg-[#2B2D31] border border-[#3E4045] rounded-md shadow-xl z-50 py-1`}>
      {options.map(opt => {
        const key = typeof opt === 'object' ? opt.value : opt
        const label = typeof opt === 'object' ? opt.label : opt
        return (
          <div
            key={key}
            className="px-3 py-1.5 hover:bg-[#3E4045] text-xs text-gray-300 cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onSelect(typeof opt === 'object' ? opt.value : opt) }}
          >
            {label}
          </div>
        )
      })}
    </div>
  )
}

const TabLink = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${isActive ? 'border-purple-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-[#2B2D31] rounded-t-md'}`}>
    <Icon size={14} /> {label}
  </NavLink>
)

const StatusGroup = ({ label, count, color, onAdd }) => (
  <div className="flex items-center gap-2 mb-2 group">
    <ChevronDown size={14} className="text-gray-500 cursor-pointer" />
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${color} text-white`}>{label}</span>
    <span className="text-xs text-gray-500 font-medium">{count}</span>
    <div className="flex-1 border-b border-[#2B2D31] ml-2 opacity-50 group-hover:opacity-100 transition-opacity" />
    <Plus size={14} className="text-gray-500 opacity-0 group-hover:opacity-100 cursor-pointer hover:text-white" onClick={onAdd} />
  </div>
)

const MenuItem = ({ icon: Icon, label, onClick, danger }) => (
  <button onClick={(e) => { e.stopPropagation(); onClick && onClick() }} className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-[#3E4045] transition-colors ${danger ? 'text-red-400 hover:text-red-300' : 'text-gray-300'}`}>
    <Icon size={14} className={danger ? "text-red-400" : "text-gray-500"} /> {label}
  </button>
)

// --- MAIN COMPONENT ---

export default function ListView() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  // Added getTasksByProject to destructuring to use the helper logic
  const { tasks, addTask, updateTask, deleteTask, projects, members, getMemberById, getTasksByProject, openTaskDrawer } = useProject()
  const { currentUser, userRole } = useAuth()

  const [showProjectDropdown, setShowProjectDropdown] = useState(false)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [draggedItem, setDraggedItem] = useState(null)
  const [defaultStatus, setDefaultStatus] = useState('TO DO')
  const [showArchived, setShowArchived] = useState(false)

  // Popup state
  const [activePopup, setActivePopup] = useState(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [showPriorityFilter, setShowPriorityFilter] = useState(false)
  const [priorityFilter, setPriorityFilter] = useState('') // '' means All

  const menuRef = useRef(null)

  // FIX: Comparison now uses strings to handle Firebase IDs
  const currentProject = projects.find(p => String(p.id) === String(projectId))

  // FIX: Use context helper OR string comparison. Helper is safer if context defines logic.
  // Using direct filter with String() for immediate fix based on user's structure.
  const projectTasks = tasks.filter(t => String(t.projectId) === String(projectId))

  // Apply Filters
  const filteredTasks = projectTasks.filter(t =>
    (showArchived ? t.isArchived : !t.isArchived) &&
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (priorityFilter ? t.priority === priorityFilter : true)
  )

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // --- ACTIONS ---

  // 1. FIX: Removed parseInt to support string IDs from Firebase
  const handleCreateTask = (taskData) => {
    addTask({
      ...taskData,
      projectId: projectId, // Passed as string
      status: defaultStatus
    })
    setShowCreateModal(false)
  }

  // 2. FIX: Removed parseInt
  const handleInlineAdd = () => {
    if (!newTaskTitle.trim()) return
    addTask({
      title: newTaskTitle.trim(),
      projectId: projectId, // Passed as string
      status: 'TO DO',
      priority: 'Normal',
      assigneeId: ''
    })
    setNewTaskTitle('')
  }

  const handleUpdateTask = (id, field, value) => {
    updateTask(id, { [field]: value })
    setActivePopup(null)
  }

  const handleDeleteTask = (id) => {
    deleteTask(id)
    setActiveMenuId(null)
  }

  // FIX: Removed parseInt
  const duplicateTask = (task) => {
    const { id, ...rest } = task
    addTask({
      ...rest,
      title: `${task.title} (Copy)`,
      projectId: projectId // Passed as string
    })
    setActiveMenuId(null)
  }

  const startEditing = (task) => {
    setEditingId(task.id)
    setEditText(task.title)
    setActiveMenuId(null)
  }

  const saveEdit = (id) => {
    if (editText.trim()) {
      handleUpdateTask(id, 'title', editText)
    }
    setEditingId(null)
  }

  // Drag & Drop
  const handleDragStart = (e, task) => {
    setDraggedItem(task)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDraggedItem(null)
    // Logic to reorder would go here
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
                      navigate(`/dashboard/list/${p.id}`);
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
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1.5 text-gray-500" />
            <input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border border-[#2B2D31] rounded-md pl-7 pr-3 py-1 text-xs text-gray-300 focus:border-gray-500 focus:outline-none w-40 hover:bg-[#1E1F21]"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowPriorityFilter(!showPriorityFilter)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-colors ${priorityFilter ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-gray-400 hover:bg-[#2B2D31]'}`}
            >
              <Filter size={12} /> {priorityFilter || 'Filter'}
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
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${showArchived ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-gray-400 hover:bg-[#2B2D31]'}`}
          >
            <Archive size={14} /> {showArchived ? 'Hide Archived' : 'Show Archived'}
          </button>
          <button onClick={() => setShowCreateModal(true)} className="bg-white text-black text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-gray-200 transition-colors">
            Add Task
          </button>
        </div>
      </div>

      {/* Main List Area */}
      <main className="flex-1 overflow-auto p-6 pb-40">

        <StatusGroup
          label="TASKS"
          count={filteredTasks.length}
          color="bg-gray-500"
          onAdd={() => {
            setDefaultStatus('TO DO')
            setShowCreateModal(true)
          }}
        />

        {/* Table Header */}
        <div className="flex items-center px-2 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-[#2B2D31]">
          <div className="flex-1 pl-8">Name</div>
          <div className="w-24 text-center">Assignee</div>
          <div className="w-28 text-center">Due Date</div>
          <div className="w-24 text-center">Priority</div>
          <div className="w-24 text-center">Status</div>
          <div className="w-10"></div>
        </div>

        {/* Table Rows */}
        <div className="mb-2" onDragOver={handleDragOver} onDrop={handleDrop}>
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              draggable
              onClick={() => openTaskDrawer(task)}
              onDragStart={(e) => handleDragStart(e, task)}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="group relative flex items-center px-2 py-2 border-b border-[#2B2D31] hover:bg-[#1E1F21] text-sm text-gray-300 transition-colors cursor-default"
            >

              {/* Title Column */}
              <div className="flex-1 flex items-center gap-3 relative overflow-hidden">
                <div className="absolute -left-6 opacity-0 group-hover:opacity-100 cursor-grab text-gray-600 p-1">
                  <GripVertical size={14} />
                </div>

                <div
                  className="group/check cursor-pointer text-gray-500 hover:text-green-500 flex-shrink-0"
                  onClick={(e) => { e.stopPropagation(); handleUpdateTask(task.id, 'status', task.status === 'COMPLETE' ? 'TO DO' : 'COMPLETE') }}
                >
                  {task.status === 'COMPLETE' ? (
                    <CheckCircle2 size={14} className="text-green-500" />
                  ) : (
                    <Circle size={14} strokeWidth={2} />
                  )}
                </div>

                {editingId === task.id ? (
                  <input
                    autoFocus
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={() => saveEdit(task.id)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(task.id)}
                    className="bg-[#111] text-white px-2 py-0.5 rounded border border-indigo-500 outline-none w-full"
                  />
                ) : (
                  <span
                    onClick={() => startEditing(task)}
                    className={`font-medium truncate cursor-text hover:text-white ${task.status === 'COMPLETE' ? 'line-through text-gray-500' : 'text-gray-200'}`}
                  >
                    {task.title}
                  </span>
                )}
              </div>

              <div className="w-28 flex justify-center relative">
                {(() => {
                  const assignee = getMemberById(task.assigneeId);
                  return (
                    <div
                      className={`flex items-center gap-1.5 w-28 group relative ${userRole === 'admin' ? 'cursor-pointer' : 'cursor-default'}`}
                      onClick={(e) => {
                        if (userRole === 'admin') {
                          e.stopPropagation()
                          setActiveMenuId(activeMenuId === `assignee-${task.id}` ? null : `assignee-${task.id}`)
                        } else {
                          // For employees, allow clicking to open task details, or silently do nothing on the assignee specifically
                          e.stopPropagation()
                        }
                      }}
                    >
                      <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm flex-shrink-0">
                        {assignee?.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <span className="text-xs text-gray-400 truncate flex-1">{assignee?.name?.split(' ')[0] || 'Unassigned'}</span>

                      {userRole === 'admin' && (
                        <>
                          <ChevronDown size={12} className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                          {activeMenuId === `assignee-${task.id}` && (
                            <Dropdown
                              options={[
                                { value: '', label: 'Unassigned' },
                                ...members.map(m => ({ value: m.id, label: m.name || m.email }))
                              ]}
                              onSelect={(val) => { updateTask(task.id, { assigneeId: val }); setActiveMenuId(null) }}
                              onClose={() => setActiveMenuId(null)}
                            />
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Due Date Column */}
              <div className="w-28 text-center text-xs text-gray-500 hover:text-gray-300 cursor-pointer">
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
              </div>

              {/* Priority Column */}
              <div className="w-24 flex justify-center relative">
                <div
                  onClick={(e) => { e.stopPropagation(); setActivePopup(activePopup?.taskId === task.id && activePopup?.field === 'priority' ? null : { taskId: task.id, field: 'priority' }) }}
                  className="cursor-pointer hover:bg-[#2B2D31] p-1 rounded"
                >
                  <Flag size={14} className={PRIORITIES[task.priority]?.color || 'text-gray-600'} />
                </div>
                {activePopup?.taskId === task.id && activePopup?.field === 'priority' && (
                  <Dropdown
                    options={Object.keys(PRIORITIES)}
                    onSelect={(val) => handleUpdateTask(task.id, 'priority', val)}
                    onClose={() => setActivePopup(null)}
                  />
                )}
              </div>

              {/* Status Column */}
              <div className="w-24 flex justify-center relative">
                <div
                  onClick={(e) => { e.stopPropagation(); setActivePopup(activePopup?.taskId === task.id && activePopup?.field === 'status' ? null : { taskId: task.id, field: 'status' }) }}
                  className={`px-2 py-0.5 ${STATUSES[task.status]?.color || 'bg-gray-700'} text-[10px] font-bold uppercase text-white rounded-sm cursor-pointer hover:opacity-80`}
                >
                  {task.status}
                </div>
                {activePopup?.taskId === task.id && activePopup?.field === 'status' && (
                  <Dropdown
                    options={Object.keys(STATUSES)}
                    onSelect={(val) => handleUpdateTask(task.id, 'status', val)}
                    onClose={() => setActivePopup(null)}
                    align="right"
                  />
                )}
              </div>

              {/* Menu */}
              <div className="w-10 flex justify-center relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveMenuId(activeMenuId === task.id ? null : task.id)
                  }}
                  className={`p-1 rounded hover:bg-[#3E4045] transition-colors ${activeMenuId === task.id ? 'opacity-100 bg-[#3E4045]' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <MoreHorizontal size={16} className="text-gray-500 hover:text-gray-200" />
                </button>

                {activeMenuId === task.id && (
                  <div ref={menuRef} className="absolute right-0 top-8 w-60 bg-[#2B2D31] border border-[#3E4045] rounded-lg shadow-2xl z-50 p-1.5 flex flex-col gap-1">
                    <div className="grid grid-cols-3 gap-1 mb-1">
                      <button className="flex items-center justify-center gap-1 bg-[#3E4045] hover:bg-[#4E5055] py-1.5 rounded text-[10px] text-gray-300"><Link size={12} /> Link</button>
                      <button className="flex items-center justify-center gap-1 bg-[#3E4045] hover:bg-[#4E5055] py-1.5 rounded text-[10px] text-gray-300"><Copy size={12} /> ID</button>
                      <button className="flex items-center justify-center gap-1 bg-[#3E4045] hover:bg-[#4E5055] py-1.5 rounded text-[10px] text-gray-300"><ExternalLink size={12} /> New</button>
                    </div>
                    <div className="h-px bg-[#3E4045] my-0.5" />
                    <MenuItem icon={Pencil} label="Rename" onClick={() => startEditing(task)} />
                    <MenuItem icon={DuplicateIcon} label="Duplicate" onClick={() => duplicateTask(task)} />
                    <MenuItem icon={Bell} label="Remind me" onClick={() => { setActiveMenuId(null); alert(`Reminder set for: ${task.title}. We'll notify you when it's due!`); }} />
                    <MenuItem icon={Archive} label={task.isArchived ? "Unarchive" : "Archive"} onClick={() => handleUpdateTask(task.id, 'isArchived', !task.isArchived)} />
                    <div className="h-px bg-[#3E4045] my-0.5" />
                    <MenuItem icon={Trash2} label="Delete" danger={true} onClick={() => handleDeleteTask(task.id)} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Simple Inline Input (Preserved) */}
        < div className="flex items-center gap-3 px-2 py-2 text-sm text-gray-400 hover:bg-[#1E1F21] rounded-md transition-colors group" >
          <Plus size={16} className="text-gray-500" />
          <input
            id="new-task-input"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInlineAdd()}
            placeholder="New Task..."
            className="bg-transparent border-none focus:outline-none flex-1 placeholder-gray-600 text-gray-300"
          />
          <button onClick={handleInlineAdd} className="text-xs bg-[#2B2D31] px-2 py-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white hover:text-black transition-all">Enter</button>
        </div>

        {/* 3. FIX: Create Task Modal Rendering with Dark Theme */}
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
            <CreateTaskForm onCreate={handleCreateTask} onCancel={() => setShowCreateModal(false)} members={members} defaultStatus={defaultStatus} />
          </div>
        )}
      </main>
    </>
  )
}


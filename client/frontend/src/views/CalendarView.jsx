import React, { useState } from 'react'
import { useParams, NavLink, useNavigate } from 'react-router-dom' // Added NavLink
import { useProject } from '../context/ProjectContext'
import {
  List, Calendar, Kanban, Table, Plus, ChevronLeft, ChevronRight,
  ChevronDown, LayoutGrid
} from 'lucide-react'
import CreateTaskForm from '../components/CreateTaskForm'

// FIX: Replaced broken TabButton with functional TabLink
const TabLink = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${isActive ? 'border-purple-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-[#2B2D31] rounded-t-md'}`}>
    <Icon size={14} /> {label}
  </NavLink>
)

export default function CalendarView() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { tasks, projects, openTaskDrawer } = useProject() // Added projects to get name
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 1)) // Feb 2026

  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [defaultStatus, setDefaultStatus] = useState('TO DO')

  // Helper to ensure we are comparing strings
  const currentProject = projects.find(p => String(p.id) === String(projectId))
  const projectTasks = tasks.filter(t => String(t.projectId) === String(projectId))

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  // Fix: firstDayOfMonth needs to be adjusted properly for grid
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => null)
  const allDays = [...emptyDays, ...days]

  const getTasksForDay = (day) => {
    if (!day) return []
    // Format date to YYYY-MM-DD to match standard input date format
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    const dateStr = `${year}-${month}-${dayStr}`

    return projectTasks.filter(t => t.dueDate === dateStr)
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleCreateTask = (taskData) => {
    addTask({
      ...taskData,
      projectId: projectId,
      status: defaultStatus
    })
    setShowCreateModal(false)
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
                      navigate(`/dashboard/calendar/${p.id}`);
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
          {/* FIX: Using TabLink with correct paths */}
          <TabLink to={`/dashboard/list/${projectId}`} icon={List} label="List" />
          <TabLink to={`/dashboard/board/${projectId}`} icon={Kanban} label="Board" />
          <TabLink to={`/dashboard/calendar/${projectId}`} icon={Calendar} label="Calendar" />
          <TabLink to={`/dashboard/table/${projectId}`} icon={Table} label="Table" />
          <button className="flex items-center gap-1 px-2 text-xs font-medium text-gray-400 hover:text-white">
            <Plus size={12} /> View
          </button>
        </div>
      </div>

      {/* Calendar */}
      <main className="flex-1 overflow-auto p-8 bg-[#111]">
        <div className="max-w-6xl mx-auto">
          {/* Month Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">{monthName}</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-[#2B2D31] rounded-md text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-[#2B2D31] rounded-md text-gray-400 hover:text-white transition-colors"
              >
                <ChevronRight size={20} />
              </button>
              <div className="h-6 w-px bg-[#3E4045] mx-2"></div>
              <button onClick={() => setShowCreateModal(true)} className="bg-white text-black text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-gray-200 transition-colors">
                Add Task
              </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {allDays.map((day, idx) => {
              const dayTasks = day ? getTasksForDay(day) : []
              return (
                <div
                  key={idx}
                  className={`min-h-[120px] p-2 rounded-lg border transition-colors ${day
                    ? 'bg-[#1E1F21] border-[#2B2D31] hover:border-[#3E4045]'
                    : 'bg-transparent border-transparent'
                    }`}
                >
                  {day && (
                    <>
                      <div className="text-sm font-medium text-gray-300 mb-2">{day}</div>
                      <div className="space-y-1">
                        {dayTasks.slice(0, 2).map(task => (
                          <div
                            key={task.id}
                            onClick={(e) => { e.stopPropagation(); openTaskDrawer(task); }}
                            className="text-xs bg-indigo-600 text-white px-2 py-1 rounded truncate cursor-pointer hover:bg-indigo-700 shadow-sm"
                            title={task.title}
                          >
                            {task.title}
                          </div>
                        ))}
                        {dayTasks.length > 2 && (
                          <div className="text-xs text-gray-500 px-2">
                            +{dayTasks.length - 2} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <CreateTaskForm onCreate={handleCreateTask} onCancel={() => setShowCreateModal(false)} members={members} defaultStatus={defaultStatus} />
        </div>
      )}
    </>
  )
}
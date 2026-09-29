import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useProject } from '../context/ProjectContext'
import {
  CheckCircle2, Calendar, LayoutGrid, Search
} from 'lucide-react'
import { formatDue, isOverdue } from '../utils/dates'
import { SkeletonRows } from '../components/Skeleton'

// Professional styling constants for tags
const PRIORITIES = {
  High: { color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  Normal: { color: 'text-neutral-300 bg-neutral-500/10 border-neutral-500/25' },
  Low: { color: 'text-neutral-400 bg-neutral-400/10 border-neutral-400/20' }
}

export default function MyTasks() {
  const { currentUser } = useAuth()
  const { tasks, loading, updateTask, projects, openTaskDrawer } = useProject()
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState('active') // 'active' or 'completed'

  // Filter Logic
  const myTasks = tasks.filter(task => task.assigneeId === currentUser?.uid && !task.isArchived)

  const filteredTasks = myTasks.filter(t => {
    const matchesSearch = (t.title || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filter === 'active' ? t.status !== 'COMPLETE' : t.status === 'COMPLETE'
    return matchesSearch && matchesStatus
  }).sort((a, b) => (a.dueDate || '9999') .localeCompare(b.dueDate || '9999'))

  const getProjectName = (projectId) => {
    const proj = projects.find(p => String(p.id) === String(projectId))
    return proj ? proj.name : 'Unknown Project'
  }

  const handleStatusToggle = (task) => {
    updateTask(task.id, { status: task.status === 'COMPLETE' ? 'TO DO' : 'COMPLETE' })
  }

  return (
    <div className="flex flex-col h-full bg-base text-neutral-300 font-sans selection:bg-accent-500/30 relative overflow-hidden">

      {/* --- Ambient Background Texture --- */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIwLjA1Ii8+PC9zdmc+')] opacity-10 pointer-events-none z-0"></div>

      {/* --- Header Section --- */}
      <div className="relative z-10 px-6 py-6 md:px-10 md:py-8 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-raised bg-card/80 backdrop-blur-md sticky top-0 shadow-sm">
        <div>
          <h1 className="text-[26px] leading-tight font-semibold text-neutral-50 tracking-[-0.02em] mb-2">My Tasks</h1>
          <p className="text-neutral-400 text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            You have <span className="text-white font-semibold">{myTasks.filter(t => t.status !== 'COMPLETE').length}</span> pending tasks assigned to you.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">

          {/* Search */}
          <div className="relative group">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-accent-400 transition-colors" />
            <input
              aria-label="Search my tasks"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-base border border-edge rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent-500 focus:bg-panel w-full md:w-64 transition-all text-white placeholder-neutral-500"
            />
          </div>

          {/* Active/Completed Toggle (Segmented Control) */}
          <div className="flex bg-base p-1 rounded-xl border border-edge">
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${filter === 'active' ? 'bg-accent-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-raised'}`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${filter === 'completed' ? 'bg-accent-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-raised'}`}
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* --- Task List --- */}
      <div className="relative z-10 flex-1 overflow-y-auto p-6 md:p-10">
        {loading.tasks ? <div className="max-w-5xl mx-auto"><SkeletonRows rows={5} label="Loading your tasks" /></div> : filteredTasks.length > 0 ? (
          <div className="space-y-3 max-w-5xl mx-auto">
            {filteredTasks.map(task => (
              <div
                key={task.id}
                onClick={() => openTaskDrawer(task)}
                className="group flex items-center gap-4 p-4 rounded-2xl border border-raised bg-card hover:border-accent-500/40 hover:bg-card transition-all duration-200 cursor-pointer"
              >
                {/* Custom Checkbox */}
                <button
                  aria-label={task.status === 'COMPLETE' ? 'Mark as to do' : 'Mark complete'}
                  onClick={(e) => {
                    e.stopPropagation() // Prevents the drawer from opening when checking the box
                    handleStatusToggle(task)
                  }}
                  className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                    task.status === 'COMPLETE'
                      ? 'bg-emerald-500 border-emerald-500 text-[var(--color-base)] scale-100'
                      : 'border-edge bg-base text-transparent hover:border-accent-500 hover:scale-110'
                  }`}
                >
                  <CheckCircle2 size={14} strokeWidth={3} />
                </button>

                {/* Task Content */}
                <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <span className={`text-[15px] font-semibold transition-colors truncate block ${
                      task.status === 'COMPLETE' ? 'text-neutral-500 line-through' : 'text-neutral-200 group-hover:text-white'
                    }`}>
                      {task.title}
                    </span>
                  </div>

                  {/* Metadata Group */}
                  <div className="flex items-center gap-3 md:gap-6 shrink-0">

                    {/* Project Label */}
                    <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-base border border-raised text-xs font-medium text-neutral-400 group-hover:border-edge transition-colors">
                      <LayoutGrid size={12} className="text-accent-400" />
                      <span className="truncate max-w-[120px]">{getProjectName(task.projectId)}</span>
                    </div>

                    {/* Date */}
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${task.status !== 'COMPLETE' && isOverdue(task.dueDate) ? 'text-red-400' : task.dueDate ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      <Calendar size={14} className={task.dueDate ? '' : 'opacity-50'} />
                      {task.status !== 'COMPLETE' && isOverdue(task.dueDate) ? `Overdue · ${formatDue(task.dueDate)}` : formatDue(task.dueDate) || 'No Date'}
                    </div>

                    {/* Priority Badge */}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-[0.08em] border ${PRIORITIES[task.priority]?.color || 'text-neutral-500 border-neutral-500/20 bg-neutral-500/10'}`}>
                      {task.priority}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="h-full flex flex-col items-center justify-center text-neutral-500 max-w-md mx-auto text-center mt-[-10vh]">
            <div className="w-24 h-24 rounded-full bg-card border border-raised flex items-center justify-center mb-6 shadow-2xl">
              <CheckCircle2 size={40} className="text-accent-500/40" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {filter === 'active' ? 'You\'re all caught up!' : 'No completed tasks yet'}
            </h3>
            <p className="text-sm text-neutral-400">
              {filter === 'active'
                ? 'Enjoy your free time or head over to a project to assign yourself new tasks.'
                : 'When you finish tasks, they will appear here for your records.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
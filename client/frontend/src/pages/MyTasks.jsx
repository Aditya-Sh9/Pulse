import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useProject } from '../context/ProjectContext'
import { 
  CheckCircle2, Calendar, Flag, LayoutGrid, Search, Filter 
} from 'lucide-react'

// Professional styling constants for tags
const PRIORITIES = {
  High: { color: 'text-red-400 bg-red-400/10 border-red-400/20', icon: Flag },
  Normal: { color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', icon: Flag },
  Low: { color: 'text-slate-400 bg-slate-400/10 border-slate-400/20', icon: Flag }
}

export default function MyTasks() {
  const { currentUser } = useAuth()
  const { tasks, updateTask, projects, openTaskDrawer } = useProject()
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState('active') // 'active' or 'completed'

  // Filter Logic
  const myTasks = tasks.filter(task => task.assigneeId === currentUser?.uid)
  
  const filteredTasks = myTasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filter === 'active' ? t.status !== 'COMPLETE' : t.status === 'COMPLETE'
    return matchesSearch && matchesStatus
  })

  const getProjectName = (projectId) => {
    const proj = projects.find(p => String(p.id) === String(projectId))
    return proj ? proj.name : 'Unknown Project'
  }

  const handleStatusToggle = (task) => {
    updateTask(task.id, { status: task.status === 'COMPLETE' ? 'TO DO' : 'COMPLETE' })
  }

  return (
    <div className="flex flex-col h-full bg-[#0F1117] text-slate-300 font-sans selection:bg-purple-500/30 relative overflow-hidden">
      
      {/* --- Ambient Background Texture --- */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none z-0"></div>

      {/* --- Header Section --- */}
      <div className="relative z-10 px-6 py-6 md:px-10 md:py-8 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#2B2D31] bg-[#1E1F21]/80 backdrop-blur-md sticky top-0 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">My Tasks</h1>
          <p className="text-slate-400 text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            You have <span className="text-white font-semibold">{myTasks.filter(t => t.status !== 'COMPLETE').length}</span> pending tasks assigned to you.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          
          {/* Search */}
          <div className="relative group">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
            <input 
              placeholder="Search tasks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#111] border border-[#3E4045] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 focus:bg-[#161719] w-full md:w-64 transition-all text-white placeholder-slate-500 shadow-inner" 
            />
          </div>
          
          {/* Active/Completed Toggle (Segmented Control) */}
          <div className="flex bg-[#111] p-1 rounded-xl border border-[#3E4045] shadow-inner">
            <button 
              onClick={() => setFilter('active')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${filter === 'active' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-[#2B2D31]'}`}
            >
              Active
            </button>
            <button 
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${filter === 'completed' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-[#2B2D31]'}`}
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* --- Task List --- */}
      <div className="relative z-10 flex-1 overflow-y-auto p-6 md:p-10">
        {filteredTasks.length > 0 ? (
          <div className="space-y-3 max-w-5xl mx-auto">
            {filteredTasks.map(task => (
              <div 
                key={task.id} 
                onClick={() => openTaskDrawer(task)}
                className="group flex items-center gap-4 p-4 rounded-2xl border border-[#2B2D31] bg-[#1E1F21] hover:border-purple-500/40 hover:bg-[#252628] hover:shadow-lg hover:shadow-purple-900/10 transition-all duration-200 cursor-pointer"
              >
                {/* Custom Checkbox */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation() // Prevents the drawer from opening when checking the box
                    handleStatusToggle(task)
                  }}
                  className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                    task.status === 'COMPLETE' 
                      ? 'bg-emerald-500 border-emerald-500 text-[#0F1117] scale-100 shadow-[0_0_12px_rgba(16,185,129,0.4)]' 
                      : 'border-[#3E4045] bg-[#111] text-transparent hover:border-purple-500 hover:scale-110'
                  }`}
                >
                  <CheckCircle2 size={14} strokeWidth={3} />
                </button>

                {/* Task Content */}
                <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                  
                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <span className={`text-[15px] font-semibold transition-colors truncate block ${
                      task.status === 'COMPLETE' ? 'text-slate-500 line-through' : 'text-slate-200 group-hover:text-white'
                    }`}>
                      {task.title}
                    </span>
                  </div>

                  {/* Metadata Group */}
                  <div className="flex items-center gap-3 md:gap-6 shrink-0">
                    
                    {/* Project Label */}
                    <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#111] border border-[#2B2D31] text-xs font-medium text-slate-400 group-hover:border-[#3E4045] transition-colors">
                      <LayoutGrid size={12} className="text-purple-400" />
                      <span className="truncate max-w-[120px]">{getProjectName(task.projectId)}</span>
                    </div>

                    {/* Date */}
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${task.dueDate ? 'text-slate-400' : 'text-slate-600'}`}>
                      <Calendar size={14} className={task.dueDate ? "text-blue-400" : "opacity-50"} />
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : 'No Date'}
                    </div>

                    {/* Priority Badge */}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${PRIORITIES[task.priority]?.color || 'text-slate-500 border-slate-500/20 bg-slate-500/10'}`}>
                      {task.priority}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="h-full flex flex-col items-center justify-center text-slate-600 max-w-md mx-auto text-center mt-[-10vh]">
            <div className="w-24 h-24 rounded-full bg-[#1E1F21] border border-[#2B2D31] flex items-center justify-center mb-6 shadow-2xl">
              <CheckCircle2 size={40} className="text-purple-500/40" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {filter === 'active' ? 'You\'re all caught up!' : 'No completed tasks yet'}
            </h3>
            <p className="text-sm text-slate-400">
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
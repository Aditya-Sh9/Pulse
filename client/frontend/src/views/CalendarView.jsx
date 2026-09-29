import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import CreateTaskForm from '../components/CreateTaskForm'
import ProjectViewShell from '../components/ProjectViewShell'
import { toDateKey } from '../utils/dates'

const firstOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1)

export default function CalendarView() {
  const { projectId } = useParams()
  const { tasks, addTask, openTaskDrawer } = useProject()
  const [currentDate, setCurrentDate] = useState(() => firstOfMonth(new Date()))
  const [createForDate, setCreateForDate] = useState(null) // null = closed, '' = no preset date
  const [expandedDay, setExpandedDay] = useState(null)

  const projectTasks = tasks.filter(t => String(t.projectId) === String(projectId) && !t.isArchived)

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = currentDate.getDay()

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const allDays = [...Array.from({ length: firstDayOfMonth }, () => null), ...days]
  const todayKey = toDateKey()

  const keyForDay = (day) => toDateKey(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))

  const shiftMonth = (delta) => {
    setExpandedDay(null)
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1))
  }

  const handleCreateTask = (taskData) => {
    addTask({ ...taskData, projectId, status: 'TO DO' })
    setCreateForDate(null)
  }

  return (
    <ProjectViewShell projectId={projectId} view="calendar">
      <main className="flex-1 overflow-auto p-8 bg-base">
        <div className="max-w-6xl mx-auto">
          {/* Month Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white" aria-live="polite">{monthName}</h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => { setExpandedDay(null); setCurrentDate(firstOfMonth(new Date())) }}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-edge text-neutral-300 hover:bg-raised hover:text-white transition-colors"
              >
                Today
              </button>
              <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)} className="p-2 hover:bg-raised rounded-md text-neutral-400 hover:text-white transition-colors">
                <ChevronLeft size={20} />
              </button>
              <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)} className="p-2 hover:bg-raised rounded-md text-neutral-400 hover:text-white transition-colors">
                <ChevronRight size={20} />
              </button>
              <div className="h-6 w-px bg-edge mx-2"></div>
              <button type="button" onClick={() => setCreateForDate('')} className="bg-white text-black text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-neutral-200 transition-colors">
                Add Task
              </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-neutral-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {allDays.map((day, idx) => {
              if (!day) return <div key={`blank-${idx}`} className="min-h-[120px]" />

              const dateKey = keyForDay(day)
              const dayTasks = projectTasks.filter(t => t.dueDate === dateKey)
              const isToday = dateKey === todayKey
              const expanded = expandedDay === dateKey
              const shown = expanded ? dayTasks : dayTasks.slice(0, 2)

              return (
                <div
                  key={dateKey}
                  className={`group min-h-[120px] p-2 rounded-lg border transition-colors bg-card ${isToday ? 'border-accent-500/60' : 'border-raised hover:border-edge'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${isToday ? 'flex h-6 w-6 items-center justify-center rounded-full bg-accent-500 text-white' : 'text-neutral-300'}`}>{day}</span>
                    <button
                      type="button"
                      aria-label={`Add task due ${dateKey}`}
                      onClick={() => setCreateForDate(dateKey)}
                      className="p-0.5 rounded text-neutral-500 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-white hover:bg-raised transition-opacity"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {shown.map(task => (
                      <button
                        type="button"
                        key={task.id}
                        onClick={() => openTaskDrawer(task)}
                        className={`w-full text-left text-xs font-medium px-2 py-1 rounded-md truncate cursor-pointer transition-colors ring-1 ring-inset ${task.status === 'COMPLETE'
                          ? 'bg-emerald-500/10 text-emerald-300/80 ring-emerald-500/20 line-through'
                          : 'bg-accent-500/15 text-accent-200 ring-accent-400/25 hover:bg-accent-500/25'}`}
                        title={task.title}
                      >
                        {task.title}
                      </button>
                    ))}
                    {dayTasks.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setExpandedDay(expanded ? null : dateKey)}
                        className="text-xs text-neutral-500 hover:text-neutral-200 px-2"
                      >
                        {expanded ? 'Show less' : `+${dayTasks.length - 2} more`}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>

      {createForDate !== null && (
        <CreateTaskForm
          onCreate={handleCreateTask}
          onCancel={() => setCreateForDate(null)}
          defaultStatus="TO DO"
          defaultDueDate={createForDate}
        />
      )}
    </ProjectViewShell>
  )
}

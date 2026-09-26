import React, { useMemo } from 'react'
import { useProject } from '../context/ProjectContext'
import { useAuth } from '../context/AuthContext'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts'
import {
  CheckCircle2, Clock, ListTodo, Zap, TrendingUp,
  Calendar, ArrowRight, LayoutGrid
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useCountUp from '../hooks/useCountUp'

const STATUS_COLORS = {
  'In Progress': '#F57D43', // Ember
  'Completed': '#10B981',   // Green
  'To Do': '#62675F'        // Neutral
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-panel border border-raised p-3 rounded-lg outline-none">
        <p className="text-neutral-400 font-medium text-xs mb-2">{label || payload[0].name}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm flex items-center gap-2 font-medium" style={{ color: entry.color || entry.fill }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
            {entry.name}: <span className="text-white ml-auto pl-4">{entry.value}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function DashboardHome() {
  const { tasks: allTasks, members, projects, openTaskDrawer } = useProject()
  const { currentUser, userRole } = useAuth()
  const navigate = useNavigate()

  const tasks = useMemo(() => {
    if (userRole === 'admin') return allTasks;
    return allTasks.filter(t => t.assigneeId === currentUser?.uid);
  }, [allTasks, userRole, currentUser]);

  const myProfile = members.find(m => m.id === currentUser?.uid)

  // --- METRICS ---
  const totalTasks = tasks.filter(t => !t.isArchived).length
  // Grouping statuses logically to avoid rigid string matching on just one casing
  const completedTasks = tasks.filter(t => (t.status === 'COMPLETE' || t.status?.toLowerCase() === 'completed') && !t.isArchived).length
  const inProgressTasks = tasks.filter(t => (t.status === 'IN PROGRESS' || t.status?.toLowerCase() === 'in progress') && !t.isArchived).length
  const todoTasks = tasks.filter(t => (t.status === 'TO DO' || t.status?.toLowerCase() === 'to do') && !t.isArchived).length
  const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)

  // --- UPCOMING DEADLINES ---
  const upcomingTasks = useMemo(() => {
    return tasks
      .filter(t => t.dueDate && t.status !== 'COMPLETE' && !t.isArchived)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 4)
  }, [tasks])

  // --- PIE CHART DATA ---
  const pieData = [
    { name: 'In Progress', value: inProgressTasks },
    { name: 'Completed', value: completedTasks },
    { name: 'To Do', value: todoTasks },
  ].filter(d => d.value > 0)

  // --- HORIZONTAL BAR CHART (Team Workload) ---
  const workloadData = useMemo(() => {
    return members.map(member => {
      const memberTasks = tasks.filter(t => t.assigneeId === member.id && t.status !== 'COMPLETE' && !t.isArchived)
      return {
        name: member.name?.split(' ')[0] || 'User',
        Tasks: memberTasks.length,
      }
    }).sort((a, b) => b.Tasks - a.Tasks)
  }, [members, tasks])

  // --- AREA CHART DATA (Real Due-Date Trend) ---
  const areaData = useMemo(() => {
    const data = []

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateKey = d.toISOString().slice(0, 10)

      const dueTasks = tasks.filter(task => task.dueDate === dateKey && !task.isArchived)
      const completedDueTasks = dueTasks.filter(task => task.status === 'COMPLETE')

      data.push({
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        Due: dueTasks.length,
        Completed: completedDueTasks.length
      })
    }
    return data
  }, [tasks])

  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (

    <div className="px-8 py-8 h-full flex flex-col bg-base text-neutral-200 overflow-y-auto custom-scrollbar relative max-w-[1400px] w-full mx-auto">

      {/* Header */}
      <div className="mb-8 flex justify-between items-end gap-6 relative z-10">
        <div>
          <p className="text-neutral-500 text-sm font-medium mb-2">
            {currentDate} · {userRole === 'admin' ? 'Workspace Analytics' : 'My Performance'}
          </p>
          <h1 className="text-[28px] leading-tight font-semibold text-neutral-50 tracking-[-0.02em]">
            Welcome back, <span className="text-neutral-50">{currentUser?.displayName?.split(' ')[0] || 'User'}</span>
          </h1>
        </div>
        <div className="hidden md:flex items-center gap-2 bg-card border border-raised px-4 py-2 rounded-full">
          <Zap size={16} className="text-yellow-500 fill-yellow-500" />
          <span className="text-sm font-bold text-neutral-300">Level <span className="text-white">{Math.floor((myProfile?.productivityScore || 0) / 100) + 1}</span></span>
          <div className="w-px h-4 bg-edge mx-2"></div>
          <span className="text-sm font-bold text-accent-400">{myProfile?.productivityScore || 0} XP</span>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div data-stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 relative z-10">
        <MetricCard
          title="Total Tasks"
          value={totalTasks}
          icon={ListTodo}
          color="text-ember-400"
          bg="bg-ember-500/10"
        />
        <MetricCard
          title="Completion Rate"
          value={`${completionRate}%`}
          icon={TrendingUp}
          color="text-accent-400"
          bg="bg-accent-500/10"
        />
        <MetricCard
          title="Tasks Completed"
          value={completedTasks}
          icon={CheckCircle2}
          color="text-green-400"
          bg="bg-green-500/10"
        />
        <MetricCard
          title="In Progress"
          value={inProgressTasks}
          icon={Clock}
          color="text-orange-400"
          bg="bg-orange-500/10"
        />
      </div>

      <div data-stagger className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 relative z-10">
        {/* Main Area Chart - Due-Date Trend */}
        <div className="lg:col-span-2 bg-card border border-raised rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <TrendingUp size={16} className="text-neutral-500" aria-hidden="true" /> Due this week
            </h3>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#45C1AA" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#45C1AA" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#212421" vertical={false} />
                <XAxis dataKey="name" stroke="#858A83" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis stroke="#858A83" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} allowDecimals={false} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#2D312D', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="Due" stroke="#45C1AA" strokeWidth={2} fillOpacity={1} fill="url(#colorDue)" activeDot={{ r: 6, fill: '#45C1AA', stroke: '#161816', strokeWidth: 2 }} />
                <Area type="monotone" dataKey="Completed" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorCompleted)" activeDot={{ r: 6, fill: '#10B981', stroke: '#161816', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="bg-card border border-raised rounded-2xl p-6 flex flex-col">
          <h3 className="text-sm font-semibold text-neutral-100 mb-2 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-neutral-500" aria-hidden="true" /> Distribution
          </h3>
          <div className="flex-1 w-full relative min-h-[250px] flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={4}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-500">
                No tasks available
              </div>
            )}

            {pieData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl font-bold text-white">{totalTasks}</span>
                <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-[0.08em] mt-1">Total</span>
              </div>
            )}
          </div>

          {/* Custom Legend */}
          <div className="flex justify-center gap-4 mt-2">
            {pieData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[entry.name] }}></div>
                <span className="text-xs text-neutral-400 font-medium">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div data-stagger className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative z-10 pb-10">

        {/* Horizontal Bar Chart - Team Workload */}
        {userRole === 'admin' && (
          <div className="bg-card border border-raised rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-neutral-100 mb-6 flex items-center gap-2">
              <LayoutGrid size={16} className="text-neutral-500" aria-hidden="true" /> Active workload by member
            </h3>
            <div className="h-[250px] w-full">
              {workloadData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workloadData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#212421" horizontal={true} vertical={false} />
                    <XAxis type="number" stroke="#858A83" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#A3A7A1', fontSize: 12, fontWeight: 500 }} width={80} />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#212421', opacity: 0.4 }} />
                    <Bar dataKey="Tasks" fill="#F57D43" radius={[0, 4, 4, 0]} barSize={24}>
                      {workloadData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#45C1AA' : '#F57D43'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-neutral-500">
                  No active tasks assigned to team members.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upcoming Deadlines Widget */}
        <div className={`bg-card border border-raised rounded-2xl p-6 flex flex-col ${userRole !== 'admin' ? 'lg:col-span-2' : ''}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <Calendar size={16} className="text-neutral-500" aria-hidden="true" /> Upcoming deadlines
            </h3>
            {projects[0] && (
              <button
                onClick={() => navigate(`/dashboard/list/${projects[0].id}`)}
                className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight size={12} />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {upcomingTasks.length > 0 ? (
              upcomingTasks.map(task => {
                const date = new Date(task.dueDate)
                const isToday = date.toDateString() === new Date().toDateString()
                const isOverdue = date < new Date() && !isToday

                return (
                  <div
                    key={task.id}
                    onClick={() => openTaskDrawer(task)}
                    className="flex items-center justify-between p-3 rounded-xl bg-panel border border-raised hover:border-edge-2 hover:bg-raised cursor-pointer group transition-colors duration-200"
                  >
                    <div className="flex flex-col gap-1 min-w-0 pr-4">
                      <span className="text-sm font-bold text-neutral-200 group-hover:text-white truncate">{task.title}</span>
                      <span className="text-xs font-medium text-neutral-500 truncate">
                        {projects.find(p => p.id === task.projectId)?.name || 'Project'}
                      </span>
                    </div>
                    <div className={`px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap ${isOverdue ? 'bg-red-500/10 text-red-400' :
                      isToday ? 'bg-orange-500/10 text-orange-400' :
                        'bg-raised text-neutral-300'
                      }`}>
                      {isOverdue ? 'Overdue' : isToday ? 'Today' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500 py-8">
                <Calendar size={32} className="opacity-20 mb-3" />
                <p className="text-sm">No upcoming deadlines.</p>
                <p className="text-xs mt-1 opacity-70">You're all caught up!</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

// Sub-component for Metric Cards
function MetricCard({ title, value, icon: Icon, color, bg }) {
  const shown = useCountUp(value)
  return (
    <div className="lift bg-card border border-raised rounded-2xl p-5 flex flex-col hover:border-edge">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-neutral-400 font-medium">{title}</p>
        <div className={`w-8 h-8 rounded-lg ${bg} ${color} flex items-center justify-center flex-shrink-0`}>
          <Icon size={16} aria-hidden="true" />
        </div>
      </div>
      <p className="text-[32px] leading-none font-semibold text-neutral-50 tracking-[-0.02em] tabular-nums">{shown}</p>
    </div>
  )
}

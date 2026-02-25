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

const STATUS_COLORS = {
  'In Progress': '#3B82F6', // Blue
  'Completed': '#10B981',   // Green
  'To Do': '#64748B'        // Slate
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
    const now = new Date()
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

  // --- AREA CHART DATA (Stable Activity Trend) ---
  const areaData = useMemo(() => {
    const data = []
    const currentRemaining = todoTasks + inProgressTasks
    const currentCompleted = completedTasks

    // Generates a stable burndown curve ending on the exact current actual values
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)

      data.push({
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        Remaining: currentRemaining + Math.floor(i * 1.5),
        Completed: Math.max(0, currentCompleted - Math.floor(i * 0.8)),
      })
    }
    return data
  }, [todoTasks, inProgressTasks, completedTasks])

  // --- CUSTOM TOOLTIP FOR CHARTS ---
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#18191B] border border-[#2B2D31] p-3 rounded-lg shadow-xl outline-none">
          <p className="text-white font-bold text-xs mb-2 uppercase tracking-wider">{label || payload[0].name}</p>
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

  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  // throw new Error("Simulated crash to test Error Boundary");

  return (

    <div className="p-8 h-full flex flex-col bg-[#0F1117] text-gray-200 overflow-y-auto custom-scrollbar relative">

      {/* Background Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <div className="mb-8 flex justify-between items-end relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <p className="text-purple-400 text-sm font-bold uppercase tracking-wider mb-1">
            {currentDate} • {userRole === 'admin' ? 'Workspace Analytics' : 'My Performance'}
          </p>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">{currentUser?.displayName?.split(' ')[0] || 'User'}</span> 👋
          </h1>
        </div>
        <div className="hidden md:flex items-center gap-2 bg-[#1E1F21] border border-[#2B2D31] px-4 py-2 rounded-full shadow-lg">
          <Zap size={16} className="text-yellow-500 fill-yellow-500" />
          <span className="text-sm font-bold text-gray-300">Level <span className="text-white">{Math.floor((myProfile?.productivityScore || 0) / 100) + 1}</span></span>
          <div className="w-px h-4 bg-[#3E4045] mx-2"></div>
          <span className="text-sm font-bold text-purple-400">{myProfile?.productivityScore || 0} XP</span>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 relative z-10">
        <MetricCard
          title="Total Tasks"
          value={totalTasks}
          icon={ListTodo}
          color="text-blue-400"
          bg="bg-blue-500/10"
          delay="delay-100"
        />
        <MetricCard
          title="Completion Rate"
          value={`${completionRate}%`}
          icon={TrendingUp}
          color="text-purple-400"
          bg="bg-purple-500/10"
          delay="delay-150"
        />
        <MetricCard
          title="Tasks Completed"
          value={completedTasks}
          icon={CheckCircle2}
          color="text-green-400"
          bg="bg-green-500/10"
          delay="delay-200"
        />
        <MetricCard
          title="In Progress"
          value={inProgressTasks}
          icon={Clock}
          color="text-orange-400"
          bg="bg-orange-500/10"
          delay="delay-250"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 relative z-10">
        {/* Main Area Chart - Burndown Trend */}
        <div className="lg:col-span-2 bg-[#1E1F21]/80 backdrop-blur-xl border border-[#2B2D31] rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={16} className="text-purple-400" /> 7-Day Activity
            </h3>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRemaining" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2B2D31" vertical={false} />
                <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} allowDecimals={false} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#3E4045', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="Remaining" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorRemaining)" activeDot={{ r: 6, fill: '#8B5CF6', stroke: '#1E1F21', strokeWidth: 2 }} />
                <Area type="monotone" dataKey="Completed" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorCompleted)" activeDot={{ r: 6, fill: '#10B981', stroke: '#1E1F21', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="bg-[#1E1F21]/80 backdrop-blur-xl border border-[#2B2D31] rounded-2xl p-6 shadow-xl flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-700 delay-400">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-blue-400" /> Distribution
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
              <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
                No tasks available
              </div>
            )}

            {pieData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl font-black text-white">{totalTasks}</span>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Total</span>
              </div>
            )}
          </div>

          {/* Custom Legend */}
          <div className="flex justify-center gap-4 mt-2">
            {pieData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[entry.name] }}></div>
                <span className="text-xs text-gray-400 font-medium">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10 pb-10">

        {/* Horizontal Bar Chart - Team Workload */}
        {userRole === 'admin' && (
          <div className="bg-[#1E1F21]/80 backdrop-blur-xl border border-[#2B2D31] rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <LayoutGrid size={16} className="text-blue-400" /> Active Workload (By Member)
            </h3>
            <div className="h-[250px] w-full">
              {workloadData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workloadData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2B2D31" horizontal={true} vertical={false} />
                    <XAxis type="number" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 500 }} width={80} />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#2B2D31', opacity: 0.4 }} />
                    <Bar dataKey="Tasks" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={24}>
                      {workloadData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#8B5CF6' : '#3B82F6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-500">
                  No active tasks assigned to team members.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upcoming Deadlines Widget */}
        <div className={`bg-[#1E1F21]/80 backdrop-blur-xl border border-[#2B2D31] rounded-2xl p-6 shadow-xl flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-700 delay-700 ${userRole !== 'admin' ? 'lg:col-span-2' : ''}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar size={16} className="text-pink-400" /> Upcoming Deadlines
            </h3>
            {projects[0] && (
              <button
                onClick={() => navigate(`/dashboard/list/${projects[0].id}`)}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
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
                    className="flex items-center justify-between p-3 rounded-xl bg-[#18191B] border border-[#2B2D31] hover:border-purple-500/30 cursor-pointer group transition-all"
                  >
                    <div className="flex flex-col gap-1 min-w-0 pr-4">
                      <span className="text-sm font-bold text-gray-200 group-hover:text-white truncate">{task.title}</span>
                      <span className="text-xs font-medium text-gray-500 truncate">
                        {projects.find(p => p.id === task.projectId)?.name || 'Project'}
                      </span>
                    </div>
                    <div className={`px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap ${isOverdue ? 'bg-red-500/10 text-red-400' :
                      isToday ? 'bg-orange-500/10 text-orange-400' :
                        'bg-[#2B2D31] text-gray-300'
                      }`}>
                      {isOverdue ? 'Overdue' : isToday ? 'Today' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-8">
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
function MetricCard({ title, value, icon: Icon, color, bg, delay }) {
  return (
    <div className={`bg-[#1E1F21]/80 backdrop-blur-xl border border-[#2B2D31] rounded-2xl p-5 shadow-lg flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 ${delay}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl ${bg} ${color} flex items-center justify-center flex-shrink-0 shadow-inner`}>
          <Icon size={20} />
        </div>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{title}</p>
      </div>
      <h4 className="text-3xl font-black text-white pl-1">{value}</h4>
    </div>
  )
}
import React, { useState } from 'react'
import { useProject } from '../context/ProjectContext'
import {
  Activity, CheckSquare, Folder, User, Settings,
  Search, Filter, Clock, LayoutGrid, Zap
} from 'lucide-react'

export default function ActivityLog() {
  const { globalActivities, members } = useProject()

  const [filterType, setFilterType] = useState('all')
  const [filterUser, setFilterUser] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const getIconForType = (type) => {
    switch (type) {
      case 'task': return <CheckSquare size={16} className="text-ember-400" />
      case 'project': return <LayoutGrid size={16} className="text-accent-400" />
      case 'space': return <Folder size={16} className="text-yellow-400" />
      case 'user': return <User size={16} className="text-green-400" />
      case 'system': return <Settings size={16} className="text-red-400" />
      case 'xp': return <Zap size={16} className="text-yellow-400" />
      default: return <Activity size={16} className="text-neutral-400" />
    }
  }

  const getBgForType = (type) => {
    switch (type) {
      case 'task': return 'bg-ember-500/10 border-ember-500/20'
      case 'project': return 'bg-accent-500/10 border-accent-500/20'
      case 'space': return 'bg-yellow-500/10 border-yellow-500/20'
      case 'user': return 'bg-green-500/10 border-green-500/20'
      case 'system': return 'bg-red-500/10 border-red-500/20'
      case 'xp': return 'bg-yellow-500/10 border-yellow-500/20'
      default: return 'bg-neutral-500/10 border-neutral-500/20'
    }
  }

  const filteredLogs = globalActivities.filter(log => {
    const matchesType = filterType === 'all' || log.type === filterType
    const matchesUser = filterUser === 'all' || log.userId === filterUser

    // Safety check: if no searchQuery, don't filter out anything based on search.
    // Also handle undefined properties safely.
    const query = searchQuery.toLowerCase()
    const matchesSearch = !query ||
      (log.action?.toLowerCase() || '').includes(query) ||
      (log.userName?.toLowerCase() || '').includes(query)

    return matchesType && matchesUser && matchesSearch
  })

  return (
    <div className="p-8 h-full flex flex-col bg-base text-neutral-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[26px] leading-tight font-semibold text-neutral-50 tracking-[-0.02em] mb-2 flex items-center gap-3">
            <Activity className="text-accent-500" size={32} /> Audit Log
          </h1>
          <p className="text-sm text-neutral-400">Complete historical record of all workspace activities.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search logs..."
              aria-label="Search logs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-card border border-raised rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-accent-500 text-white w-full md:w-64 transition-colors"
            />
          </div>

          <div className="relative flex items-center bg-card border border-raised rounded-lg px-3">
            <Filter size={14} className="text-neutral-500 mr-2" />
            <select
              aria-label="Filter by action type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent text-sm text-neutral-300 py-2 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-card">All Actions</option>
              <option value="task" className="bg-card">Tasks</option>
              <option value="project" className="bg-card">Projects</option>
              <option value="space" className="bg-card">Spaces</option>
              <option value="user" className="bg-card">Users</option>
              <option value="xp" className="bg-card">XP & Leaderboard</option>
              <option value="system" className="bg-card">System</option>
            </select>
          </div>

          <div className="relative flex items-center bg-card border border-raised rounded-lg px-3">
            <User size={14} className="text-neutral-500 mr-2" />
            <select
              aria-label="Filter by user"
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="bg-transparent text-sm text-neutral-300 py-2 focus:outline-none cursor-pointer max-w-[150px] truncate"
            >
              <option value="all" className="bg-card">All Users</option>
              {members.map(m => (
                <option key={m.id} value={m.id} className="bg-card">{m.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
        <div className="relative border-l-2 border-raised ml-4 space-y-8 pb-10">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <div key={log._id || log.id} className="relative flex items-start gap-6 group">
                {/* Timeline Dot */}
                <div className={`absolute -left-[21px] p-2 rounded-full border bg-base shadow-lg ${getBgForType(log.type)}`}>
                  {getIconForType(log.type)}
                </div>

                <div className="flex-1 bg-card border border-raised rounded-xl p-4 shadow-sm group-hover:border-accent-500/30 transition-colors ml-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-bold text-white">
                        {log.userAvatar}
                      </div>
                      <div>
                        <span className="font-bold text-neutral-200 text-sm">{log.userName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
                      <Clock size={12} />
                      {log.createdAt ? new Date(log.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Just now'}
                    </div>
                  </div>
                  <div className="pl-11">
                    <p className="text-neutral-300 text-sm leading-relaxed">
                      {log.action}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="ml-8 p-12 text-center bg-card border border-raised rounded-xl text-neutral-500">
              <Activity size={48} className="mx-auto mb-4 opacity-20" />
              <p>No activity logs found matching your filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
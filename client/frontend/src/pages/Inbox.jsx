import React, { useState } from 'react'
import { useProject } from '../context/ProjectContext'
import { useNavigate } from 'react-router-dom'
import { 
  Inbox as InboxIcon, Trash2, Check, Clock, 
  MessageSquare, UserCircle, Bell, CheckCheck, Sparkles, EyeOff 
} from 'lucide-react'

export default function Inbox() {
  const { notifications, markNotificationAsRead, markNotificationAsUnread, markAllNotificationsAsRead, deleteNotification, tasks, openTaskDrawer } = useProject()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all') // 'all', 'unread', 'read'

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.read
    return true
  })

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return <div className="p-2 bg-pink-500/20 text-pink-400 rounded-lg border border-pink-500/30"><MessageSquare size={18} /></div>
      case 'mention':
        return <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30"><MessageSquare size={18} /></div>
      case 'assigned':
        return <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/30"><UserCircle size={18} /></div>
      default:
        return <div className="p-2 bg-slate-500/20 text-slate-400 rounded-lg border border-slate-500/30"><Bell size={18} /></div>
    }
  }

  const handleNotificationClick = (notif) => {
    markNotificationAsRead(notif.id)
    
    if (notif.type === 'message') {
      navigate(`/dashboard/messages/${notif.taskId}`) // taskId holds sender ID for messages
    } else {
      const task = tasks.find(t => t.id === notif.taskId)
      if (task) openTaskDrawer(task)
    }
  }

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now'
    // Handle Firestore Timestamp vs JS Date
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const seconds = Math.floor((new Date() - date) / 1000)
    
    if (seconds < 60) return `Just now`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <div className="flex flex-col h-full bg-[#0F1117] relative overflow-hidden">
      {/* --- Background Pulse Texture --- */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>

      {/* Header */}
      <div className="relative z-10 bg-[#1E1F21]/80 backdrop-blur-md border-b border-[#2B2D31] px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-600/10 rounded-xl border border-purple-500/20">
            <InboxIcon size={22} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Inbox</h1>
            <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-widest font-bold">Activity Center</p>
          </div>
        </div>

        {notifications.filter(n => !n.read).length > 0 && (
          <button 
            onClick={markAllNotificationsAsRead}
            className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-2 px-4 py-2 bg-purple-500/5 rounded-lg border border-purple-500/10 transition-all"
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="relative z-10 px-8 py-2 border-b border-[#2B2D31] bg-[#161719]/50">
        <div className="flex items-center gap-6">
          {['all', 'unread'].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`text-xs font-bold py-4 uppercase tracking-widest border-b-2 transition-all ${
                filter === t
                  ? 'border-purple-500 text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {t}
              {t === 'unread' && notifications.filter(n => !n.read).length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-purple-600 text-[10px] rounded-full text-white">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <main className="relative z-10 flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto py-6 px-4">
          <div className="space-y-2">
            {filteredNotifications.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-[#1E1F21] rounded-full flex items-center justify-center border border-[#2B2D31] mb-4 shadow-2xl">
                   <Clock size={32} className="text-slate-700" />
                </div>
                <h3 className="text-slate-300 font-bold text-lg">All caught up!</h3>
                <p className="text-slate-500 text-sm mt-1">No {filter} notifications to show.</p>
              </div>
            ) : (
              filteredNotifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative p-5 rounded-2xl border transition-all cursor-pointer flex items-center gap-5 ${
                    !notif.read 
                      ? 'bg-[#1E1F21] border-purple-500/30 shadow-lg shadow-purple-900/10' 
                      : 'bg-[#161719]/40 border-[#2B2D31] opacity-70 hover:opacity-100 hover:bg-[#1E1F21]'
                  }`}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notif.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-purple-400 uppercase tracking-tighter">
                        {notif.senderName}
                      </span>
                      {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>}
                    </div>
                    <p className={`text-sm leading-relaxed ${!notif.read ? 'text-white font-medium' : 'text-slate-400'}`}>
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                       <span className="text-[10px] text-slate-600 flex items-center gap-1 font-bold">
                          <Clock size={10} /> {getTimeAgo(notif.createdAt)}
                       </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {notif.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          markNotificationAsUnread(notif.id)
                        }}
                        className="p-2 bg-[#2B2D31] hover:bg-purple-600 text-slate-400 hover:text-white rounded-lg transition-all"
                        title="Mark as unread"
                      >
                        <EyeOff size={16} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNotification(notif.id)
                      }}
                      className="p-2 bg-[#2B2D31] hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-all"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
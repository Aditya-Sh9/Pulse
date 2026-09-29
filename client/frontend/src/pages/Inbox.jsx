import React, { useState } from 'react'
import { useProject } from '../context/ProjectContext'
import { useNavigate } from 'react-router-dom'
import {
  Inbox as InboxIcon, Trash2, Clock,
  MessageSquare, UserCircle, Bell, CheckCheck, EyeOff, AlarmClock, LifeBuoy, Zap
} from 'lucide-react'
import { timeAgo } from '../utils/dates'
import { openNotification } from '../utils/notifications'

export default function Inbox() {
  const {
    notifications, markNotificationAsRead, markNotificationAsUnread, markAllNotificationsAsRead,
    deleteNotification, clearNotifications, confirmAction, tasks, openTaskDrawer, showToast
  } = useProject()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all') // 'all' | 'unread'

  const unreadCount = notifications.filter(n => !n.read).length
  const filteredNotifications = filter === 'unread' ? notifications.filter(n => !n.read) : notifications

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30"><MessageSquare size={18} /></div>
      case 'mention':
        return <div className="p-2 bg-ember-500/20 text-ember-400 rounded-lg border border-ember-500/30"><MessageSquare size={18} /></div>
      case 'assigned':
        return <div className="p-2 bg-accent-500/20 text-accent-400 rounded-lg border border-accent-500/30"><UserCircle size={18} /></div>
      case 'reminder':
        return <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg border border-sky-500/30"><AlarmClock size={18} /></div>
      case 'support':
        return <div className="p-2 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30"><LifeBuoy size={18} /></div>
      case 'system':
        return <div className="p-2 bg-yellow-500/20 text-yellow-400 rounded-lg border border-yellow-500/30"><Zap size={18} /></div>
      default:
        return <div className="p-2 bg-neutral-500/20 text-neutral-400 rounded-lg border border-neutral-500/30"><Bell size={18} /></div>
    }
  }

  const handleNotificationClick = (notif) => {
    if (!notif.read) markNotificationAsRead(notif.id)
    openNotification(notif, { navigate, tasks, openTaskDrawer, showToast })
  }

  return (
    <div className="flex flex-col h-full bg-base relative overflow-hidden">
      {/* --- Background Pulse Texture --- */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIwLjA1Ii8+PC9zdmc+')] opacity-10 pointer-events-none"></div>

      {/* Header */}
      <div className="relative z-10 bg-card border-b border-raised px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-accent-600/10 rounded-xl border border-accent-500/20">
            <InboxIcon size={22} className="text-accent-400" />
          </div>
          <div>
            <h1 className="text-[26px] leading-tight font-semibold text-neutral-50 tracking-[-0.02em]">Inbox</h1>
            <p className="text-xs text-neutral-500 mt-0.5 uppercase tracking-widest font-bold">Activity Center</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllNotificationsAsRead}
              className="text-xs font-bold text-accent-400 hover:text-accent-300 flex items-center gap-2 px-4 py-2 bg-accent-500/5 rounded-lg border border-accent-500/10 transition-all"
            >
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={() => confirmAction('Clear inbox', 'Delete all notifications in your inbox? This cannot be undone.', clearNotifications)}
              className="text-xs font-bold text-neutral-400 hover:text-red-400 flex items-center gap-2 px-4 py-2 rounded-lg border border-raised hover:border-red-500/30 transition-all"
            >
              <Trash2 size={14} /> Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="relative z-10 px-8 py-2 border-b border-raised bg-panel">
        <div className="flex items-center gap-6">
          {['all', 'unread'].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`text-xs font-bold py-4 uppercase tracking-widest border-b-2 transition-all ${
                filter === t
                  ? 'border-accent-500 text-white'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {t}
              {t === 'unread' && unreadCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-accent-600 text-[10px] rounded-full text-white">
                  {unreadCount}
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
                <div className="w-20 h-20 bg-card rounded-full flex items-center justify-center border border-raised mb-4 shadow-2xl">
                   <Clock size={32} className="text-neutral-700" />
                </div>
                <h3 className="text-neutral-300 font-bold text-lg">All caught up!</h3>
                <p className="text-neutral-500 text-sm mt-1">No {filter} notifications to show.</p>
              </div>
            ) : (
              filteredNotifications.map(notif => (
                <div
                  key={notif.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleNotificationClick(notif)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) handleNotificationClick(notif) }}
                  className={`group relative p-5 rounded-2xl border transition-all cursor-pointer flex items-center gap-5 ${
                    !notif.read
                      ? 'bg-card border-accent-500/30 shadow-lg'
                      : 'bg-panel/40 border-raised opacity-70 hover:opacity-100 hover:bg-card'
                  }`}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notif.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-accent-400 uppercase tracking-tighter">
                        {notif.senderName}
                      </span>
                      {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-accent-500"></span>}
                    </div>
                    <p className={`text-sm leading-relaxed ${!notif.read ? 'text-white font-medium' : 'text-neutral-400'}`}>
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                       <span className="text-[10px] text-neutral-600 flex items-center gap-1 font-bold">
                          <Clock size={10} /> {timeAgo(notif.createdAt)}
                       </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                    {notif.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          markNotificationAsUnread(notif.id)
                        }}
                        className="p-2 bg-raised hover:bg-accent-600 text-neutral-400 hover:text-white rounded-lg transition-all"
                        title="Mark as unread"
                        aria-label="Mark as unread"
                      >
                        <EyeOff size={16} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNotification(notif.id)
                      }}
                      className="p-2 bg-raised hover:bg-red-500/20 text-neutral-400 hover:text-red-400 rounded-lg transition-all"
                      title="Delete"
                      aria-label="Delete notification"
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
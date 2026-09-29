import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProject } from '../context/ProjectContext'
import {
  Search, Settings, HelpCircle, Bell, LogOut,
  MessageSquare, UserCircle, Check, BookOpen, Keyboard, ShieldAlert,
  CheckSquare, LayoutGrid, Folder, User, X, AlarmClock, LifeBuoy
} from 'lucide-react'
import { REPO_URL } from './landing/siteMap'
import { timeAgo } from '../utils/dates'
import { openNotification } from '../utils/notifications'

export default function Topbar() {
  const navigate = useNavigate()
  const { logout, currentUser } = useAuth()

  const {
    tasks,
    projects,
    spaces,
    members,
    toggleSpaceExpanded,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    openTaskDrawer,
    showToast,
    contactAdmins
  } = useProject()

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [contactText, setContactText] = useState('')
  const [contactSending, setContactSending] = useState(false)

  const searchRef = useRef(null)
  const searchInputRef = useRef(null)
  const notificationsRef = useRef(null)
  const profileRef = useRef(null)
  const helpRef = useRef(null)

  const unreadCount = notifications.filter(n => !n.read).length
  const userInitials = currentUser?.displayName
    ? currentUser.displayName.charAt(0).toUpperCase()
    : (currentUser?.email?.charAt(0).toUpperCase() || 'U')

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []

    const query = searchQuery.toLowerCase()

    const taskResults = tasks.filter(t =>
      (t.title && t.title.toLowerCase().includes(query)) ||
      (t.description && t.description.toLowerCase().includes(query))
    ).map(t => ({ ...t, searchType: 'task' }))

    const projectResults = projects.filter(p =>
      p.name && p.name.toLowerCase().includes(query)
    ).map(p => ({ ...p, searchType: 'project' }))

    const spaceResults = spaces.filter(s =>
      s.name && s.name.toLowerCase().includes(query)
    ).map(s => ({ ...s, searchType: 'space' }))

    const memberResults = members.filter(m =>
      (m.name && m.name.toLowerCase().includes(query)) ||
      (m.email && m.email.toLowerCase().includes(query)) ||
      (m.role && m.role.toLowerCase().includes(query))
    ).map(m => ({ ...m, searchType: 'member' }))

    return [...taskResults, ...projectResults, ...spaceResults, ...memberResults]
  }, [searchQuery, tasks, projects, spaces, members])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false)
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) setNotificationsOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
      if (helpRef.current && !helpRef.current.contains(e.target)) setHelpOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
        setTimeout(() => {
          searchInputRef.current?.focus()
        }, 10)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setNotificationsOpen(false)
        setProfileOpen(false)
        setHelpOpen(false)
        setShowShortcuts(false)
        setShowContact(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSearchResultSelect = (item) => {
    setSearchOpen(false)
    setSearchQuery('')

    if (item.searchType === 'task') {
      openTaskDrawer(item)
    } else if (item.searchType === 'project') {
      navigate(`/dashboard/list/${item.id}`)
    } else if (item.searchType === 'space') {
      if (!item.isExpanded && toggleSpaceExpanded) {
        toggleSpaceExpanded(item.id)
      }
      const spaceProjects = projects.filter(p => p.spaceId === item.id)
      if (spaceProjects.length > 0) {
        navigate(`/dashboard/list/${spaceProjects[0].id}`)
      } else {
        navigate('/dashboard')
      }
    } else if (item.searchType === 'member') {
      navigate(`/dashboard/messages/${item.id}`)
    }
  }

  const groupedResults = {
    Tasks: searchResults.filter(r => r.searchType === 'task'),
    Projects: searchResults.filter(r => r.searchType === 'project'),
    Spaces: searchResults.filter(r => r.searchType === 'space'),
    Members: searchResults.filter(r => r.searchType === 'member')
  }

  const handleNotificationClick = (notification) => {
    if (!notification.read) markNotificationAsRead(notification.id)
    setNotificationsOpen(false)
    openNotification(notification, { navigate, tasks, openTaskDrawer, showToast })
  }

  const handleContactSubmit = async (e) => {
    e.preventDefault()
    if (!contactText.trim()) return
    setContactSending(true)
    const sent = await contactAdmins(contactText.trim())
    setContactSending(false)
    if (sent) {
      setContactText('')
      setShowContact(false)
    }
  }

  return (
    <header className="h-16 bg-card border-b border-raised flex items-center justify-between px-6 flex-shrink-0 z-40 relative">
      <div className="w-1/3 hidden md:block"></div>

      <div className="w-full md:w-1/3 flex justify-center relative" ref={searchRef}>
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search size={16} className="text-neutral-500" />
          </div>
          <input
            ref={searchInputRef}
            type="search"
            aria-label="Search tasks, projects, spaces and people"
            onClick={() => setSearchOpen(true)}
            onFocus={() => setSearchOpen(true)}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchResults[0]) handleSearchResultSelect(searchResults[0])
            }}
            className="w-full bg-base text-neutral-200 text-sm rounded-lg py-2 pl-10 pr-16 focus:outline-none focus:ring-1 focus:ring-accent-500 border border-edge focus:border-accent-500/50 placeholder-neutral-600 transition-all"
            placeholder="Search tasks, projects, people…"
          />
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
            <span className="text-[10px] text-neutral-500 border border-neutral-700 rounded px-1.5 py-0.5 bg-card">Ctrl K</span>
          </div>

          {searchOpen && searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-raised rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto custom-scrollbar">
              {searchResults.length > 0 ? (
                <div className="py-2">
                  {Object.entries(groupedResults).map(([groupName, items]) => {
                    if (items.length === 0) return null;
                    return (
                      <div key={groupName} className="mb-2 last:mb-0">
                        <div className="px-4 py-1.5 text-[10px] font-bold text-neutral-500 uppercase tracking-widest bg-panel border-y border-raised/50">
                          {groupName}
                        </div>
                        {items.map(item => (
                          <button
                            type="button"
                            key={`${item.searchType}-${item.id}`}
                            onClick={() => handleSearchResultSelect(item)}
                            className="w-full text-left px-4 py-2 hover:bg-raised focus:bg-raised focus:outline-none cursor-pointer flex items-center justify-between group transition-colors"
                          >
                            <div className="flex items-center flex-1 min-w-0 mr-4">
                              <div className="text-neutral-500 mr-3 group-hover:text-accent-400 transition-colors">
                                {item.searchType === 'task' && <CheckSquare size={14} />}
                                {item.searchType === 'project' && <LayoutGrid size={14} />}
                                {item.searchType === 'space' && <Folder size={14} />}
                                {item.searchType === 'member' && <User size={14} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-neutral-200 group-hover:text-white truncate">
                                  {item.searchType === 'task' ? item.title : item.name}
                                </p>
                                {item.searchType === 'member' && (
                                  <p className="text-[10px] text-neutral-500 truncate mt-0.5">{item.email}</p>
                                )}
                              </div>
                            </div>

                            {item.searchType === 'task' && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide flex-shrink-0 ${item.status === 'COMPLETE' ? 'bg-green-500/20 text-green-400' :
                                item.status === 'IN PROGRESS' ? 'bg-ember-500/20 text-ember-400' :
                                  'bg-neutral-500/20 text-neutral-400'
                                }`}>
                                {item.status}
                              </span>
                            )}
                            {item.searchType === 'member' && item.role && (
                              <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded capitalize flex-shrink-0">
                                {item.role}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-neutral-500 text-sm">
                  No results found matching "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="w-1/3 flex items-center justify-end gap-4">

        <div className="relative" ref={helpRef}>
          <button
            onClick={() => setHelpOpen(!helpOpen)}
            aria-label="Help and support"
            aria-expanded={helpOpen}
            className={`p-2 rounded-full transition-colors hidden sm:block ${helpOpen ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
          >
            <HelpCircle size={20} />
          </button>

          {helpOpen && (
            <div className="absolute right-0 top-full mt-3 w-56 bg-card border border-raised rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-3 border-b border-raised bg-panel">
                <p className="text-sm font-bold text-white">Help & Support</p>
              </div>
              <div className="p-1">
                <a
                  href={`${REPO_URL}#readme`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setHelpOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-300 hover:bg-raised hover:text-white rounded-lg transition-colors"
                >
                  <BookOpen size={16} /> Documentation
                </a>
                <button
                  onClick={() => { setHelpOpen(false); setShowShortcuts(true); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-300 hover:bg-raised hover:text-white rounded-lg transition-colors"
                >
                  <Keyboard size={16} /> Keyboard Shortcuts
                </button>
              </div>
              <div className="p-1 border-t border-raised">
                <button
                  onClick={() => { setHelpOpen(false); setShowContact(true); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-accent-400 hover:bg-accent-500/10 hover:text-accent-300 rounded-lg transition-colors"
                >
                  <ShieldAlert size={16} /> Contact Admin
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            aria-expanded={notificationsOpen}
            className={`relative p-2 rounded-full transition-colors ${notificationsOpen ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-card rounded-full"></span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-3 w-80 sm:w-96 bg-card border border-raised rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-3 border-b border-raised flex items-center justify-between bg-panel">
                <h3 className="text-sm font-bold text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsAsRead}
                    className="text-xs text-accent-400 hover:text-accent-300 font-medium flex items-center gap-1"
                  >
                    <Check size={12} /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {notifications.length > 0 ? (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-4 border-b border-raised hover:bg-raised/50 cursor-pointer flex gap-3 transition-colors ${!notif.read ? 'bg-accent-500/5' : ''}`}
                    >
                      <div className="flex-shrink-0 mt-1">
                        {notif.type === 'message' ? (
                          <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                            <MessageSquare size={14} />
                          </div>
                        ) : notif.type === 'mention' ? (
                          <div className="w-8 h-8 rounded-full bg-ember-500/20 text-ember-400 flex items-center justify-center border border-ember-500/30">
                            <MessageSquare size={14} />
                          </div>
                        ) : notif.type === 'reminder' ? (
                          <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
                            <AlarmClock size={14} />
                          </div>
                        ) : notif.type === 'support' ? (
                          <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
                            <LifeBuoy size={14} />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center border border-green-500/30">
                            <UserCircle size={16} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-neutral-200 leading-snug">
                          <span className="font-semibold text-white">{notif.senderName}</span> {notif.message}
                        </p>
                        <p className="text-xs text-neutral-500 mt-1.5 flex items-center gap-1">
                          {timeAgo(notif.createdAt)}
                        </p>
                      </div>
                      {!notif.read && (
                        <div className="w-2 h-2 rounded-full bg-accent-500 mt-1.5"></div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-neutral-500">
                    <Bell size={32} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm">You're all caught up!</p>
                  </div>
                )}
              </div>
              <button
                onClick={() => { setNotificationsOpen(false); navigate('/dashboard/inbox') }}
                className="w-full px-4 py-2.5 text-xs font-medium text-accent-400 hover:bg-raised border-t border-raised transition-colors"
              >
                Open Inbox
              </button>
            </div>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            aria-label="Account menu"
            aria-expanded={profileOpen}
            className="flex items-center gap-2 rounded-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
          >
            <div className="w-8 h-8 bg-accent-500/15 ring-1 ring-inset ring-accent-400/25 rounded-full flex items-center justify-center text-xs font-bold text-accent-200 group-hover:ring-accent-300/50 transition-colors">
              {userInitials}
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-3 w-56 bg-card border border-raised rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-3 border-b border-raised bg-panel">
                <p className="text-sm font-medium text-white truncate">{currentUser?.displayName || 'User'}</p>
                <p className="text-xs text-neutral-500 truncate">{currentUser?.email}</p>
              </div>

              <div className="p-1">
                <button
                  onClick={() => {
                    navigate('/dashboard/settings')
                    setProfileOpen(false)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-300 hover:bg-raised hover:text-white rounded-lg transition-colors"
                >
                  <Settings size={16} /> Settings
                </button>
              </div>

              <div className="p-1 border-t border-raised">
                <button
                  onClick={async () => {
                    try {
                      await logout()
                      navigate('/login')
                    } catch (e) { console.error(e) }
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowShortcuts(false)}>
          <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" className="bg-card border border-raised rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 fade-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-raised">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Keyboard className="text-accent-500" /> Keyboard Shortcuts
              </h2>
              <button onClick={() => setShowShortcuts(false)} aria-label="Close" className="text-neutral-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-neutral-300">Global Search</span>
                <span className="bg-base border border-edge px-2 py-1 rounded text-sm text-neutral-400 font-mono">Ctrl + K</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-300">Submit the new-task form</span>
                <span className="bg-base border border-edge px-2 py-1 rounded text-sm text-neutral-400 font-mono">Ctrl + Enter</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-300">Close drawer, dialog or menu</span>
                <span className="bg-base border border-edge px-2 py-1 rounded text-sm text-neutral-400 font-mono">Escape</span>
              </div>
            </div>
            <div className="p-4 bg-panel border-t border-raised rounded-b-2xl flex justify-end">
              <button
                onClick={() => setShowShortcuts(false)}
                className="px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Admin Modal */}
      {showContact && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowContact(false)}>
          <form
            onSubmit={handleContactSubmit}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-admin-title"
            className="bg-card border border-raised rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 fade-in duration-200"
          >
            <div className="flex justify-between items-center p-6 border-b border-raised">
              <h2 id="contact-admin-title" className="text-xl font-bold text-white flex items-center gap-2">
                <ShieldAlert className="text-red-500" /> Contact Admin
              </h2>
              <button type="button" onClick={() => setShowContact(false)} aria-label="Close" className="text-neutral-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-neutral-400 text-sm">Need help with permissions, accounts, or unexpected errors? Your note goes to every workspace admin’s inbox.</p>
              <textarea
                value={contactText}
                onChange={(e) => setContactText(e.target.value)}
                maxLength={400}
                aria-label="Describe your issue"
                className="w-full bg-base border border-edge rounded-xl p-3 text-white focus:outline-none focus:border-accent-500 resize-none h-32 text-sm placeholder-neutral-600"
                placeholder="Describe your issue..."
                autoFocus
              ></textarea>
              <button
                type="submit"
                disabled={!contactText.trim() || contactSending}
                className="w-full bg-accent-600 hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 rounded-xl transition-colors text-sm"
              >
                {contactSending ? 'Sending…' : 'Send Message'}
              </button>
            </div>
          </form>
        </div>
      )}
    </header>
  )
}

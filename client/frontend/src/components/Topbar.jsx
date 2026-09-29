import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProject } from '../context/ProjectContext'
import {
  Settings, HelpCircle, Bell, LogOut, Menu,
  MessageSquare, UserCircle, Check, BookOpen, Keyboard, ShieldAlert,
  X, AlarmClock, LifeBuoy, Zap
} from 'lucide-react'
import { REPO_URL } from './landing/siteMap'
import { timeAgo } from '../utils/dates'
import { openNotification } from '../utils/notifications'
import { useShortcut } from '../utils/shortcuts'
import CommandPalette from './CommandPalette'
import Modal from './Modal'

const SHORTCUTS = [
  ['Search or jump anywhere', 'Ctrl + K  or  /'],
  ['New task (in a project view)', 'C'],
  ['Submit the new-task form', 'Ctrl + Enter'],
  ['Move a board card', 'Status menu on the card'],
  ['Close drawer, dialog or menu', 'Esc'],
  ['Show this list', '?'],
]

const NOTIF_ICON = {
  message: { icon: MessageSquare, cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  mention: { icon: MessageSquare, cls: 'bg-ember-500/20 text-ember-400 border-ember-500/30' },
  reminder: { icon: AlarmClock, cls: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
  support: { icon: LifeBuoy, cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
  system: { icon: Zap, cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
}

export default function Topbar({ onOpenNav = () => {} }) {
  const navigate = useNavigate()
  const { logout, currentUser } = useAuth()
  const {
    tasks, notifications, markNotificationAsRead, markAllNotificationsAsRead,
    openTaskDrawer, showToast, contactAdmins
  } = useProject()

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [contactText, setContactText] = useState('')
  const [contactSending, setContactSending] = useState(false)

  const notificationsRef = useRef(null)
  const profileRef = useRef(null)
  const helpRef = useRef(null)

  const unreadCount = notifications.filter(n => !n.read).length
  const userInitials = currentUser?.displayName
    ? currentUser.displayName.charAt(0).toUpperCase()
    : (currentUser?.email?.charAt(0).toUpperCase() || 'U')

  useShortcut('show-shortcuts', useCallback(() => setShowShortcuts(true), []))

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) setNotificationsOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
      if (helpRef.current && !helpRef.current.contains(e.target)) setHelpOpen(false)
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setNotificationsOpen(false)
        setProfileOpen(false)
        setHelpOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

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

  const menuItemCls = 'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-300 hover:bg-raised hover:text-white rounded-lg transition-colors'

  return (
    <header className="h-16 bg-card border-b border-raised flex items-center gap-3 px-3 sm:px-6 flex-shrink-0 z-40 relative">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="lg:hidden p-2 -ml-1 rounded-lg text-neutral-300 hover:text-white hover:bg-raised"
      >
        <Menu size={20} />
      </button>

      <div className="flex-1 flex justify-center min-w-0">
        <CommandPalette />
      </div>

      <div className="flex items-center justify-end gap-1 sm:gap-2">
        <div className="relative hidden sm:block" ref={helpRef}>
          <button
            onClick={() => setHelpOpen(!helpOpen)}
            aria-label="Help and support"
            aria-expanded={helpOpen}
            aria-haspopup="menu"
            className={`p-2 rounded-full transition-colors ${helpOpen ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
          >
            <HelpCircle size={20} />
          </button>

          {helpOpen && (
            <div role="menu" className="absolute right-0 top-full mt-3 w-60 bg-card border border-raised rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-3 border-b border-raised bg-panel">
                <p className="text-sm font-bold text-white">Help & Support</p>
              </div>
              <div className="p-1">
                <a role="menuitem" href={`${REPO_URL}#readme`} target="_blank" rel="noreferrer" onClick={() => setHelpOpen(false)} className={menuItemCls}>
                  <BookOpen size={16} /> Documentation
                </a>
                <button role="menuitem" onClick={() => { setHelpOpen(false); setShowShortcuts(true) }} className={menuItemCls}>
                  <Keyboard size={16} /> Keyboard Shortcuts <kbd className="ml-auto text-[11px] text-neutral-400 font-sans">?</kbd>
                </button>
              </div>
              <div className="p-1 border-t border-raised">
                <button
                  role="menuitem"
                  onClick={() => { setHelpOpen(false); setShowContact(true) }}
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
              <span aria-hidden="true" className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-red-500 border-2 border-card rounded-full text-[11px] leading-[14px] font-bold text-white text-center tabular-nums">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto sm:right-0 top-[4.25rem] sm:top-full sm:mt-3 sm:w-96 bg-card border border-raised rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-3 border-b border-raised flex items-center justify-between bg-panel">
                <h3 className="text-sm font-bold text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllNotificationsAsRead} className="text-xs text-accent-400 hover:text-accent-300 font-medium flex items-center gap-1">
                    <Check size={12} /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-[min(400px,60dvh)] overflow-y-auto custom-scrollbar">
                {notifications.length > 0 ? (
                  notifications.slice(0, 20).map(notif => {
                    const style = NOTIF_ICON[notif.type] || { icon: UserCircle, cls: 'bg-green-500/20 text-green-400 border-green-500/30' }
                    const Icon = style.icon
                    return (
                      <button
                        type="button"
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`w-full text-left p-4 border-b border-raised hover:bg-raised/50 flex gap-3 transition-colors ${!notif.read ? 'bg-accent-500/5' : ''}`}
                      >
                        <div className={`flex-shrink-0 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center border ${style.cls}`}>
                          <Icon size={14} aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-neutral-200 leading-snug break-words">
                            <span className="font-semibold text-white">{notif.senderName}</span> {notif.message}
                          </p>
                          <p className="text-xs text-neutral-400 mt-1.5">{timeAgo(notif.createdAt)}</p>
                        </div>
                        {!notif.read && <span className="w-2 h-2 rounded-full bg-accent-500 mt-1.5 flex-shrink-0" aria-label="Unread" />}
                      </button>
                    )
                  })
                ) : (
                  <div className="p-12 text-center text-neutral-400">
                    <Bell size={32} className="mx-auto mb-3 opacity-30" aria-hidden="true" />
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
            aria-haspopup="menu"
            className="flex items-center gap-2 rounded-full group ml-1"
          >
            <div className="w-8 h-8 bg-accent-500/15 ring-1 ring-inset ring-accent-400/25 rounded-full flex items-center justify-center text-xs font-bold text-accent-200 group-hover:ring-accent-300/50 transition-colors">
              {userInitials}
            </div>
          </button>

          {profileOpen && (
            <div role="menu" className="absolute right-0 top-full mt-3 w-56 bg-card border border-raised rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-3 border-b border-raised bg-panel">
                <p className="text-sm font-medium text-white truncate">{currentUser?.displayName || 'User'}</p>
                <p className="text-xs text-neutral-400 truncate">{currentUser?.email}</p>
              </div>
              <div className="p-1">
                <button role="menuitem" onClick={() => { navigate('/dashboard/settings'); setProfileOpen(false) }} className={menuItemCls}>
                  <Settings size={16} /> Settings
                </button>
                <button role="menuitem" onClick={() => { setProfileOpen(false); setShowShortcuts(true) }} className={`${menuItemCls} sm:hidden`}>
                  <HelpCircle size={16} /> Help & shortcuts
                </button>
              </div>
              {/* Destructive action kept apart from normal items */}
              <div className="p-1 border-t border-raised">
                <button
                  role="menuitem"
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

      {showShortcuts && (
        <Modal onClose={() => setShowShortcuts(false)} labelledBy="shortcuts-title" className="max-w-md bg-card border border-raised rounded-2xl shadow-2xl">
          <div className="flex justify-between items-center p-6 border-b border-raised">
            <h2 id="shortcuts-title" className="text-xl font-bold text-white flex items-center gap-2">
              <Keyboard className="text-accent-500" aria-hidden="true" /> Keyboard Shortcuts
            </h2>
            <button onClick={() => setShowShortcuts(false)} aria-label="Close" className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-raised transition-colors"><X size={20} /></button>
          </div>
          <dl className="p-6 space-y-4">
            {SHORTCUTS.map(([label, keys]) => (
              <div key={label} className="flex justify-between items-center gap-4">
                <dt className="text-neutral-300 text-sm">{label}</dt>
                <dd><kbd className="bg-base border border-edge px-2 py-1 rounded text-xs text-neutral-300 font-mono whitespace-pre">{keys}</kbd></dd>
              </div>
            ))}
          </dl>
          <div className="p-4 bg-panel border-t border-raised rounded-b-2xl flex justify-end">
            <button onClick={() => setShowShortcuts(false)} className="px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-lg transition-colors text-sm font-medium">
              Got it
            </button>
          </div>
        </Modal>
      )}

      {showContact && (
        <Modal
          as="form"
          onSubmit={handleContactSubmit}
          onClose={() => setShowContact(false)}
          labelledBy="contact-admin-title"
          className="max-w-md bg-card border border-raised rounded-2xl shadow-2xl"
        >
          <div className="flex justify-between items-center p-6 border-b border-raised">
            <h2 id="contact-admin-title" className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className="text-red-500" aria-hidden="true" /> Contact Admin
            </h2>
            <button type="button" onClick={() => setShowContact(false)} aria-label="Close" className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-raised transition-colors"><X size={20} /></button>
          </div>
          <div className="p-6 space-y-4">
            <label htmlFor="contact-text" className="block text-neutral-300 text-sm">Need help with permissions, accounts, or unexpected errors? Your note goes to every workspace admin’s inbox.</label>
            <textarea
              id="contact-text"
              value={contactText}
              onChange={(e) => setContactText(e.target.value)}
              maxLength={400}
              className="w-full bg-base border border-edge rounded-xl p-3 text-white focus:outline-none focus:border-accent-500 resize-none h-32 text-sm placeholder-neutral-500"
              placeholder="Describe your issue..."
              autoFocus
            />
            <p className="text-xs text-neutral-400 text-right tabular-nums">{contactText.length}/400</p>
            <button
              type="submit"
              disabled={!contactText.trim() || contactSending}
              className="w-full bg-accent-600 hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
            >
              {contactSending ? 'Sending…' : 'Send Message'}
            </button>
          </div>
        </Modal>
      )}
    </header>
  )
}

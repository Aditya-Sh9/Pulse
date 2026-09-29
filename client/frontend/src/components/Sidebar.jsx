import React, { useState, useRef, useEffect } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { useAuth } from '../context/AuthContext'
import UserProfileModal from '../components/UserProfileModal'
import {
  Home, Inbox, CheckCircle, Plus, MessageSquare,
  ChevronRight, ChevronDown, LayoutGrid, Folder, Star, Trash2, Trophy, Settings, Users, Activity, UserCircle
} from 'lucide-react'

gsap.registerPlugin(useGSAP)

function NavItem({ icon: Icon, label, path, badge, isActive, onNavigate }) {
  // `badge` is a count; hide it when zero
  return (
    <button
      type="button"
      data-nav-item
      aria-current={isActive ? 'page' : undefined}
      onClick={() => onNavigate(path)}
      className={`relative z-10 flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 mb-0.5
      ${isActive ? 'text-neutral-50' : 'text-neutral-400 hover:text-neutral-100'}`}
    >
      <Icon size={16} aria-hidden="true" className={`transition-colors duration-200 ${isActive ? 'text-accent-400' : ''}`} />
      <span className="flex-1 text-left">{label}</span>
      {badge > 0 && <span className="bg-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full text-white">{badge > 99 ? '99+' : badge}</span>}
    </button>
  )
}

// Primary nav with a hover pill that glides between items and an active bar
// that slides to the current page (pattern adapted from 21st.dev "Animated Sidebar").
function PrimaryNav({ children, pathname }) {
  const root = useRef(null)
  const pill = useRef(null)
  const bar = useRef(null)
  const activeBg = useRef(null)

  const moveTo = (target, el, vars = {}) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    gsap.to(target, {
      y: el.offsetTop, height: el.offsetHeight, autoAlpha: 1,
      duration: reduce ? 0 : 0.42, ease: 'expo.out', overwrite: 'auto', ...vars,
    })
  }

  useGSAP(() => {
    const active = root.current.querySelector('[data-nav-item][aria-current="page"]')
    if (active) {
      const first = gsap.getProperty(bar.current, 'autoAlpha') === 0
      moveTo([bar.current, activeBg.current], active, first ? { duration: 0 } : {})
    } else {
      gsap.to([bar.current, activeBg.current], { autoAlpha: 0, duration: 0.2 })
    }
  }, { dependencies: [pathname], scope: root })

  const onOver = (e) => {
    const item = e.target.closest('[data-nav-item]')
    if (!item || item.getAttribute('aria-current') === 'page') {
      gsap.to(pill.current, { autoAlpha: 0, duration: 0.18, overwrite: 'auto' })
      return
    }
    const hidden = gsap.getProperty(pill.current, 'autoAlpha') === 0
    if (hidden) gsap.set(pill.current, { y: item.offsetTop, height: item.offsetHeight })
    moveTo(pill.current, item)
  }

  return (
    <div
      ref={root}
      className="relative mb-6"
      onMouseOver={onOver}
      onMouseLeave={() => gsap.to(pill.current, { autoAlpha: 0, duration: 0.2, overwrite: 'auto' })}
    >
      <span ref={activeBg} aria-hidden="true" className="pointer-events-none invisible absolute inset-x-0 top-0 rounded-lg bg-raised opacity-0" />
      <span ref={pill} aria-hidden="true" className="pointer-events-none invisible absolute inset-x-0 top-0 rounded-lg bg-white/[0.04] opacity-0" />
      <span ref={bar} aria-hidden="true" className="pointer-events-none invisible absolute -left-3 top-0 z-20 w-[3px] rounded-r-full bg-accent-400 opacity-0" />
      {children}
    </div>
  )
}

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { spaces, projects, members, notifications, toggleSpaceExpanded, toggleProjectFavorite, addProject, deleteProject, addSpace, deleteSpace, confirmAction } = useProject()

  const unreadInbox = notifications.filter(n => !n.read && n.type !== 'message').length
  const unreadMessages = notifications.filter(n => !n.read && n.type === 'message').length

  const { userRole, currentUser } = useAuth()
  const myProfile = members.find(m => m.id === currentUser?.uid)

  const [activeSpaceInput, setActiveSpaceInput] = useState(null)
  const [newProjectName, setNewProjectName] = useState('')

  const [showNewSpaceInput, setShowNewSpaceInput] = useState(false)
  const [newSpaceName, setNewSpaceName] = useState('')

  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const workspaceRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (workspaceRef.current && !workspaceRef.current.contains(e.target)) {
        setWorkspaceOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getUserInitials = () => {
    if (currentUser?.displayName) {
      return currentUser.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    }
    return currentUser?.email?.slice(0, 2).toUpperCase() || 'ME'
  }

  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'My Space'

  const handleAddProject = (spaceId) => {
    if (newProjectName.trim()) {
      addProject({
        name: newProjectName.trim(),
        spaceId: spaceId || spaces[0]?.id || '',
        icon: 'square'
      })
      setNewProjectName('')
      setActiveSpaceInput(null)
    }
  }

  const handleAddSpace = () => {
    if (newSpaceName.trim()) {
      addSpace(newSpaceName.trim())
      setNewSpaceName('')
      setShowNewSpaceInput(false)
    }
  }

  const favorites = projects.filter(p => p.isFavorite)
  // /dashboard/<view>/<projectId>: highlight the project in every view, not just List
  const [, , viewSegment, activeProjectId] = location.pathname.split('/')
  const onProjectView = ['list', 'board', 'calendar', 'table'].includes(viewSegment)
  const openProject = (id) => navigate(`/dashboard/${onProjectView ? viewSegment : 'list'}/${id}`)

  return (
    <aside className="w-[248px] bg-panel border-r border-raised flex flex-col h-full flex-shrink-0 relative">
      <div className="h-16 flex items-center px-3 border-b border-raised relative" ref={workspaceRef}>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={workspaceOpen}
          onClick={() => setWorkspaceOpen(!workspaceOpen)}
          className="flex items-center gap-2.5 w-full text-left cursor-pointer hover:bg-raised px-2 py-1.5 rounded-lg transition-colors duration-200"
        >
          <div className="w-7 h-7 rounded-md bg-accent-500/15 ring-1 ring-inset ring-accent-400/25 flex items-center justify-center text-[11px] font-semibold text-accent-300">
            {getUserInitials()}
          </div>
          <span className="text-sm font-semibold text-neutral-200 flex-1 truncate">{displayName}</span>
          <ChevronDown size={14} className={`text-neutral-500 flex-shrink-0 transition-transform duration-300 ${workspaceOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Workspace Dropdown */}
        {workspaceOpen && (
          <div className="absolute top-14 left-3 right-3 bg-card border border-edge rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1">
            <div className="p-1" role="menu">
              <button
                role="menuitem"
                onClick={() => { setWorkspaceOpen(false); setSelectedUser(myProfile || currentUser) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-300 hover:bg-raised hover:text-white rounded-lg transition-colors"
              >
                <UserCircle size={14} /> View my profile
              </button>
              <button
                role="menuitem"
                onClick={() => { setWorkspaceOpen(false); navigate('/dashboard/settings'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-300 hover:bg-raised hover:text-white rounded-lg transition-colors"
              >
                <Settings size={14} /> Account Settings
              </button>
              <button
                role="menuitem"
                onClick={() => { setWorkspaceOpen(false); navigate('/dashboard/team'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-300 hover:bg-raised hover:text-white rounded-lg transition-colors"
              >
                <Users size={14} /> {userRole === 'admin' ? 'Manage Team' : 'Team Directory'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        <PrimaryNav pathname={location.pathname}>
          <NavItem icon={Home} label="Home" path="/dashboard" isActive={location.pathname === '/dashboard'} onNavigate={navigate} />
          <NavItem icon={Inbox} label="Inbox" path="/dashboard/inbox" badge={unreadInbox} isActive={location.pathname === '/dashboard/inbox'} onNavigate={navigate} />
          <NavItem icon={MessageSquare} label="Messages" path="/dashboard/messages" badge={unreadMessages} isActive={location.pathname.startsWith('/dashboard/messages')} onNavigate={navigate} />
          <NavItem icon={Users} label="Team" path="/dashboard/team" isActive={location.pathname === '/dashboard/team'} onNavigate={navigate} />
          <NavItem icon={Trophy} label="Leaderboard" path="/dashboard/leaderboard" isActive={location.pathname === '/dashboard/leaderboard'} onNavigate={navigate} />
          <NavItem icon={CheckCircle} label="My Tasks" path="/dashboard/my-tasks" isActive={location.pathname === '/dashboard/my-tasks'} onNavigate={navigate} />
        </PrimaryNav>

        {favorites.length > 0 && (
          <>
            <div className="mb-2 px-3 text-neutral-500">
              <span className="text-xs font-semibold uppercase tracking-[0.08em]">Favorites</span>
            </div>

            <div className="mb-4 space-y-1">
              {favorites.map(project => (
                <div
                  key={project.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer group relative text-sm
                    ${activeProjectId === project.id ? 'bg-raised text-neutral-50' : 'text-neutral-300 hover:bg-raised'}`}
                  onClick={() => openProject(project.id)}
                >
                  <LayoutGrid size={14} className="opacity-70" />
                  <span className="flex-1 truncate">{project.name}</span>
                  <button
                    aria-label={`Remove ${project.name} from favorites`}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleProjectFavorite(project.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  >
                    <Star size={14} className="text-yellow-500 fill-yellow-500" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <div>
          <div className="px-3 flex items-center justify-between text-neutral-500 mb-2 group">
            <span className="text-xs font-semibold uppercase tracking-[0.08em]">Spaces</span>
            {userRole === 'admin' && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowNewSpaceInput(true); }}
                className="hover:text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                title="Add new space"
                aria-label="Add new space"
              >
                <Plus size={14} />
              </button>
            )}
          </div>

          {showNewSpaceInput && (
            <div className="flex items-center gap-2 px-3 py-1.5 mb-1">
              <Folder size={14} className="text-neutral-400 flex-shrink-0" />
              <input
                autoFocus
                value={newSpaceName}
                onChange={(e) => setNewSpaceName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSpace()
                  if (e.key === 'Escape') {
                    setShowNewSpaceInput(false)
                    setNewSpaceName('')
                  }
                }}
                onBlur={handleAddSpace}
                placeholder="Space name..."
                className="flex-1 bg-raised text-white text-sm px-2 py-0.5 rounded-md border border-accent-500/60 focus:outline-none"
              />
            </div>
          )}

          <div className="space-y-1">
            {spaces.map(space => (
              <div key={space.id}>
                <div
                  className="flex items-center gap-2 px-3 py-1.5 text-neutral-300 hover:bg-raised rounded-md cursor-pointer group"
                  onClick={() => toggleSpaceExpanded(space.id)}
                >
                  <div className="flex-[1] flex items-center gap-2 truncate">
                    <div className={`transition-transform duration-200 ${space.isExpanded ? 'rotate-90' : ''}`}>
                      <ChevronRight size={12} />
                    </div>
                    <div className="w-5 h-5 rounded-md bg-raised ring-1 ring-inset ring-edge flex items-center justify-center text-neutral-400 flex-shrink-0">
                      <Folder size={12} />
                    </div>
                    <span className="text-sm truncate">{space.name}</span>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex items-center gap-1.5 flex-shrink-0 transition-opacity">
                    {userRole === 'admin' && (
                      <button
                        aria-label={`Delete space ${space.name}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          confirmAction(
                            'Delete Space',
                            `Delete "${space.name}"? Every project in this space and all of their tasks will be permanently deleted.`,
                            async () => {
                              await deleteSpace(space.id)
                            },
                            'danger'
                          )
                        }}
                      >
                        <Trash2 size={14} className="text-neutral-500 hover:text-red-500 transition-colors" />
                      </button>
                    )}
                  </div>
                </div>

                {space.isExpanded && (
                  <div className="pl-9 mt-1 space-y-0.5">
                    {projects
                      .filter(p => p.spaceId === space.id)
                      .map(project => (
                        <div
                          key={project.id}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer group border-l-2 transition-colors
                           ${activeProjectId === project.id
                              ? 'bg-raised text-neutral-50 border-accent-400'
                              : 'text-neutral-300 hover:bg-raised border-transparent'}`}
                          onClick={() => openProject(project.id)}
                        >
                          <LayoutGrid size={14} className="opacity-70 flex-shrink-0" />
                          <span className="flex-1 truncate">{project.name}</span>

                          <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1.5">
                            <button
                              aria-label={project.isFavorite ? `Remove ${project.name} from favorites` : `Add ${project.name} to favorites`}
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleProjectFavorite(project.id)
                              }}
                            >
                              <Star
                                size={14}
                                className={project.isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-neutral-500 hover:text-yellow-500 transition-colors'}
                              />
                            </button>

                            {userRole === 'admin' && (
                              <button
                                aria-label={`Delete project ${project.name}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  confirmAction(
                                    'Delete Project',
                                    `Delete "${project.name}" and all of its tasks? This action cannot be undone.`,
                                    async () => {
                                      const deleted = await deleteProject(project.id)
                                      if (deleted && activeProjectId === project.id) {
                                        navigate('/dashboard')
                                      }
                                    },
                                    'danger'
                                  )
                                }}
                              >
                                <Trash2 size={14} className="text-neutral-500 hover:text-red-500 transition-colors" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                    {activeSpaceInput === space.id && userRole === 'admin' && (
                      <div className="flex items-center gap-2 px-2 py-1.5">
                        <LayoutGrid size={14} className="text-neutral-500 flex-shrink-0" />
                        <input
                          autoFocus
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddProject(space.id)
                            if (e.key === 'Escape') {
                              setActiveSpaceInput(null)
                              setNewProjectName('')
                            }
                          }}
                          onBlur={() => handleAddProject(space.id)}
                          placeholder="New project..."
                          className="flex-1 bg-raised text-white text-sm px-2 py-0.5 rounded-md border border-accent-500/60 focus:outline-none"
                        />
                      </div>
                    )}

                    {projects.filter(p => p.spaceId === space.id).length === 0 && userRole !== 'admin' && (
                      <p className="px-2 py-1.5 text-xs text-neutral-600">No projects yet</p>
                    )}

                    {activeSpaceInput !== space.id && userRole === 'admin' && (
                      <button
                        onClick={() => setActiveSpaceInput(space.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-neutral-500 hover:text-neutral-300 hover:bg-raised rounded-md text-sm transition-colors"
                      >
                        <Plus size={14} />
                        <span>New Project</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-raised">
        <div className="space-y-1">
          {userRole === 'admin' && (
            <button
              onClick={() => navigate('/dashboard/activity')}
              className="w-full flex items-center justify-start gap-2 px-3 py-1.5 text-sm text-neutral-400 hover:bg-raised hover:text-white rounded-md transition-colors"
            >
              <Activity size={14} /> Activity Log
            </button>
          )}
          <button
            onClick={() => navigate('/dashboard/settings')}
            className="w-full flex items-center justify-start gap-2 px-3 py-1.5 text-sm text-neutral-400 hover:bg-raised hover:text-white rounded-md transition-colors"
          >
            <Settings size={14} /> Settings
          </button>
        </div>
      </div>

      <UserProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />
    </aside>
  )
}

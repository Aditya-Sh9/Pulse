import React, { useState, useRef, useEffect } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { useAuth } from '../context/AuthContext'
import UserProfileModal from '../components/UserProfileModal'
import useFocusTrap from '../hooks/useFocusTrap'
import {
  Home, Inbox, CheckCircle, Plus, MessageSquare, X, PanelLeftClose, PanelLeftOpen,
  ChevronRight, ChevronDown, LayoutGrid, Folder, Star, Trash2, Trophy, Settings, Users, Activity, UserCircle
} from 'lucide-react'

gsap.registerPlugin(useGSAP)

function NavItem({ icon: Icon, label, path, badge, isActive, onNavigate, collapsed }) {
  // `badge` is a count; hide it when zero
  return (
    <button
      type="button"
      data-nav-item
      aria-current={isActive ? 'page' : undefined}
      aria-label={collapsed ? (badge > 0 ? `${label}, ${badge} unread` : label) : undefined}
      title={collapsed ? label : undefined}
      onClick={() => onNavigate(path)}
      className={`relative z-10 flex w-full items-center gap-3 rounded-lg text-sm font-medium transition-colors duration-200 mb-0.5 min-h-9
      ${collapsed ? 'justify-center px-0 py-2' : 'px-3 py-2'}
      ${isActive ? 'text-neutral-50' : 'text-neutral-400 hover:text-neutral-100'}`}
    >
      <Icon size={17} aria-hidden="true" className={`flex-shrink-0 transition-colors duration-200 ${isActive ? 'text-accent-400' : ''}`} />
      {!collapsed && <span className="flex-1 text-left">{label}</span>}
      {badge > 0 && (collapsed
        ? <span aria-hidden="true" className="absolute top-1.5 right-2.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-panel" />
        : <span className="bg-red-600 text-[11px] font-bold px-2 py-0.5 rounded-full text-white tabular-nums">{badge > 99 ? '99+' : badge}</span>
      )}
    </button>
  )
}

// Primary nav with a hover pill that glides between items and an active bar
// that slides to the current page (pattern adapted from 21st.dev "Animated Sidebar").
function PrimaryNav({ children, pathname, collapsed }) {
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
  }, { dependencies: [pathname, collapsed], scope: root })

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
    <nav
      ref={root}
      aria-label="Primary"
      className="relative mb-6"
      onMouseOver={onOver}
      onMouseLeave={() => gsap.to(pill.current, { autoAlpha: 0, duration: 0.2, overwrite: 'auto' })}
    >
      <span ref={activeBg} aria-hidden="true" className="pointer-events-none invisible absolute inset-x-0 top-0 rounded-lg bg-raised opacity-0" />
      <span ref={pill} aria-hidden="true" className="pointer-events-none invisible absolute inset-x-0 top-0 rounded-lg bg-white/[0.04] opacity-0" />
      <span ref={bar} aria-hidden="true" className="pointer-events-none invisible absolute -left-3 top-0 z-20 w-[3px] rounded-r-full bg-accent-400 opacity-0" />
      {children}
    </nav>
  )
}

// Desktop: static column (full or icon rail). Below lg: off-canvas drawer with backdrop.
export default function Sidebar({ mobileOpen = false, onMobileClose = () => {}, collapsed = false, onToggleCollapsed = () => {} }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { spaces, projects, members, notifications, unreadCounts, toggleSpaceExpanded, toggleProjectFavorite, addProject, deleteProject, addSpace, deleteSpace, confirmAction } = useProject()
  const { userRole, currentUser } = useAuth()

  const unreadInbox = notifications.filter(n => !n.read && n.type !== 'message').length
  const unreadMessages = Object.values(unreadCounts).reduce((sum, n) => sum + n, 0)
  const myProfile = members.find(m => m.id === currentUser?.uid)

  const [activeSpaceInput, setActiveSpaceInput] = useState(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [showNewSpaceInput, setShowNewSpaceInput] = useState(false)
  const [newSpaceName, setNewSpaceName] = useState('')
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const workspaceRef = useRef(null)
  const asideRef = useRef(null)

  // The rail only applies on desktop; the mobile drawer always shows labels
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = (e) => setIsDesktop(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  const rail = collapsed && isDesktop

  useFocusTrap(asideRef, mobileOpen && !isDesktop)

  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e) => { if (e.key === 'Escape') onMobileClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileOpen, onMobileClose])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (workspaceRef.current && !workspaceRef.current.contains(e.target)) setWorkspaceOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getUserInitials = () => {
    if (currentUser?.displayName) {
      return currentUser.displayName.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
    }
    return currentUser?.email?.slice(0, 2).toUpperCase() || 'ME'
  }

  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'My Space'

  const handleAddProject = (spaceId) => {
    if (newProjectName.trim()) {
      addProject({ name: newProjectName.trim(), spaceId: spaceId || spaces[0]?.id || '', icon: 'square' })
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

  const navItems = [
    { icon: Home, label: 'Home', path: '/dashboard', active: location.pathname === '/dashboard' },
    { icon: Inbox, label: 'Inbox', path: '/dashboard/inbox', badge: unreadInbox, active: location.pathname === '/dashboard/inbox' },
    { icon: MessageSquare, label: 'Messages', path: '/dashboard/messages', badge: unreadMessages, active: location.pathname.startsWith('/dashboard/messages') },
    { icon: Users, label: 'Team', path: '/dashboard/team', active: location.pathname === '/dashboard/team' },
    { icon: Trophy, label: 'Leaderboard', path: '/dashboard/leaderboard', active: location.pathname === '/dashboard/leaderboard' },
    { icon: CheckCircle, label: 'My Tasks', path: '/dashboard/my-tasks', active: location.pathname === '/dashboard/my-tasks' },
  ]

  const footerButton = (icon, label, path) => {
    const Icon = icon
    return (
      <button
        onClick={() => navigate(path)}
        title={rail ? label : undefined}
        aria-label={rail ? label : undefined}
        aria-current={location.pathname === path ? 'page' : undefined}
        className={`w-full flex items-center gap-2 py-2 text-sm rounded-md transition-colors min-h-9 ${rail ? 'justify-center' : 'px-3'} ${location.pathname === path ? 'bg-raised text-white' : 'text-neutral-400 hover:bg-raised hover:text-white'}`}
      >
        <Icon size={16} aria-hidden="true" /> {!rail && label}
      </button>
    )
  }

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && !isDesktop && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-200" onClick={onMobileClose} aria-hidden="true" />
      )}

      <aside
        ref={asideRef}
        aria-label="Workspace navigation"
        {...(!isDesktop ? { role: 'dialog', 'aria-modal': mobileOpen ? 'true' : undefined } : {})}
        className={`bg-panel border-r border-raised flex flex-col h-dvh flex-shrink-0
          fixed inset-y-0 left-0 z-50 w-[280px] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
          lg:static lg:translate-x-0 lg:shadow-none lg:transition-[width] ${rail ? 'lg:w-[68px]' : 'lg:w-[248px]'}`}
        inert={!isDesktop && !mobileOpen}
      >
        <div className={`h-16 flex items-center border-b border-raised relative gap-1 ${rail ? 'px-2 justify-center' : 'px-3'}`} ref={workspaceRef}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={workspaceOpen}
            aria-label={rail ? `Account menu for ${displayName}` : undefined}
            onClick={() => setWorkspaceOpen(!workspaceOpen)}
            className={`flex items-center gap-2.5 text-left cursor-pointer hover:bg-raised py-1.5 rounded-lg transition-colors duration-200 ${rail ? 'px-1.5' : 'px-2 flex-1 min-w-0'}`}
          >
            <div className="w-7 h-7 rounded-md bg-accent-500/15 ring-1 ring-inset ring-accent-400/25 flex items-center justify-center text-[11px] font-semibold text-accent-300 flex-shrink-0">
              {getUserInitials()}
            </div>
            {!rail && (
              <>
                <span className="text-sm font-semibold text-neutral-200 flex-1 truncate">{displayName}</span>
                <ChevronDown size={14} className={`text-neutral-500 flex-shrink-0 transition-transform duration-300 ${workspaceOpen ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close navigation"
            className="lg:hidden p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-raised"
          >
            <X size={18} />
          </button>

          {/* Workspace Dropdown */}
          {workspaceOpen && (
            <div className={`absolute top-14 bg-card border border-edge rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 ${rail ? 'left-2 w-56' : 'left-3 right-3'}`}>
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
                  onClick={() => { setWorkspaceOpen(false); navigate('/dashboard/settings') }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-300 hover:bg-raised hover:text-white rounded-lg transition-colors"
                >
                  <Settings size={14} /> Account Settings
                </button>
                <button
                  role="menuitem"
                  onClick={() => { setWorkspaceOpen(false); navigate('/dashboard/team') }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-300 hover:bg-raised hover:text-white rounded-lg transition-colors"
                >
                  <Users size={14} /> {userRole === 'admin' ? 'Manage Team' : 'Team Directory'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={`flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar ${rail ? 'p-2' : 'p-3'}`}>
          <PrimaryNav pathname={location.pathname} collapsed={rail}>
            {navItems.map(item => (
              <NavItem key={item.path} icon={item.icon} label={item.label} path={item.path} badge={item.badge} isActive={item.active} onNavigate={navigate} collapsed={rail} />
            ))}
          </PrimaryNav>

          {rail ? (
            // Icon rail: projects are one click away by expanding the sidebar
            <button
              type="button"
              onClick={onToggleCollapsed}
              title="Show projects"
              aria-label="Expand sidebar to show projects"
              className="w-full flex justify-center py-2 rounded-lg text-neutral-400 hover:text-white hover:bg-raised"
            >
              <LayoutGrid size={17} />
            </button>
          ) : (
            <>
              {favorites.length > 0 && (
                <>
                  <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.08em] text-neutral-400">Favorites</h2>
                  <div className="mb-4 space-y-1">
                    {favorites.map(project => (
                      <div
                        key={project.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md group relative text-sm min-h-8
                          ${activeProjectId === project.id ? 'bg-raised text-neutral-50' : 'text-neutral-300 hover:bg-raised'}`}
                      >
                        <LayoutGrid size={14} className="opacity-70" aria-hidden="true" />
                        <button type="button" className="flex-1 truncate text-left" onClick={() => openProject(project.id)}>
                          {project.name}
                        </button>
                        <button
                          aria-label={`Remove ${project.name} from favorites`}
                          onClick={() => toggleProjectFavorite(project.id)}
                          className="p-1.5 opacity-60 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        >
                          <Star size={14} className="text-yellow-500 fill-yellow-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div>
                <div className="px-3 flex items-center justify-between text-neutral-400 mb-2 group">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.08em]">Spaces</h2>
                  {userRole === 'admin' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowNewSpaceInput(true) }}
                      className="p-1.5 rounded hover:text-white hover:bg-raised opacity-60 group-hover:opacity-100 focus:opacity-100 transition-opacity"
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
                      aria-label="New space name"
                      value={newSpaceName}
                      maxLength={60}
                      onChange={(e) => setNewSpaceName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddSpace()
                        if (e.key === 'Escape') { e.stopPropagation(); setShowNewSpaceInput(false); setNewSpaceName('') }
                      }}
                      onBlur={handleAddSpace}
                      placeholder="Space name..."
                      className="flex-1 bg-raised text-white text-sm px-2 py-1 rounded-md border border-accent-500/60 focus:outline-none"
                    />
                  </div>
                )}

                {spaces.length === 0 && (
                  <p className="px-3 py-2 text-xs text-neutral-400">
                    {userRole === 'admin' ? 'Create a space with + to start organising projects.' : 'No spaces yet. An admin can create one.'}
                  </p>
                )}

                <div className="space-y-1">
                  {spaces.map(space => {
                    const spaceProjects = projects.filter(p => p.spaceId === space.id)
                    return (
                      <div key={space.id}>
                        <div className="flex items-center gap-2 px-3 py-1.5 text-neutral-300 hover:bg-raised rounded-md group min-h-8">
                          <button
                            type="button"
                            aria-expanded={space.isExpanded}
                            onClick={() => toggleSpaceExpanded(space.id)}
                            className="flex-1 flex items-center gap-2 truncate text-left"
                          >
                            <ChevronRight size={12} aria-hidden="true" className={`transition-transform duration-200 flex-shrink-0 ${space.isExpanded ? 'rotate-90' : ''}`} />
                            <span className="w-5 h-5 rounded-md bg-raised ring-1 ring-inset ring-edge flex items-center justify-center text-neutral-400 flex-shrink-0">
                              <Folder size={12} aria-hidden="true" />
                            </span>
                            <span className="text-sm truncate">{space.name}</span>
                          </button>

                          {userRole === 'admin' && (
                            <button
                              aria-label={`Delete space ${space.name}`}
                              className="p-1.5 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                              onClick={() => confirmAction(
                                'Delete Space',
                                `Delete "${space.name}"? Every project in this space and all of their tasks will be permanently deleted.`,
                                async () => { await deleteSpace(space.id) },
                                'danger'
                              )}
                            >
                              <Trash2 size={14} className="text-neutral-500 hover:text-red-500 transition-colors" />
                            </button>
                          )}
                        </div>

                        {space.isExpanded && (
                          <div className="pl-9 mt-1 space-y-0.5">
                            {spaceProjects.map(project => (
                              <div
                                key={project.id}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm group border-l-2 transition-colors min-h-8
                                 ${activeProjectId === project.id
                                    ? 'bg-raised text-neutral-50 border-accent-400'
                                    : 'text-neutral-300 hover:bg-raised border-transparent'}`}
                              >
                                <LayoutGrid size={14} className="opacity-70 flex-shrink-0" aria-hidden="true" />
                                <button
                                  type="button"
                                  aria-current={activeProjectId === project.id ? 'page' : undefined}
                                  onClick={() => openProject(project.id)}
                                  className="flex-1 truncate text-left"
                                >
                                  {project.name}
                                </button>

                                <div className="opacity-60 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1.5">
                                  <button
                                    aria-label={project.isFavorite ? `Remove ${project.name} from favorites` : `Add ${project.name} to favorites`}
                                    aria-pressed={project.isFavorite}
                                    onClick={() => toggleProjectFavorite(project.id)}
                                    className="p-1.5 rounded"
                                  >
                                    <Star size={14} className={project.isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-neutral-500 hover:text-yellow-500 transition-colors'} />
                                  </button>

                                  {userRole === 'admin' && (
                                    <button
                                      aria-label={`Delete project ${project.name}`}
                                      className="p-1.5 rounded"
                                      onClick={() => confirmAction(
                                        'Delete Project',
                                        `Delete "${project.name}" and all of its tasks? This action cannot be undone.`,
                                        async () => {
                                          const deleted = await deleteProject(project.id)
                                          if (deleted && activeProjectId === project.id) navigate('/dashboard')
                                        },
                                        'danger'
                                      )}
                                    >
                                      <Trash2 size={14} className="text-neutral-500 hover:text-red-500 transition-colors" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}

                            {spaceProjects.length === 0 && userRole !== 'admin' && (
                              <p className="px-2 py-1.5 text-xs text-neutral-400">No projects yet</p>
                            )}

                            {activeSpaceInput === space.id && userRole === 'admin' && (
                              <div className="flex items-center gap-2 px-2 py-1.5">
                                <LayoutGrid size={14} className="text-neutral-500 flex-shrink-0" />
                                <input
                                  autoFocus
                                  aria-label="New project name"
                                  value={newProjectName}
                                  maxLength={80}
                                  onChange={(e) => setNewProjectName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddProject(space.id)
                                    if (e.key === 'Escape') { e.stopPropagation(); setActiveSpaceInput(null); setNewProjectName('') }
                                  }}
                                  onBlur={() => handleAddProject(space.id)}
                                  placeholder="New project..."
                                  className="flex-1 bg-raised text-white text-sm px-2 py-1 rounded-md border border-accent-500/60 focus:outline-none"
                                />
                              </div>
                            )}

                            {activeSpaceInput !== space.id && userRole === 'admin' && (
                              <button
                                onClick={() => setActiveSpaceInput(space.id)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-raised rounded-md text-sm transition-colors"
                              >
                                <Plus size={14} />
                                <span>New Project</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <div className={`border-t border-raised space-y-1 ${rail ? 'p-2' : 'p-3'}`}>
          {userRole === 'admin' && footerButton(Activity, 'Activity Log', '/dashboard/activity')}
          {footerButton(Settings, 'Settings', '/dashboard/settings')}
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={rail ? 'Expand sidebar' : 'Collapse sidebar'}
            title={rail ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`hidden lg:flex w-full items-center gap-2 py-2 text-sm text-neutral-400 hover:bg-raised hover:text-white rounded-md transition-colors min-h-9 ${rail ? 'justify-center' : 'px-3'}`}
          >
            {rail ? <PanelLeftOpen size={16} /> : <><PanelLeftClose size={16} /> Collapse</>}
          </button>
        </div>

      </aside>

      {/* Outside the aside: its translate would otherwise contain this fixed-position modal */}
      <UserProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />
    </>
  )
}

import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { useAuth } from '../context/AuthContext'
import UserProfileModal from '../components/UserProfileModal'
import { MessageSquare } from 'lucide-react'
import {
  Home, Inbox, CheckCircle, MoreHorizontal, Plus,
  ChevronRight, ChevronDown, LayoutGrid, Folder, Star, Trash2, Trophy, Settings, Users, Activity
} from 'lucide-react'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { spaces, projects, toggleSpaceExpanded, toggleProjectFavorite, addProject, deleteProject, addSpace, deleteSpace, confirmAction } = useProject()

  const { userRole, currentUser } = useAuth()

  const [showNewProjectInput, setShowNewProjectInput] = useState(false)
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

  const NavItem = ({ icon: Icon, label, path, badge }) => {
    const isActive = location.pathname === path

    return (
      <div
        onClick={() => navigate(path)}
        className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-sm font-medium transition-colors mb-0.5
        ${isActive ? 'bg-[#3C245C] text-white' : 'text-gray-400 hover:bg-[#2B2D31] hover:text-gray-100'}`}
      >
        <Icon size={16} />
        <span className="flex-1">{label}</span>
        {badge && <span className="bg-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full text-white">{badge}</span>}
      </div>
    )
  }

  const handleAddProject = (spaceId) => {
    if (newProjectName.trim()) {
      addProject({
        name: newProjectName.trim(),
        spaceId: spaceId || (spaces[0]?.id || 'space-1'),
        icon: 'square'
      })
      setNewProjectName('')
      setShowNewProjectInput(false)
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

  return (
    <aside className="w-[240px] bg-[#1E1F21] border-r border-[#2B2D31] flex flex-col h-full flex-shrink-0 relative">
      <div className="h-14 flex items-center px-4 border-b border-[#2B2D31] relative" ref={workspaceRef}>
        <div
          onClick={() => setWorkspaceOpen(!workspaceOpen)}
          className="flex items-center gap-2 w-full cursor-pointer hover:bg-[#2B2D31] p-1.5 rounded-md transition-colors"
        >
          <div
            onClick={(e) => {
              e.stopPropagation()
              setSelectedUser(currentUser)
            }}
            className="w-6 h-6 rounded bg-purple-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm hover:scale-105 transition-transform"
          >
            {getUserInitials()}
          </div>
          <span className="text-sm font-semibold text-gray-200 flex-1 truncate">{displayName}</span>
          <ChevronDown size={12} className="text-gray-500 flex-shrink-0" />
        </div>

        {/* Workspace Dropdown */}
        {workspaceOpen && (
          <div className="absolute top-12 left-4 right-4 bg-[#18191B] border border-[#2B2D31] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1">
            <div className="p-1">
              {userRole === 'admin' && (
                <button
                  onClick={() => { setWorkspaceOpen(false); navigate('/dashboard/settings'); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-[#2B2D31] hover:text-white rounded-lg transition-colors"
                >
                  <Settings size={14} /> Workspace Settings
                </button>
              )}
              <button
                onClick={() => { setWorkspaceOpen(false); navigate('/dashboard/team'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-[#2B2D31] hover:text-white rounded-lg transition-colors"
              >
                <Users size={14} /> Manage Team
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        <div className="mb-6">
          <NavItem icon={Home} label="Home" path="/dashboard" />
          <NavItem icon={Inbox} label="Inbox" path="/dashboard/inbox" />
          <NavItem icon={MessageSquare} label="Messages" path="/dashboard/messages" />
          <NavItem icon={LayoutGrid} label="Team" path="/dashboard/team" />
          <NavItem icon={Trophy} label="Leaderboard" path="/dashboard/leaderboard" />
          <NavItem icon={CheckCircle} label="My Tasks" path="/dashboard/my-tasks" />
        </div>

        {favorites.length > 0 && (
          <>
            <div className="mb-2 px-3 flex items-center justify-between group cursor-pointer text-gray-500 hover:text-gray-300">
              <span className="text-xs font-bold uppercase tracking-wider">Favorites</span>
              <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="mb-4 space-y-1">
              {favorites.map(project => (
                <div
                  key={project.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer group relative text-sm
                    ${location.pathname.includes(`/list/${project.id}`) ? 'bg-[#3C245C] text-white' : 'text-gray-300 hover:bg-[#2B2D31]'}`}
                  onClick={() => navigate(`/dashboard/list/${project.id}`)}
                >
                  <LayoutGrid size={14} className="opacity-70" />
                  <span className="flex-1 truncate">{project.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleProjectFavorite(project.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Star size={14} className="text-yellow-500 fill-yellow-500" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <div>
          <div className="px-3 flex items-center justify-between text-gray-500 mb-2 group">
            <span className="text-xs font-bold uppercase tracking-wider">Spaces</span>
            {userRole === 'admin' && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowNewSpaceInput(true); }}
                className="hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Add new space"
              >
                <Plus size={14} />
              </button>
            )}
          </div>

          {showNewSpaceInput && (
            <div className="flex items-center gap-2 px-3 py-1.5 mb-1">
              <Folder size={14} className="text-blue-500 flex-shrink-0" />
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
                className="flex-1 bg-[#2B2D31] text-white text-sm px-2 py-0.5 rounded border border-blue-500 focus:outline-none"
              />
            </div>
          )}

          <div className="space-y-1">
            {spaces.map(space => (
              <div key={space.id}>
                <div
                  className="flex items-center gap-2 px-3 py-1.5 text-gray-300 hover:bg-[#2B2D31] rounded-md cursor-pointer group"
                  onClick={() => toggleSpaceExpanded(space.id)}
                >
                  <div className="flex-[1] flex items-center gap-2 truncate">
                    <div className={`transition-transform duration-200 ${space.isExpanded ? 'rotate-90' : ''}`}>
                      <ChevronRight size={12} />
                    </div>
                    <div className="w-5 h-5 rounded-sm bg-blue-600 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                      <Folder size={12} />
                    </div>
                    <span className="text-sm truncate">{space.name}</span>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 flex-shrink-0 transition-opacity">
                    {userRole === 'admin' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          confirmAction(
                            'Delete Space',
                            `Are you sure you want to delete "${space.name}"? Active projects in this space will not be deleted but may become inaccessible.`,
                            async () => {
                              await deleteSpace(space.id)
                            },
                            'danger'
                          )
                        }}
                      >
                        <Trash2 size={14} className="text-gray-500 hover:text-red-500 transition-colors" />
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
                           ${location.pathname.includes(`/list/${project.id}`)
                              ? 'bg-[#3C245C]/50 text-white border-purple-500'
                              : 'text-gray-300 hover:bg-[#2B2D31] border-transparent'}`}
                          onClick={() => navigate(`/dashboard/list/${project.id}`)}
                        >
                          <LayoutGrid size={14} className="opacity-70 flex-shrink-0" />
                          <span className="flex-1 truncate">{project.name}</span>

                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleProjectFavorite(project.id)
                              }}
                            >
                              <Star
                                size={14}
                                className={project.isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-gray-500 hover:text-yellow-500 transition-colors'}
                              />
                            </button>

                            {userRole === 'admin' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  confirmAction(
                                    'Delete Project',
                                    `Are you sure you want to delete "${project.name}"? This action cannot be undone.`,
                                    async () => {
                                      await deleteProject(project.id)
                                      if (location.pathname.includes(project.id)) {
                                        navigate('/dashboard')
                                      }
                                    },
                                    'danger'
                                  )
                                }}
                              >
                                <Trash2 size={14} className="text-gray-500 hover:text-red-500 transition-colors" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                    {activeSpaceInput === space.id && userRole === 'admin' && (
                      <div className="flex items-center gap-2 px-2 py-1.5">
                        <LayoutGrid size={14} className="text-gray-500 flex-shrink-0" />
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
                          className="flex-1 bg-[#2B2D31] text-white text-sm px-2 py-0.5 rounded border border-indigo-500 focus:outline-none"
                        />
                      </div>
                    )}

                    {activeSpaceInput !== space.id && userRole === 'admin' && (
                      <button
                        onClick={() => setActiveSpaceInput(space.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-gray-500 hover:text-gray-300 hover:bg-[#2B2D31] rounded-md text-sm transition-colors"
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

      <div className="p-3 border-t border-[#2B2D31]">
        {userRole === 'admin' ? (
          <div className="space-y-1">
            <button
              onClick={() => navigate('/dashboard/activity')}
              className="w-full flex items-center justify-start gap-2 px-3 py-1.5 text-sm text-gray-400 hover:bg-[#2B2D31] hover:text-white rounded-md transition-colors"
            >
              <Activity size={14} /> Activity Log
            </button>
            <button
              onClick={() => navigate('/dashboard/settings')}
              className="w-full flex items-center justify-start gap-2 px-3 py-1.5 text-sm text-gray-400 hover:bg-[#2B2D31] hover:text-white rounded-md transition-colors"
            >
              <Settings size={14} /> Settings
            </button>
          </div>
        ) : (
          <div className="text-center py-1.5 text-xs text-gray-500 font-medium select-none cursor-default">
            Employee View
          </div>
        )}
      </div>

      <UserProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />
    </aside>
  )
}
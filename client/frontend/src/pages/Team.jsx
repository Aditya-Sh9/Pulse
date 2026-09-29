import React, { useState, useRef, useEffect } from 'react'
import { useProject } from '../context/ProjectContext'
import { useAuth } from '../context/AuthContext'
import InviteModal from '../components/InviteModal'
import UserProfileModal from '../components/UserProfileModal'
import { Search, MoreHorizontal, Mail, Plus, Shield, ShieldAlert, Trash2 } from 'lucide-react'

export default function Team() {
  const { members, updateMemberRole, removeMember, confirmAction } = useProject()
  const { userRole, currentUser } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const isAdmin = userRole === 'admin'
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [activeMenuId, setActiveMenuId] = useState(null)
  const menuRef = useRef(null)

  const filteredMembers = members.filter(member => {
    const q = searchQuery.toLowerCase()
    const matchesSearch = !q ||
      member.name?.toLowerCase().includes(q) ||
      member.email?.toLowerCase().includes(q)
    const matchesRole = roleFilter === 'all' ||
      (roleFilter === 'online' ? member.status === 'online' : (member.role || 'employee') === roleFilter)
    return matchesSearch && matchesRole
  })

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleUpdateRole = (memberId, role) => {
    updateMemberRole(memberId, role)
    setActiveMenuId(null)
  }

  const handleRemoveMember = (member) => {
    setActiveMenuId(null)
    confirmAction(
      'Remove member',
      `Remove ${member.name || member.email} from the workspace? Their account is deleted and their tasks become unassigned.`,
      () => removeMember(member.id)
    )
  }

  return (
    <div className="p-8 h-full flex flex-col bg-base text-neutral-200">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[26px] leading-tight font-semibold text-neutral-50 tracking-[-0.02em] mb-1">Team Members</h1>
          <p className="text-sm text-neutral-400">
            {isAdmin ? 'Manage your workspace members and their roles.' : 'Everyone in your workspace. Click a teammate to view their profile.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              aria-label="Search members"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-card border border-raised rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-accent-500 text-white w-64 transition-colors"
            />
          </div>
          <select
            aria-label="Filter members"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-card border border-raised rounded-lg text-sm font-medium text-neutral-200 hover:bg-raised focus:outline-none focus:border-accent-500 transition-colors cursor-pointer"
          >
            <option value="all">Everyone</option>
            <option value="admin">Admins</option>
            <option value="employee">Employees</option>
            <option value="online">Online now</option>
          </select>
          {isAdmin && (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent-600 hover:bg-accent-500 text-white rounded-lg text-sm font-bold transition-colors"
            >
              <Plus size={16} /> Invite Member
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-card border border-raised rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-raised bg-panel text-xs uppercase tracking-wider text-neutral-500">
              <th className="px-6 py-4 font-semibold">Member</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Role</th>
              <th className="px-6 py-4 font-semibold">Email</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-raised">
            {filteredMembers.map((member) => (
              <tr
                key={member.id}
                onClick={() => setSelectedUser(member)}
                className="hover:bg-raised/50 transition-colors group cursor-pointer"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-accent-500/15 ring-1 ring-inset ring-accent-400/25 flex items-center justify-center text-accent-200 font-bold text-sm">
                        {member.avatar || (member.name ? member.name.charAt(0).toUpperCase() : 'U')}
                      </div>
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${member.status === 'online' ? 'bg-green-500' : 'bg-neutral-500'}`}></div>
                    </div>
                    <div>
                      <div className="font-semibold text-neutral-200">{member.name || 'Unknown User'}</div>
                      <div className="text-xs text-neutral-500">{member.title || 'Team Member'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${member.status === 'online' ? 'bg-green-500' : 'bg-neutral-500'}`}></div>
                    <span className="text-sm text-neutral-400 capitalize">{member.status || 'offline'}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${member.role === 'admin'
                      ? 'bg-accent-500/10 text-accent-400 border-accent-500/20'
                      : 'bg-neutral-500/10 text-neutral-300 border-neutral-500/25'
                    }`}>
                    {member.role === 'admin' ? 'Admin' : 'Employee'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-neutral-400">
                    <Mail size={14} className="text-neutral-500" />
                    {member.email}
                  </div>
                </td>
                <td className="px-6 py-4 text-right relative" onClick={(e) => e.stopPropagation()}>
                  {isAdmin && member.id !== currentUser.uid && (
                    <button
                      aria-label={`Actions for ${member.name || member.email}`}
                      aria-haspopup="menu"
                      onClick={() => setActiveMenuId(activeMenuId === member.id ? null : member.id)}
                      className="p-2 text-neutral-500 hover:text-white hover:bg-edge rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  )}
                  {activeMenuId === member.id && isAdmin && member.id !== currentUser.uid && (
                    <div ref={menuRef} className="absolute right-10 top-10 w-48 bg-raised border border-edge rounded-lg shadow-2xl z-50 p-1 flex flex-col text-left">
                      {member.role !== 'admin' ? (
                        <button
                          onClick={() => handleUpdateRole(member.id, 'admin')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded hover:bg-edge text-accent-400 transition-colors"
                        >
                          <Shield size={14} /> Make Admin
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateRole(member.id, 'employee')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded hover:bg-edge text-neutral-200 transition-colors"
                        >
                          <ShieldAlert size={14} /> Make Employee
                        </button>
                      )}
                      <div className="h-px bg-edge my-1" />
                      <button
                        onClick={() => handleRemoveMember(member)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded hover:bg-edge text-red-400 transition-colors"
                      >
                        <Trash2 size={14} /> Remove Member
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredMembers.length === 0 && (
          <div className="p-8 text-center text-neutral-500">
            No members match your search or filter.
          </div>
        )}
      </div>

      <InviteModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
      <UserProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  )
}
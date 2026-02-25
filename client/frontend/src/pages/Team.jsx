import React, { useState, useRef, useEffect } from 'react'
import { useProject } from '../context/ProjectContext'
import { useAuth } from '../context/AuthContext'
import InviteModal from '../components/InviteModal'
import UserProfileModal from '../components/UserProfileModal'
import { Search, Filter, MoreHorizontal, Mail, MapPin, Calendar, Plus, Shield, ShieldAlert, Trash2 } from 'lucide-react'

export default function Team() {
  const { members, updateMemberRole, removeMember } = useProject()
  const { userRole, currentUser } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [activeMenuId, setActiveMenuId] = useState(null)
  const menuRef = useRef(null)

  const filteredMembers = members.filter(member =>
    member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role?.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

  const handleRemoveMember = (memberId) => {
    if (window.confirm("Are you sure you want to remove this member?")) {
      removeMember(memberId)
    }
    setActiveMenuId(null)
  }

  return (
    <div className="p-8 h-full flex flex-col bg-[#0F1117] text-gray-200">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Team Members</h1>
          <p className="text-sm text-gray-400">Manage your workspace members and their roles.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#1E1F21] border border-[#2B2D31] rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-purple-500 text-white w-64 transition-colors"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 bg-[#1E1F21] border border-[#2B2D31] rounded-lg text-sm font-medium hover:bg-[#2B2D31] transition-colors">
            <Filter size={16} /> Filter
          </button>
          {userRole === 'admin' && (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold transition-colors"
            >
              <Plus size={16} /> Invite Member
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-[#1E1F21] border border-[#2B2D31] rounded-xl shadow-lg">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#2B2D31] bg-[#18191B] text-xs uppercase tracking-wider text-gray-500">
              <th className="px-6 py-4 font-semibold">Member</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Role</th>
              <th className="px-6 py-4 font-semibold">Email</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2B2D31]">
            {filteredMembers.map((member) => (
              <tr
                key={member.id}
                onClick={() => setSelectedUser(member)}
                className="hover:bg-[#2B2D31]/50 transition-colors group cursor-pointer"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                        {member.avatar || (member.name ? member.name.charAt(0).toUpperCase() : 'U')}
                      </div>
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1E1F21] ${member.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-200">{member.name || 'Unknown User'}</div>
                      <div className="text-xs text-gray-500">{member.title || 'Team Member'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${member.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    <span className="text-sm text-gray-400 capitalize">{member.status || 'offline'}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${member.role === 'admin'
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                    {member.role === 'admin' ? 'Admin' : 'Employee'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Mail size={14} className="text-gray-500" />
                    {member.email}
                  </div>
                </td>
                <td className="px-6 py-4 text-right relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setActiveMenuId(activeMenuId === member.id ? null : member.id)}
                    className="p-2 text-gray-500 hover:text-white hover:bg-[#3E4045] rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                  {activeMenuId === member.id && userRole === 'admin' && member.id !== currentUser.uid && (
                    <div ref={menuRef} className="absolute right-10 top-10 w-48 bg-[#2B2D31] border border-[#3E4045] rounded-lg shadow-2xl z-50 p-1 flex flex-col text-left">
                      {member.role === 'employee' ? (
                        <button
                          onClick={() => handleUpdateRole(member.id, 'admin')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded hover:bg-[#3E4045] text-purple-400 transition-colors"
                        >
                          <Shield size={14} /> Make Admin
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateRole(member.id, 'employee')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded hover:bg-[#3E4045] text-blue-400 transition-colors"
                        >
                          <ShieldAlert size={14} /> Make Employee
                        </button>
                      )}
                      <div className="h-px bg-[#3E4045] my-1" />
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded hover:bg-[#3E4045] text-red-400 transition-colors"
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
          <div className="p-8 text-center text-gray-500">
            No members found matching your search.
          </div>
        )}
      </div>

      <InviteModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
      <UserProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  )
}
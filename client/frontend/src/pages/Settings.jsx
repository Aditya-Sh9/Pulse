import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useProject } from '../context/ProjectContext' // Import ProjectContext to get members and apiFetch
import { useNavigate } from 'react-router-dom'
import {
  Settings as SettingsIcon, Bell, User, Lock, LogOut,
  Camera, CheckCircle2, Shield, Mail, Calendar, Sparkles
} from 'lucide-react'

export default function Settings() {
  const { currentUser, logout, userRole } = useAuth()
  const { members, apiFetch } = useProject() // Pull in apiFetch
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Find the rich profile from Firestore 'users' collection
  const userProfile = members.find(m => m.id === currentUser?.uid)

  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    notifications: true
  })

  // Sync state with the Rich Profile (preferred) or Basic Auth (fallback)
  useEffect(() => {
    if (userProfile) {
      setFormData({
        displayName: userProfile.name || currentUser?.displayName || '',
        email: userProfile.email || currentUser?.email || '',
        notifications: userProfile.notifications !== undefined ? userProfile.notifications : true
      })
    } else if (currentUser) {
      setFormData({
        displayName: currentUser.displayName || '',
        email: currentUser.email || '',
        notifications: true
      })
    }
  }, [userProfile, currentUser])

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      // Securely call our new Node.js backend route
      await apiFetch('/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify({
          displayName: formData.displayName,
          notifications: formData.notifications
        })
      })

      setMessage({ type: 'success', text: 'Profile updated successfully!' })

      // Clear success message after 3 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      console.error('Update error:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to update settings.' })
    } finally {
      setLoading(false)
    }
  }

  const getUserInitials = () => {
    if (formData.displayName) {
      return formData.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    }
    return formData.email?.slice(0, 2).toUpperCase() || 'U'
  }

  return (
    <div className="p-6 md:p-10 h-full flex flex-col bg-[#0F1117] text-white font-sans overflow-y-auto">

      {/* --- Ambient Background --- */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      {/* --- Header --- */}
      <div className="relative z-10 flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-purple-600/20 border border-purple-500/30 rounded-xl flex items-center justify-center text-purple-400">
          <SettingsIcon size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-slate-400 text-sm">Manage your account preferences and profile.</p>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl">

        {/* Left Column: Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="bg-[#1E1F21]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6 md:p-8 space-y-8">

            {/* Profile Section */}
            <div>
              <div className="flex items-center gap-2 mb-6 text-purple-400 font-bold uppercase tracking-wider text-xs">
                <User size={14} /> Profile Information
              </div>

              <div className="flex flex-col sm:flex-row gap-8 items-start">
                <div className="relative group cursor-pointer">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-purple-900/20 border-4 border-[#1E1F21]">
                    {getUserInitials()}
                  </div>
                  <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center border-4 border-transparent">
                    <Camera size={24} className="text-white" />
                  </div>
                </div>

                <div className="flex-1 space-y-5 w-full">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Display Name</label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full bg-[#111] border border-[#3E4045] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                      placeholder="e.g. Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-2">
                      Email Address <Lock size={12} className="text-slate-600" />
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="w-full bg-[#111]/50 border border-[#3E4045]/50 rounded-xl px-4 py-3 text-sm text-slate-500 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-slate-600 mt-1.5">Email cannot be changed directly for security reasons.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-white/5 w-full"></div>

            {/* Notifications Section */}
            <div>
              <div className="flex items-center gap-2 mb-6 text-blue-400 font-bold uppercase tracking-wider text-xs">
                <Bell size={14} /> Preferences
              </div>

              <div
                onClick={() => {
                  const newValue = !formData.notifications;
                  setFormData({ ...formData, notifications: newValue });
                  // Auto-sync visual toggle to backend
                  apiFetch('/api/users/profile', {
                    method: 'PUT',
                    body: JSON.stringify({ displayName: formData.displayName, notifications: newValue })
                  }).catch(console.error);
                }}
                className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
              >
                <div>
                  <h4 className="font-bold text-sm text-white mb-1">Push Notifications</h4>
                  <p className="text-xs text-slate-400">Receive alerts when assigned to tasks or mentioned.</p>
                </div>
                <div className={`w-11 h-6 rounded-full p-1 transition-colors ${formData.notifications ? 'bg-purple-600' : 'bg-slate-700'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${formData.notifications ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </div>
              </div>
            </div>

            {/* Status Messages */}
            {message.text && (
              <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                {message.type === 'success' ? <CheckCircle2 size={18} /> : <Shield size={18} />}
                {message.text}
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2 shadow-xl shadow-white/5 disabled:opacity-50"
              >
                {loading ? 'Saving Changes...' : <><Sparkles size={16} /> Save Changes</>}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Account Info */}
        <div className="space-y-6">
          <section className="bg-[#1E1F21]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6 flex flex-col justify-between h-full min-h-[300px]">
            <div>
              <div className="flex items-center gap-2 mb-6 text-emerald-400 font-bold uppercase tracking-wider text-xs">
                <Shield size={14} /> Account Status
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <Mail size={16} className="text-slate-500" />
                  <span className="truncate">{currentUser?.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <Calendar size={16} className="text-slate-500" />
                  <span>Joined {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : 'Recently'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <User size={16} className="text-slate-500" />
                  <span className="capitalize border border-white/10 px-2 py-0.5 rounded-md text-xs font-bold text-emerald-400 bg-emerald-400/10">
                    {userRole || 'Employee'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-3 border border-red-500/30 bg-red-500/10 text-red-400 font-bold rounded-xl hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 mt-8"
            >
              <LogOut size={16} /> Sign Out Safely
            </button>
          </section>
        </div>

      </div>
    </div>
  )
}
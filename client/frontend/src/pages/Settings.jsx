import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useProject } from '../context/ProjectContext'
import { useNavigate } from 'react-router-dom'
import {
  Settings as SettingsIcon, Bell, User, Lock, LogOut,
  CheckCircle2, Shield, Mail, Calendar, KeyRound
} from 'lucide-react'
import { toJsDate } from '../utils/dates'

export default function Settings() {
  const { currentUser, logout, userRole, refreshUser, resetPassword } = useAuth()
  const { members, apiFetch, showToast } = useProject()
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

  const savedName = userProfile?.name || currentUser?.displayName || ''
  const nameChanged = formData.displayName.trim() !== savedName
  const isPasswordAccount = currentUser?.providerData?.some(p => p.providerId === 'password')
  const joinedAt = toJsDate(userProfile?.createdAt)

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
    const displayName = formData.displayName.trim()
    if (!displayName) {
      setMessage({ type: 'error', text: 'Display name can’t be empty.' })
      return
    }
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      await apiFetch('/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify({ displayName })
      })
      // Pull the new displayName into the Auth user so the sidebar/topbar update without a reload
      await refreshUser()

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

  // Preference toggles save immediately
  const handleToggleNotifications = async () => {
    const newValue = !formData.notifications
    setFormData(prev => ({ ...prev, notifications: newValue }))
    try {
      await apiFetch('/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify({ notifications: newValue })
      })
    } catch (error) {
      setFormData(prev => ({ ...prev, notifications: !newValue }))
      showToast(error.message || 'Could not save your preference', 'error')
    }
  }

  const handlePasswordReset = async () => {
    try {
      await resetPassword(currentUser.email)
      showToast(`Password reset link sent to ${currentUser.email}`, 'success')
    } catch {
      showToast('Could not send the reset email. Try again later.', 'error')
    }
  }

  const getUserInitials = () => {
    if (formData.displayName) {
      return formData.displayName.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
    }
    return formData.email?.slice(0, 2).toUpperCase() || 'U'
  }

  return (
    <div className="p-6 md:p-10 h-full flex flex-col bg-base text-white font-sans overflow-y-auto">

      {/* --- Header --- */}
      <div className="relative z-10 flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-accent-600/20 border border-accent-500/30 rounded-xl flex items-center justify-center text-accent-400">
          <SettingsIcon size={24} />
        </div>
        <div>
          <h1 className="text-[26px] leading-tight font-semibold text-neutral-50 tracking-[-0.02em]">Settings</h1>
          <p className="text-neutral-400 text-sm">Manage your account preferences and profile.</p>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl">

        {/* Left Column: Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="bg-card border border-white/5 rounded-2xl p-6 md:p-8 space-y-8">

            {/* Profile Section */}
            <div>
              <div className="flex items-center gap-2 mb-6 text-accent-400 font-semibold uppercase tracking-[0.08em] text-xs">
                <User size={14} /> Profile Information
              </div>

              <div className="flex flex-col sm:flex-row gap-8 items-start">
                <div className="w-24 h-24 rounded-full bg-accent-500/15 ring-1 ring-inset ring-accent-400/25 flex items-center justify-center text-3xl font-bold text-accent-200 flex-shrink-0" aria-hidden="true">
                  {getUserInitials()}
                </div>

                <div className="flex-1 space-y-5 w-full">
                  <div>
                    <label htmlFor="settings-name" className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 block">Display Name</label>
                    <input
                      id="settings-name"
                      type="text"
                      maxLength={60}
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full bg-base border border-edge rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-accent-500 transition-colors"
                      placeholder="e.g. Jane Doe"
                    />
                  </div>
                  <div>
                    <label htmlFor="settings-email" className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                      Email Address <Lock size={12} className="text-neutral-600" />
                    </label>
                    <input
                      id="settings-email"
                      type="email"
                      value={formData.email}
                      disabled
                      className="w-full bg-base/50 border border-edge/50 rounded-xl px-4 py-3 text-sm text-neutral-500 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-neutral-600 mt-1.5">Email cannot be changed directly for security reasons.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-white/5 w-full"></div>

            {/* Notifications Section */}
            <div>
              <div className="flex items-center gap-2 mb-6 text-neutral-400 font-semibold uppercase tracking-[0.08em] text-xs">
                <Bell size={14} /> Preferences
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={formData.notifications}
                onClick={handleToggleNotifications}
                className="w-full text-left flex items-center justify-between gap-4 p-4 rounded-xl border border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              >
                <div>
                  <h4 className="font-bold text-sm text-white mb-1">Task notifications</h4>
                  <p className="text-xs text-neutral-400">Get an inbox alert when you’re assigned to a task or @mentioned. Saved automatically.</p>
                </div>
                <div className={`w-11 h-6 rounded-full p-1 transition-colors flex-shrink-0 ${formData.notifications ? 'bg-accent-600' : 'bg-neutral-700'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${formData.notifications ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </div>
              </button>
            </div>

            {/* Status Messages */}
            {message.text && (
              <div role="status" className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                {message.type === 'success' ? <CheckCircle2 size={18} /> : <Shield size={18} />}
                {message.text}
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading || !nameChanged}
                className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-all flex items-center gap-2 shadow-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving Changes...' : <><CheckCircle2 size={16} aria-hidden="true" /> Save Changes</>}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Account Info */}
        <div className="space-y-6">
          <section className="bg-card border border-white/5 rounded-2xl p-6 flex flex-col justify-between h-full min-h-[300px]">
            <div>
              <div className="flex items-center gap-2 mb-6 text-emerald-400 font-semibold uppercase tracking-[0.08em] text-xs">
                <Shield size={14} /> Account Status
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-neutral-300">
                  <Mail size={16} className="text-neutral-500" />
                  <span className="truncate">{currentUser?.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-neutral-300">
                  <Calendar size={16} className="text-neutral-500" />
                  <span>Joined {joinedAt ? joinedAt.toLocaleDateString() : 'Recently'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-neutral-300">
                  <User size={16} className="text-neutral-500" />
                  <span className="capitalize border border-white/10 px-2 py-0.5 rounded-md text-xs font-bold text-emerald-400 bg-emerald-400/10">
                    {userRole || 'Employee'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              {isPasswordAccount && (
                <button
                  onClick={handlePasswordReset}
                  className="w-full py-3 border border-edge bg-base text-neutral-200 font-bold rounded-xl hover:bg-raised transition-all flex items-center justify-center gap-2"
                >
                  <KeyRound size={16} /> Email me a password reset link
                </button>
              )}
              <button
                onClick={handleLogout}
                className="w-full py-3 border border-red-500/30 bg-red-500/10 text-red-400 font-bold rounded-xl hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
              >
                <LogOut size={16} /> Sign Out Safely
              </button>
            </div>
          </section>
        </div>

      </div>
    </div>
  )
}

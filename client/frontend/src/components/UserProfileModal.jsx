import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Mail, Shield, Zap, Circle, MessageSquare } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function UserProfileModal({ user, onClose }) {
    const navigate = useNavigate()
    const { currentUser } = useAuth()
    const userId = user?.id || user?.uid

    // Close on Escape key (only while open)
    useEffect(() => {
        if (!user) return
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [user, onClose])

    if (!user) return null

    const getInitials = (name) => {
        if (!name) return 'U'
        return name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase()
    }

    const isOnline = user.status === 'online'
    const roleColor = user.role === 'admin' ? 'text-accent-400 bg-accent-500/10 border-accent-500/30' : 'text-neutral-300 bg-neutral-500/10 border-neutral-500/30'

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={`${user.name || 'User'} profile`}
                className="relative w-full max-w-sm bg-panel border border-raised rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Abstract Background Decoration */}

                {/* Header Action */}
                <div className="absolute top-4 right-4 z-10">
                    <button
                        onClick={onClose}
                        aria-label="Close profile"
                        className="p-1.5 rounded-full bg-black/20 text-neutral-400 hover:text-white hover:bg-white/10 transition-colors backdrop-blur-md"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Profile Content */}
                <div className="relative z-10 p-8 flex flex-col items-center text-center">

                    {/* Avatar Section */}
                    <div className="relative mb-5 group">
                        <div className="w-24 h-24 rounded-full bg-accent-500/15 ring-1 ring-inset ring-accent-400/25 flex items-center justify-center text-3xl font-bold text-accent-200  relative z-10">
                            {getInitials(user.name || user.email)}
                        </div>
                        {/* Status Indicator */}
                        <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-[3px] border-panel z-20 flex items-center justify-center ${isOnline ? 'bg-green-500' : 'bg-neutral-500'}`}>
                            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-200' : 'bg-transparent'}`}></div>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">{user.name || 'Unnamed User'}</h2>

                    <div className="flex items-center gap-2 text-neutral-400 mb-6">
                        <Mail size={14} />
                        <span className="text-sm">{user.email || 'No email provided'}</span>
                    </div>

                    {/* Stats / Info Grid */}
                    <div className="w-full grid grid-cols-2 gap-3 mb-2">

                        <div className="bg-base/60 border border-raised rounded-xl p-3 flex flex-col items-center justify-center">
                            <Shield size={16} className="text-neutral-500 mb-1.5" />
                            <div className={`text-xs font-semibold uppercase tracking-[0.08em] px-2 py-0.5 rounded border ${roleColor}`}>
                                {user.role || 'employee'}
                            </div>
                        </div>

                        <div className="bg-base/60 border border-raised rounded-xl p-3 flex flex-col items-center justify-center">
                            <Zap size={16} className="text-yellow-500 mb-1.5" />
                            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-300">
                                <span className="text-white text-base mr-1">{user.productivityScore || 0}</span> XP
                            </div>
                        </div>

                    </div>

                    {/* Status Text (Optional fallback if not relying completely on the dot) */}
                    <div className="mt-4 flex items-center gap-2 text-xs font-medium text-neutral-500 uppercase tracking-widest">
                        <Circle size={8} className={`fill-current ${isOnline ? 'text-green-500' : 'text-neutral-500'}`} />
                        {isOnline ? 'Currently Online' : 'Offline'}
                    </div>

                    {userId && userId !== currentUser?.uid && (
                        <button
                            onClick={() => { onClose(); navigate(`/dashboard/messages/${userId}`) }}
                            className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent-600 hover:bg-accent-500 text-white text-sm font-semibold transition-colors"
                        >
                            <MessageSquare size={16} /> Send message
                        </button>
                    )}

                </div>
            </div>
        </div>
    )
}

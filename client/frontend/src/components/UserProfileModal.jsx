import React, { useEffect } from 'react'
import { X, Mail, Shield, Zap, Circle } from 'lucide-react'

export default function UserProfileModal({ user, onClose }) {
    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    if (!user) return null

    const getInitials = (name) => {
        if (!name) return 'U'
        return name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase()
    }

    const isOnline = user.status === 'online'
    const roleColor = user.role === 'admin' ? 'text-purple-400 bg-purple-500/10 border-purple-500/30' : 'text-blue-400 bg-blue-500/10 border-blue-500/30'

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-sm bg-[#1A1A1C]/90 backdrop-blur-xl border border-[#2B2D31] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Abstract Background Decoration */}
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-500/20 rounded-full blur-[80px] pointer-events-none"></div>
                <div className="absolute bottom-[-10%] right-[-20%] w-[50%] h-[50%] bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none"></div>

                {/* Header Action */}
                <div className="absolute top-4 right-4 z-10">
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full bg-black/20 text-gray-400 hover:text-white hover:bg-white/10 transition-colors backdrop-blur-md"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Profile Content */}
                <div className="relative z-10 p-8 flex flex-col items-center text-center">

                    {/* Avatar Section */}
                    <div className="relative mb-5 group">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full blur-md opacity-50 group-hover:opacity-80 transition-opacity duration-500"></div>
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-black text-white shadow-xl border-[3px] border-[#1A1A1C] relative z-10">
                            {getInitials(user.name || user.email)}
                        </div>
                        {/* Status Indicator */}
                        <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-[3px] border-[#1A1A1C] z-20 flex items-center justify-center ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}>
                            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-200 animate-pulse' : 'bg-transparent'}`}></div>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">{user.name || 'Unnamed User'}</h2>

                    <div className="flex items-center gap-2 text-gray-400 mb-6">
                        <Mail size={14} />
                        <span className="text-sm">{user.email || 'No email provided'}</span>
                    </div>

                    {/* Stats / Info Grid */}
                    <div className="w-full grid grid-cols-2 gap-3 mb-2">

                        <div className="bg-[#111214]/60 border border-[#2B2D31] rounded-xl p-3 flex flex-col items-center justify-center">
                            <Shield size={16} className="text-gray-500 mb-1.5" />
                            <div className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${roleColor}`}>
                                {user.role || 'employee'}
                            </div>
                        </div>

                        <div className="bg-[#111214]/60 border border-[#2B2D31] rounded-xl p-3 flex flex-col items-center justify-center">
                            <Zap size={16} className="text-yellow-500 mb-1.5" />
                            <div className="text-xs font-bold uppercase tracking-wider text-gray-300">
                                <span className="text-white text-base mr-1">{user.productivityScore || 0}</span> XP
                            </div>
                        </div>

                    </div>

                    {/* Status Text (Optional fallback if not relying completely on the dot) */}
                    <div className="mt-4 flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-widest">
                        <Circle size={8} className={`fill-current ${isOnline ? 'text-green-500' : 'text-gray-500'}`} />
                        {isOnline ? 'Currently Online' : 'Offline'}
                    </div>

                </div>
            </div>
        </div>
    )
}

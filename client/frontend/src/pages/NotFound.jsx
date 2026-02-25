import React from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-[#111] flex items-center justify-center p-6 font-sans text-white relative overflow-hidden">
            {/* Abstract Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="max-w-md w-full bg-[#1A1A1C]/80 backdrop-blur-xl border border-[#2B2D31] rounded-2xl p-8 text-center shadow-2xl relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 rounded-t-2xl"></div>

                <div className="flex justify-center mb-6 relative">
                    <div className="relative">
                        <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-purple-400 to-indigo-600 drop-shadow-lg tracking-tighter">
                            404
                        </h1>
                        <div className="absolute -bottom-2 -right-4 bg-[#2B2D31] rounded-full p-2 border border-[#3E4045] shadow-lg">
                            <AlertTriangle className="text-yellow-500" size={24} />
                        </div>
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-gray-100 mb-3 tracking-tight">Looks like you're lost.</h2>
                <p className="text-gray-400 mb-8 max-w-[280px] mx-auto text-sm leading-relaxed">
                    The page you are looking for doesn't exist, has been removed, or is temporarily unavailable.
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="group w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-semibold transition-all shadow-lg shadow-purple-900/40 active:scale-[0.98]"
                    >
                        <Home size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                        Take me back Home
                    </button>

                    <button
                        onClick={() => navigate(-1)}
                        className="group w-full flex items-center justify-center gap-2 bg-[#2B2D31] hover:bg-[#3E4045] text-gray-300 hover:text-white py-3 rounded-xl font-medium transition-colors border border-[#3E4045] hover:border-gray-500 active:scale-[0.98]"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        Go back
                    </button>
                </div>
            </div>
        </div>
    )
}

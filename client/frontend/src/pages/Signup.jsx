import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, User, ArrowRight, Zap, Activity } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Signup({ onAuth }) {
  const navigate = useNavigate()
  const { signup, googleSignIn, error: authError } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Role state removed - defaulting to 'employee' in logic
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Hardcoded 'employee' role here for security
      await signup(email, password, name, 'employee')
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.')
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setError('')
    setIsLoading(true)

    try {
      await googleSignIn()
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Google sign up failed.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F1117] relative overflow-hidden p-6 font-sans">

      {/* --- BACKGROUND ELEMENTS --- */}

      {/* 1. Grain Texture Overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      {/* 2. Animated Pulse Line (ECG) */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <svg className="absolute top-1/2 left-0 w-full h-40 -translate-y-1/2 stroke-purple-500/50" fill="none">
          <path
            d="M0 80 L200 80 L220 40 L240 120 L260 80 L400 80 L420 20 L440 140 L460 80 L1000 80 L1020 50 L1040 110 L1060 80 L1920 80"
            strokeWidth="1.5"
            className="animate-pulse"
            style={{ filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.4))' }}
          />
        </svg>
      </div>

      {/* 3. Ambient Blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/30 rounded-full mix-blend-screen filter blur-[120px] animate-blob"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/30 rounded-full mix-blend-screen filter blur-[120px] animate-blob animation-delay-2000"></div>

      {/* --- CARD --- */}
      <div className="w-full max-w-md bg-[#1E1F21]/60 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl p-8 relative z-10 group">

        {/* Header with Pulse Logo */}
        <div className="text-center mb-8">
          <div className="relative w-14 h-14 mx-auto mb-4 group-hover:scale-105 transition-transform duration-500">
            {/* Logo Container */}
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-xl blur opacity-40 group-hover:opacity-60 transition-opacity"></div>
            <div className="relative w-full h-full bg-[#1A1B1E] border border-white/10 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Zap size={24} className="text-purple-400" fill="currentColor" />
            </div>
            {/* Vital Sign Dot */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0F1117] shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Join Pulse</h2>
          <p className="text-slate-500 text-sm">Start managing your projects with rhythm.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wider">Full Name</label>
            <div className="relative group/input">
              <User className="absolute left-3 top-3 text-slate-500 group-focus-within/input:text-purple-400 transition-colors" size={18} />
              <input
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-[#111214]/80 border border-slate-800 text-slate-200 rounded-lg py-2.5 pl-10 pr-4 
                focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 focus:shadow-[0_0_15px_rgba(168,85,247,0.15)]
                transition-all placeholder-slate-600"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wider">Email</label>
            <div className="relative group/input">
              <Mail className="absolute left-3 top-3 text-slate-500 group-focus-within/input:text-purple-400 transition-colors" size={18} />
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#111214]/80 border border-slate-800 text-slate-200 rounded-lg py-2.5 pl-10 pr-4 
                focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 focus:shadow-[0_0_15px_rgba(168,85,247,0.15)]
                transition-all placeholder-slate-600"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wider">Password</label>
            <div className="relative group/input">
              <Lock className="absolute left-3 top-3 text-slate-500 group-focus-within/input:text-purple-400 transition-colors" size={18} />
              <input
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-[#111214]/80 border border-slate-800 text-slate-200 rounded-lg py-2.5 pl-10 pr-4 
                focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 focus:shadow-[0_0_15px_rgba(168,85,247,0.15)]
                transition-all placeholder-slate-600"
              />
            </div>
            <p className="text-[10px] text-slate-500 ml-1">Must be at least 8 characters.</p>
          </div>

          {/* Role selection removed */}

          {(error || authError) && (
            <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error || authError}
            </div>
          )}

          <button
            className={`w-full py-3 rounded-lg text-white font-bold tracking-wide flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden group/btn
              ${isLoading
                ? 'bg-slate-800 cursor-not-allowed opacity-70'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-900/20'
              }`}
            type="submit"
            disabled={isLoading}
          >
            {/* Button Scan Effect */}
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"></div>

            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Creating Profile...</span>
              </div>
            ) : (
              <>
                Initialize Account <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-700/50"></div>
            <span className="text-xs text-slate-500 uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-slate-700/50"></div>
          </div>

          {/* Google Sign Up Button */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={isLoading}
            className="w-full py-3 rounded-lg border border-slate-700 bg-[#111214]/50 text-slate-300 font-semibold hover:bg-slate-800/50 hover:text-white hover:border-slate-600 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm0 22c-5.52 0-10-4.48-10-10s4.48-10 10-10 10 4.48 10 10-4.48 10-10 10zm3.5-9c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm-7 0c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm3.5 6.5c2.33 0 4.31-1.46 5.16-3.5h-10.32c.85 2.04 2.83 3.5 5.16 3.5z" />
            </svg>
            Sign up with Google
          </button>
        </form>

        <div className="mt-8 text-center border-t border-white/5 pt-6">
          <p className="text-slate-500 text-sm">
            Already have an account?{' '}
            <button
              className="text-purple-400 font-semibold hover:text-purple-300 hover:underline transition-colors decoration-purple-500/30"
              onClick={() => navigate('/login')}
            >
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
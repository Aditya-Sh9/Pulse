import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Activity, ChevronDown, Menu, X, Zap, Shield, Globe } from 'lucide-react'

export default function Navbar() {
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const NavItem = ({ label, hasDropdown }) => (
    <div className="group relative flex items-center gap-1.5 cursor-pointer font-medium text-slate-600 hover:text-purple-600 transition-colors text-sm tracking-wide">
      {label}
      {hasDropdown && (
        <ChevronDown size={14} className="text-slate-400 group-hover:rotate-180 transition-transform duration-300 group-hover:text-purple-600" />
      )}
    </div>
  )

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 transition-all duration-300 supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between h-20">
          
          {/* --- Logo Section --- */}
          <div className="flex items-center gap-3 cursor-pointer group select-none" onClick={() => navigate('/')}>
            <div className="relative w-10 h-10">
              {/* Logo Glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
              
              {/* Logo Box */}
              <div className="relative w-full h-full bg-white border border-slate-100 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300 group-hover:-translate-y-0.5">
                 <Activity size={22} className="text-purple-600 group-hover:animate-pulse" strokeWidth={2.5} />
              </div>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-purple-700 transition-colors">Pulse</span>
          </div>

          {/* --- Desktop Navigation (Spread out) --- */}
          <nav className="hidden lg:flex items-center gap-10">
            <NavItem label="Product" hasDropdown />
            <NavItem label="Solutions" hasDropdown />
            <NavItem label="Resources" hasDropdown />
            <NavItem label="Enterprise" />
            <NavItem label="Pricing" />
          </nav>

          {/* --- Desktop Actions --- */}
          <div className="hidden lg:flex items-center gap-6">
            <button 
              onClick={() => navigate('/login')} 
              className="text-sm font-semibold text-slate-600 hover:text-purple-700 transition-colors px-2"
            >
              Log in
            </button>
            
            <div className="h-6 w-px bg-slate-200"></div>

            <button className="text-sm font-semibold text-slate-600 hover:text-purple-700 transition-colors">
              Contact Sales
            </button>

            <button 
              onClick={() => navigate('/signup')} 
              className="group relative px-6 py-3 rounded-full bg-slate-900 text-white font-bold text-sm hover:bg-purple-600 transition-all duration-300 shadow-lg shadow-slate-900/10 hover:shadow-purple-600/20 flex items-center gap-2 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <span className="relative z-10">Get Started</span>
              <ArrowRight size={16} className="relative z-10 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* --- Mobile Menu Button --- */}
          <div className="lg:hidden">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* --- Mobile Menu Dropdown --- */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-white border-b border-slate-200 shadow-2xl py-6 px-6 flex flex-col gap-1 animate-in slide-in-from-top-2">
          {['Product', 'Solutions', 'Resources', 'Enterprise', 'Pricing'].map((item) => (
            <a key={item} href="#" className="flex items-center justify-between text-lg font-medium text-slate-600 hover:text-purple-600 hover:bg-slate-50 py-3 px-2 rounded-lg transition-colors">
              {item}
              <ChevronDown size={16} className="-rotate-90 text-slate-300" />
            </a>
          ))}
          
          <div className="h-px bg-slate-100 my-4"></div>
          
          <div className="flex flex-col gap-4">
            <button 
              onClick={() => navigate('/login')} 
              className="w-full py-3.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              Log in
            </button>
            <button 
              onClick={() => navigate('/signup')} 
              className="w-full py-3.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2"
            >
              Get Started Free <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
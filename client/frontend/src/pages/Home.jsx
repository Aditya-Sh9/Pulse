import React from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { Activity, Zap, Layers, ArrowRight, BarChart3, MessageSquare, CheckCircle2 } from 'lucide-react'

export default function Home({ onAuth }) {
  const navigate = useNavigate()

  const handleDemoClick = () => {
    // Mock authentication for demo
    if (onAuth) onAuth({ name: 'Demo User', email: 'demo@pulse.app' })
    navigate('/dashboard/list/1')
  }

  return (
    <div className="min-h-screen w-full bg-white selection:bg-purple-100 selection:text-purple-700 font-sans text-slate-900 overflow-x-hidden">
      <Navbar />

      {/* ================= HERO SECTION ================= */}
      <div className="relative pt-28 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        
        {/* Subtle Pulse Background Animation */}
        <div className="absolute inset-0 z-0 opacity-90 pointer-events-none">
           <svg className="absolute top-[15%] left-0 w-full h-40 stroke-purple-200" fill="none">
             <path d="M0 64 L200 64 L220 30 L240 90 L260 64 L400 64 L420 20 L440 100 L460 64 L1000 64" strokeWidth="1.5" className="animate-pulse" />
           </svg>
        </div>

        {/* Background Blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full z-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-[500px] h-[500px] bg-purple-200/40 rounded-full mix-blend-multiply filter blur-[120px] animate-blob"></div>
          <div className="absolute top-40 right-10 w-[400px] h-[400px] bg-blue-200/40 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/2 w-[600px] h-[600px] bg-pink-200/40 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-20">
            
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-purple-100 shadow-sm text-purple-700 text-xs font-bold uppercase tracking-wider mb-8 animate-fade-in-up hover:scale-105 transition-transform cursor-default">
              <Activity size={14} className="animate-pulse text-purple-500" />
              The heartbeat of your workflow
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1] text-slate-900">
              Keep your projects <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 animate-gradient-x">
                alive and kicking.
              </span>
            </h1>

            <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
              Pulse is the all-in-one workspace that syncs your team's rhythm. 
              Tasks, Docs, and Goals in one central hub.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-40 group-hover:opacity-75 transition duration-200"></div>
                <button 
                  onClick={() => navigate('/signup')}
                  className="relative px-8 py-4 bg-slate-900 rounded-lg text-white font-bold text-lg shadow-2xl hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                  Start for Free
                  <Zap size={18} fill="currentColor" className="text-yellow-400" />
                </button>
              </div>
              <button 
                onClick={handleDemoClick}
                className="px-8 py-4 bg-white text-slate-700 font-bold text-lg rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
              >
                View Live Demo
              </button>
            </div>
          </div>

          {/* Product Mockup Container */}
          <div className="relative mx-auto max-w-6xl mt-16 group perspective-1000">
            {/* Window Frame */}
            <div className="rounded-xl bg-slate-900 p-2 shadow-2xl ring-1 ring-slate-900/10 transform transition-transform duration-700 hover:rotate-x-1 hover:shadow-purple-500/20">
              <div className="rounded-lg bg-[#15171B] overflow-hidden flex flex-col aspect-[16/9] md:aspect-[21/9]">
                
                {/* Mock Topbar */}
                <div className="h-10 border-b border-white/5 flex items-center px-4 justify-between bg-[#1E2025]">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center text-slate-500 text-xs font-mono">
                    <Activity size={12} className="text-purple-500" /> Pulse_Dashboard.exe
                  </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                  {/* Mock Sidebar */}
                  <div className="w-48 bg-[#15171B] border-r border-white/5 p-3 hidden md:flex flex-col gap-4">
                    <div className="space-y-2">
                       <div className="h-6 w-3/4 bg-white/5 rounded animate-pulse"></div>
                       <div className="h-6 w-full bg-white/5 rounded animate-pulse delay-75"></div>
                       <div className="h-6 w-5/6 bg-white/5 rounded animate-pulse delay-100"></div>
                    </div>
                  </div>

                  {/* Mock Main Content */}
                  <div className="flex-1 bg-[#0F1115] p-6 flex flex-col relative">
                    {/* Floating Pulse Graph */}
                    <div className="absolute right-6 top-6 w-32 h-16 bg-white/5 rounded border border-white/10 flex items-end justify-between px-2 pb-2 backdrop-blur-sm">
                       <div className="w-1 bg-purple-500 h-4 rounded-t"></div>
                       <div className="w-1 bg-purple-500 h-8 rounded-t"></div>
                       <div className="w-1 bg-purple-500 h-6 rounded-t"></div>
                       <div className="w-1 bg-purple-500 h-10 rounded-t"></div>
                       <div className="w-1 bg-purple-500 h-12 rounded-t shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
                       <div className="w-1 bg-slate-600 h-3 rounded-t"></div>
                    </div>

                    <div className="flex justify-between items-end mb-8">
                      <div>
                        <div className="flex gap-2 text-xs text-slate-500 mb-2">
                          <span>Spaces</span>
                          <span>/</span>
                          <span>Product</span>
                        </div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-3">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                          </span>
                          Live Roadmap
                        </h2>
                      </div>
                    </div>

                    {/* Mock List Items */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-4 py-3 border-b border-white/5 text-sm hover:bg-white/5 px-2 -mx-2 transition-colors cursor-default">
                        <div className="w-4 h-4 rounded-full border-2 border-purple-500"></div>
                        <span className="text-slate-200 flex-1 font-medium">Launch v2.0 Beta</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400 bg-purple-500/10 px-2 py-1 rounded">In Pulse</span>
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-[10px] text-white flex items-center justify-center">JD</div>
                      </div>
                      <div className="flex items-center gap-4 py-3 border-b border-white/5 text-sm hover:bg-white/5 px-2 -mx-2 transition-colors cursor-default">
                        <div className="w-4 h-4 rounded-full border-2 border-slate-600"></div>
                        <span className="text-slate-400 flex-1">Update Documentation</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-white/5 px-2 py-1 rounded">Queue</span>
                        <div className="w-6 h-6 rounded-full bg-slate-700 text-[10px] text-white flex items-center justify-center">AS</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= SOCIAL PROOF ================= */}
      <div className="border-y border-slate-100 bg-slate-50/50 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-10">Trusted by fast-moving teams</p>
          <div className="flex flex-wrap justify-center gap-12 md:gap-24 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
            <span className="text-2xl font-black font-serif text-slate-800">NETFLIX</span>
            <span className="text-2xl font-extrabold font-sans text-slate-800 italic">Stripe</span>
            <span className="text-2xl font-bold font-mono text-slate-800">Vercel</span>
            <span className="text-2xl font-extrabold font-sans text-slate-800 tracking-tighter">FIGMA</span>
            <span className="text-2xl font-black font-serif text-slate-800">Linear</span>
          </div>
        </div>
      </div>

      {/* ================= BENTO GRID FEATURES ================= */}
      <div className="py-32 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
              Everything you need to <br/> find your <span className="text-purple-600">flow</span>.
            </h2>
            <p className="text-lg text-slate-500 leading-relaxed">
              Stop toggling between apps. Pulse brings your tasks, docs, and team communication into a single, living operating system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Card 1: Flexible Workflows */}
            <div className="col-span-1 md:col-span-2 bg-slate-50 rounded-[2rem] p-10 border border-slate-100 relative overflow-hidden group hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500">
              <div className="relative z-10">
                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6 shadow-sm group-hover:scale-110 transition-transform">
                  <Layers size={28} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Flexible Workflows</h3>
                <p className="text-slate-500 max-w-md text-lg">Customize your view with Lists, Boards, Calendars, or Gantt charts. Pulse adapts to how your team works best.</p>
              </div>
              
              {/* Abstract UI Decoration */}
              <div className="absolute right-0 bottom-0 w-2/3 h-56 bg-white rounded-tl-3xl shadow-xl border-l border-t border-slate-100 p-6 translate-y-8 translate-x-8 group-hover:translate-x-4 group-hover:translate-y-4 transition-transform duration-500">
                 <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-5 h-5 rounded border-2 border-blue-500"></div>
                      <div className="h-3 w-32 bg-slate-100 rounded-full"></div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-5 h-5 rounded border-2 border-purple-500"></div>
                      <div className="h-3 w-48 bg-slate-100 rounded-full"></div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-5 h-5 rounded border-2 border-pink-500"></div>
                      <div className="h-3 w-24 bg-slate-100 rounded-full"></div>
                    </div>
                 </div>
              </div>
            </div>

            {/* Card 2: Vital Signs (Dark Card) */}
            <div className="bg-[#0F172A] rounded-[2rem] p-10 border border-slate-800 text-white relative overflow-hidden group hover:shadow-2xl hover:shadow-purple-900/20 transition-all duration-500">
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600 rounded-full mix-blend-screen filter blur-[80px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                  <Activity size={28} />
                </div>
                <h3 className="text-2xl font-bold mb-3">Project Vitals</h3>
                <p className="text-slate-400 text-lg">Monitor team velocity and workload in real-time. Spot burnout before it happens.</p>
                
                <div className="mt-10 h-32 flex items-end gap-1.5">
                  {[40, 65, 45, 80, 55, 90, 70, 50, 85].map((h, i) => (
                    <div key={i} className="flex-1 bg-purple-500/30 rounded-t hover:bg-purple-500 transition-colors duration-300" style={{height: `${h}%`}}></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 3: Collab */}
            <div className="bg-white rounded-[2rem] p-10 border border-slate-200 relative overflow-hidden hover:border-purple-200 transition-colors duration-300 group hover:shadow-xl">
              <div className="w-14 h-14 bg-pink-100 rounded-2xl flex items-center justify-center text-pink-600 mb-6 group-hover:scale-110 transition-transform">
                <MessageSquare size={28} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Contextual Chat</h3>
              <p className="text-slate-500 text-lg">Discuss tasks right where the work happens. No more lost threads.</p>
            </div>

            {/* Card 4: Goals */}
            <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-purple-50 to-white rounded-[2rem] p-10 border border-purple-100 relative overflow-hidden group hover:shadow-xl hover:shadow-purple-100 transition-all duration-500">
               <div className="flex flex-col md:flex-row items-center gap-12">
                 <div className="flex-1">
                    <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform">
                      <BarChart3 size={28} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">Set Goals, Smash Them</h3>
                    <p className="text-slate-500 text-lg">Connect daily tasks to high-level company objectives. Keep everyone aligned on the heartbeat of the mission.</p>
                 </div>
                 
                 {/* Floating Card Decoration */}
                 <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 w-full md:w-72 transform rotate-3 group-hover:rotate-0 transition-transform duration-500">
                    <div className="flex justify-between text-base font-bold text-slate-700 mb-3">
                      <span>Q3 Revenue</span>
                      <span className="text-purple-600">82%</span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 w-[82%] relative">
                        <div className="absolute top-0 right-0 bottom-0 w-2 bg-white/30 animate-pulse"></div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 font-medium">
                        <CheckCircle2 size={14} className="text-green-500" /> On Track
                    </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= CTA SECTION ================= */}
      <div className="py-32 bg-[#0F172A] relative overflow-hidden">
         {/* Noise Texture */}
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
         
         {/* Background Pulse Glow */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600 rounded-full mix-blend-screen filter blur-[150px] opacity-20 animate-pulse"></div>
         
         <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tight">
              Ready to find your rhythm?
            </h2>
            <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
              Join the workspace that adapts to you, not the other way around. 
              Start your 14-day free trial today.
            </p>
            <button 
              onClick={() => navigate('/signup')}
              className="px-12 py-5 bg-white text-slate-900 rounded-full font-bold text-lg hover:bg-slate-100 transition-all transform hover:scale-105 shadow-2xl hover:shadow-purple-500/20 flex items-center gap-3 mx-auto"
            >
              Get Started for Free <ArrowRight size={20} />
            </button>
         </div>
      </div>

      {/* ================= FOOTER ================= */}
      <footer className="bg-white border-t border-slate-200 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 font-bold text-2xl text-slate-900 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <Activity size={20} />
                </div>
                Pulse
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                Making the world more productive, <br/> one heartbeat at a time.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-slate-900 mb-6">Product</h4>
              <ul className="space-y-4 text-sm text-slate-500 font-medium">
                <li><a href="#" className="hover:text-purple-600 transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-purple-600 transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-purple-600 transition-colors">Enterprise</a></li>
                <li><a href="#" className="hover:text-purple-600 transition-colors">Changelog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-6">Resources</h4>
              <ul className="space-y-4 text-sm text-slate-500 font-medium">
                <li><a href="#" className="hover:text-purple-600 transition-colors">Docs</a></li>
                <li><a href="#" className="hover:text-purple-600 transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-purple-600 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-purple-600 transition-colors">API</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-6">Company</h4>
              <ul className="space-y-4 text-sm text-slate-500 font-medium">
                <li><a href="#" className="hover:text-purple-600 transition-colors">About</a></li>
                <li><a href="#" className="hover:text-purple-600 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-purple-600 transition-colors">Legal</a></li>
                <li><a href="#" className="hover:text-purple-600 transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-sm text-slate-400 font-medium">© 2026 Pulse Inc. All rights reserved.</div>
            <div className="flex gap-6">
              {/* Social placeholders */}
              <div className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-full hover:bg-slate-100 hover:border-purple-300 hover:text-purple-600 flex items-center justify-center transition-all cursor-pointer text-slate-400">
                 <span className="sr-only">Twitter</span>
                 <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
              </div>
              <div className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-full hover:bg-slate-100 hover:border-purple-300 hover:text-purple-600 flex items-center justify-center transition-all cursor-pointer text-slate-400">
                 <span className="sr-only">GitHub</span>
                 <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
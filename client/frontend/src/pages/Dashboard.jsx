import React, { useRef, useEffect, useState, Suspense } from 'react'
import { Outlet, useLocation, useSearchParams } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import TaskDrawer from '../components/TaskDrawer'
import PulseLoader from '../components/PulseLoader'
import { ProjectProvider, useProject } from '../context/ProjectContext'
import { emitShortcut } from '../utils/shortcuts'

gsap.registerPlugin(useGSAP)

// Opens the task drawer for shared links like /dashboard/list/:projectId?task=<id>
function TaskDeepLink() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { tasks, openTaskDrawer } = useProject()
  const taskId = searchParams.get('task')

  useEffect(() => {
    if (!taskId || tasks.length === 0) return
    const task = tasks.find(t => t.id === taskId)
    if (task) openTaskDrawer(task)
    const next = new URLSearchParams(searchParams)
    next.delete('task')
    setSearchParams(next, { replace: true })
  }, [taskId, tasks, openTaskDrawer, searchParams, setSearchParams])

  return null
}

// Single-key shortcuts (ignored while typing): "/" search, "c" new task, "?" shortcut help
function GlobalShortcuts() {
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return
      const el = e.target
      if (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return
      if (document.querySelector('[aria-modal="true"]')) return

      if (e.key === '/') { e.preventDefault(); emitShortcut('focus-search') }
      else if (e.key === 'c') { e.preventDefault(); emitShortcut('new-task') }
      else if (e.key === '?') { e.preventDefault(); emitShortcut('show-shortcuts') }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  return null
}

const SIDEBAR_COLLAPSED_KEY = 'pulse:sidebarCollapsed'

export default function Dashboard() {
  const { pathname } = useLocation()
  const content = useRef(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true' } catch { return false }
  })

  const toggleCollapsed = () => setCollapsed(c => {
    try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(!c)) } catch { /* storage unavailable */ }
    return !c
  })

  // Close the mobile drawer whenever the route changes
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setMobileNavOpen(false)
  }

  // Each route change eases the new page in, then staggers any [data-stagger] groups.
  // Entrance only: navigation is never held back waiting on an exit tween.
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(content.current,
        { autoAlpha: 0, y: 10 },
        { autoAlpha: 1, y: 0, duration: 0.45, ease: 'expo.out', clearProps: 'transform' })
      const groups = content.current.querySelectorAll('[data-stagger]')
      groups.forEach((g) => {
        gsap.from(g.children, { autoAlpha: 0, y: 14, duration: 0.5, ease: 'expo.out', stagger: 0.05, delay: 0.06, clearProps: 'transform' })
      })
    })
    content.current.scrollTop = 0
  }, { dependencies: [pathname], scope: content, revertOnUpdate: true })

  // Move focus to the new page for keyboard and screen-reader users (skip the first render)
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    content.current?.focus({ preventScroll: true })
  }, [pathname])

  return (
    // Sidebar, TaskDrawer, and all pages (Outlet) share the workspace data
    <ProjectProvider>
      <TaskDeepLink />
      <GlobalShortcuts />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:rounded-lg focus:bg-accent-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>
      <div className="flex w-full h-dvh bg-base text-neutral-200 overflow-hidden">

        <Sidebar
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
        />

        <div className="flex-1 flex flex-col min-w-0 relative">
          <Topbar onOpenNav={() => setMobileNavOpen(true)} />

          {/* Scrollable Content Area */}
          <main id="main-content" ref={content} tabIndex={-1} className="flex-1 overflow-auto relative z-0 custom-scrollbar focus:outline-none">
            {/* Keeps the sidebar/topbar on screen while a lazily loaded page arrives */}
            <Suspense fallback={<PulseLoader label="Loading…" inline />}>
              <Outlet />
            </Suspense>
          </main>

          {/* Fixed-position drawer that slides over everything */}
          <TaskDrawer />

        </div>
      </div>
    </ProjectProvider>
  )
}

import React, { useRef, useEffect, Suspense } from 'react'
import { Outlet, useLocation, useSearchParams } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import TaskDrawer from '../components/TaskDrawer'
import PulseLoader from '../components/PulseLoader'
import { ProjectProvider, useProject } from '../context/ProjectContext'

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

export default function Dashboard() {
  const { pathname } = useLocation()
  const content = useRef(null)

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

  return (
    // Sidebar, TaskDrawer, and all pages (Outlet) share the workspace data
    <ProjectProvider>
      <TaskDeepLink />
      <div className="flex w-full h-dvh bg-base text-neutral-200 overflow-hidden">

        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0 relative">
          <Topbar />

          {/* Scrollable Content Area */}
          <main ref={content} className="flex-1 overflow-auto relative z-0 custom-scrollbar">
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

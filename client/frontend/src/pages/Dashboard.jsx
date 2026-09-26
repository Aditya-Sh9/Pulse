import React, { useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import TaskDrawer from '../components/TaskDrawer' // Import the Drawer
import { ProjectProvider } from '../context/ProjectContext' // Import the Provider

gsap.registerPlugin(useGSAP)

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
    // 1. Wrap the entire Dashboard in the ProjectProvider
    // This ensures Sidebar, TaskDrawer, and all pages (Outlet) can access data
    <ProjectProvider>
      <div className="flex w-full h-dvh bg-base text-neutral-200 overflow-hidden">

        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0 relative">
          <Topbar />

          {/* Scrollable Content Area */}
          <main ref={content} className="flex-1 overflow-auto relative z-0 custom-scrollbar">
            <Outlet />
          </main>

          {/* 2. Add the TaskDrawer here */}
          {/* It uses 'fixed' positioning, so it will slide over everything */}
          <TaskDrawer />

        </div>
      </div>
    </ProjectProvider>
  )
}

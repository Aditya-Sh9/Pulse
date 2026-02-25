import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import TaskDrawer from '../components/TaskDrawer' // Import the Drawer
import { ProjectProvider } from '../context/ProjectContext' // Import the Provider

export default function Dashboard() {
  return (
    // 1. Wrap the entire Dashboard in the ProjectProvider
    // This ensures Sidebar, TaskDrawer, and all pages (Outlet) can access data
    <ProjectProvider>
      <div className="flex w-full h-screen bg-[#111] overflow-hidden">
        
        <Sidebar />
        
        <div className="flex-1 flex flex-col min-w-0 relative">
          <Topbar />
          
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-auto relative z-0">
            <Outlet />
          </div>

          {/* 2. Add the TaskDrawer here */}
          {/* It uses 'fixed' positioning, so it will slide over everything */}
          <TaskDrawer />
          
        </div>
      </div>
    </ProjectProvider>
  )
}
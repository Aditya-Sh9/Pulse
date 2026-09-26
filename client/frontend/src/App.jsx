import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'
import { DataProvider } from './context/DataContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import PulseLoader from './components/PulseLoader'
import { ShieldAlert } from 'lucide-react'

import { AuthLayout } from './components/auth/AuthShell'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import Settings from './pages/Settings'
import Team from './pages/Team'
import Inbox from './pages/Inbox'
import Leaderboard from './pages/Leaderboard'
import ActivityLog from './pages/ActivityLog'

import ListView from './views/ListView'
import BoardView from './views/BoardView'
import CalendarView from './views/CalendarView'
import TableView from './views/TableView'

import DashboardHome from './pages/DashboardHome'

import MyTasks from './pages/MyTasks'

import Messages from './pages/Messages'

import NotFound from './pages/NotFound'

const AdminRoute = ({ children }) => {
  const { userRole, loading } = useAuth()

  if (loading) return <PulseLoader label="Checking permissions…" />

  if (userRole !== 'admin') {
    return (
      <div className="h-full min-h-[70vh] flex items-center justify-center p-8">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-raised ring-1 ring-inset ring-edge">
            <ShieldAlert size={22} className="text-neutral-300" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold text-neutral-50 tracking-tight">Admins only</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">This page is limited to workspace admins. Ask an admin if you need access.</p>
          <Link to="/dashboard" className="mt-6 inline-flex h-10 items-center rounded-lg border border-edge bg-card px-4 text-sm font-medium text-neutral-100 transition-colors hover:bg-raised">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return children
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <DataProvider>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
              </Route>

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              >
                <Route path="my-tasks" element={<MyTasks />} />
                <Route path="list/:projectId" element={<ListView />} />
                <Route path="board/:projectId" element={<BoardView />} />
                <Route path="calendar/:projectId" element={<CalendarView />} />
                <Route path="table/:projectId" element={<TableView />} />
                <Route path="inbox" element={<Inbox />} />
                <Route path="messages" element={<Messages />} />
                <Route path="messages/:userId" element={<Messages />} />

                <Route path="leaderboard" element={<Leaderboard />} />

                {/* Admin Only Routes */}
                <Route
                  path="team"
                  element={
                    <AdminRoute>
                      <Team />
                    </AdminRoute>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <AdminRoute>
                      <Settings />
                    </AdminRoute>
                  }
                />
                <Route
                  path="activity"
                  element={
                    <AdminRoute>
                      <ActivityLog />
                    </AdminRoute>
                  }
                />

                <Route index element={<DashboardHome />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </DataProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App
import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import PulseLoader from './components/PulseLoader'
import { ShieldAlert } from 'lucide-react'

import { AuthLayout } from './components/auth/AuthShell'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Home from './pages/Home'
import NotFound from './pages/NotFound'

// The workspace is split out of the landing/auth bundle and loaded per route
const Dashboard = lazy(() => import('./pages/Dashboard'))
const DashboardHome = lazy(() => import('./pages/DashboardHome'))
const MyTasks = lazy(() => import('./pages/MyTasks'))
const Inbox = lazy(() => import('./pages/Inbox'))
const Messages = lazy(() => import('./pages/Messages'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))
const Team = lazy(() => import('./pages/Team'))
const Settings = lazy(() => import('./pages/Settings'))
const ActivityLog = lazy(() => import('./pages/ActivityLog'))
const ListView = lazy(() => import('./views/ListView'))
const BoardView = lazy(() => import('./views/BoardView'))
const CalendarView = lazy(() => import('./views/CalendarView'))
const TableView = lazy(() => import('./views/TableView'))

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
          <Suspense fallback={<PulseLoader label="Loading…" />}>
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
  
                {/* Team directory and personal settings are for everyone; admin controls are gated inside */}
                <Route path="team" element={<Team />} />
                <Route path="settings" element={<Settings />} />
  
                {/* Admin Only Routes */}
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
          </Suspense>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App
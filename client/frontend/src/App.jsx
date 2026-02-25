import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { DataProvider } from './context/DataContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'

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

  if (loading) return <div className="min-h-screen bg-[#111] flex items-center justify-center text-slate-500">Loading permissions...</div>

  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111] text-white">
        <div className="text-center p-8 border border-red-500/20 bg-red-500/10 rounded-xl">
          <h2 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h2>
          <p className="text-slate-400">You do not have permission to view this page.</p>
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
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

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
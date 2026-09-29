import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PulseLoader from './PulseLoader'

export default function ProtectedRoute({ children }) {
  const { currentUser, loading, needsVerification } = useAuth()
  const location = useLocation()

  if (loading) {
    return <PulseLoader label="Opening your workspace…" />
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // Unconfirmed email/password accounts wait on the confirmation screen
  if (needsVerification) {
    return <Navigate to="/verify-email" replace state={{ from: location }} />
  }

  return children
}

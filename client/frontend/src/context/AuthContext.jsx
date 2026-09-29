import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../config/firebase'

const AuthContext = createContext()

const AUTH_ERRORS = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'No account exists with that email.',
  'auth/email-already-in-use': 'An account with this email already exists. Try logging in.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/invalid-email': 'That email address doesn’t look right.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/user-disabled': 'This account has been disabled. Contact your workspace admin.'
}

export const friendlyAuthError = (err, fallback = 'Something went wrong. Please try again.') =>
  AUTH_ERRORS[err?.code] || fallback

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)
  // Firebase mutates the User object in place; bumping this re-renders consumers after a reload()
  const [, setProfileVersion] = useState(0)

  // Helper: Create user document in Firestore. Role is always 'employee'; Firestore rules enforce it.
  const createUserDocument = async (uid, email, name) => {
    await setDoc(doc(db, 'users', uid), {
      uid,
      email,
      name,
      role: 'employee',
      status: 'offline',
      productivityScore: 0,
      notifications: true,
      favoriteProjects: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }

  // Signup with email and password
  const signup = async (email, password, name) => {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    // Without this, email signups have no displayName anywhere in the app
    await updateProfile(result.user, { displayName: name })
    await createUserDocument(result.user.uid, email, name)
    setProfileVersion(v => v + 1)
    return result.user
  }

  // Login with email and password
  const login = async (email, password, rememberMe = false) => {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result.user
  }

  // Google Sign In
  const googleSignIn = async () => {
    const result = await signInWithPopup(auth, new GoogleAuthProvider())
    const userDoc = await getDoc(doc(db, 'users', result.user.uid))
    if (!userDoc.exists()) {
      await createUserDocument(result.user.uid, result.user.email, result.user.displayName || 'Google User')
    }
    return result.user
  }

  const resetPassword = (email) => sendPasswordResetEmail(auth, email)

  // Logout
  const logout = async () => {
    if (auth.currentUser) {
      // Optimistic offline update before signOut drops the connection
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { status: 'offline' }).catch(() => { })
    }
    await signOut(auth)
  }

  // Helper: Get secure ID Token for Node.js Backend API
  const getAuthToken = useCallback(async () => {
    return auth.currentUser ? auth.currentUser.getIdToken() : null
  }, [])

  // Re-read the Auth profile (e.g. after the backend changed displayName) and refresh the token claims
  const refreshUser = useCallback(async () => {
    if (!auth.currentUser) return
    await auth.currentUser.reload()
    await auth.currentUser.getIdToken(true)
    setProfileVersion(v => v + 1)
  }, [])

  // Listen for auth state changes, then follow the user's own document so role changes apply live
  useEffect(() => {
    let unsubscribeProfile = null

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeProfile?.()
      unsubscribeProfile = null

      if (!user) {
        setCurrentUser(null)
        setUserRole(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setCurrentUser(user)
      unsubscribeProfile = onSnapshot(
        doc(db, 'users', user.uid),
        (snap) => {
          setUserRole(snap.exists() ? (snap.data().role || 'employee') : 'employee')
          setLoading(false)
        },
        (err) => {
          console.error('Error fetching user role:', err)
          setUserRole('employee')
          setLoading(false)
        }
      )
    })

    return () => {
      unsubscribeAuth()
      unsubscribeProfile?.()
    }
  }, [])

  const value = {
    currentUser,
    userRole,
    loading,
    signup,
    login,
    googleSignIn,
    resetPassword,
    logout,
    getAuthToken,
    refreshUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

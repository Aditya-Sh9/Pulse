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
  sendEmailVerification,
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
  'auth/user-disabled': 'This account has been disabled. Contact your workspace admin.',
  'auth/user-token-expired': 'Your session expired. Please log in again.',
  'auth/requires-recent-login': 'Your session expired. Please log in again.',
  'auth/unauthorized-continue-uri': 'This site’s domain isn’t authorised in Firebase yet, so the email can’t be sent. Ask the workspace admin to add it under Authentication → Authorized domains.',
  'auth/invalid-continue-uri': 'The confirmation link is misconfigured. Ask the workspace admin to check the app URL.',
  'auth/missing-continue-uri': 'The confirmation link is misconfigured. Ask the workspace admin to check the app URL.',
  'auth/quota-exceeded': 'The email service has hit its sending limit for now. Try again later.',
  'auth/internal-error': 'The email service had a temporary problem. Try again in a moment.'
}

// The seeded admin account uses a placeholder address with no inbox, so it is exempt
const VERIFICATION_EXEMPT_EMAILS = ['admin@gmail.com']

// Email/password accounts must confirm their address; Google accounts arrive verified
export const needsEmailVerification = (user) =>
  !!user && !user.emailVerified && !VERIFICATION_EXEMPT_EMAILS.includes(user.email) &&
  user.providerData.some(p => p.providerId === 'password')

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

  // The link in the email lands on the dashboard; the waiting tab also detects it and continues on its own
  const sendVerification = useCallback(async () => {
    if (!auth.currentUser) {
      const err = new Error('Your session expired. Please log in again.')
      err.code = 'auth/user-token-expired'
      throw err
    }
    await sendEmailVerification(auth.currentUser, { url: `${window.location.origin}/dashboard` })
  }, [])

  // Signup with email and password. Returns { user, verificationError } so a failed
  // email send doesn't look like a failed signup (the account already exists).
  const signup = async (email, password, name) => {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    // Without this, email signups have no displayName anywhere in the app
    await updateProfile(result.user, { displayName: name })
    await createUserDocument(result.user.uid, email, name)
    let verificationError = null
    try {
      await sendVerification()
    } catch (err) {
      verificationError = err
    }
    setProfileVersion(v => v + 1)
    return { user: result.user, verificationError }
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

  // After choosing a new password, Firebase's handler page links back to our login
  const resetPassword = (email) => sendPasswordResetEmail(auth, email, { url: `${window.location.origin}/login` })

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

  // Re-read the user from Firebase; once verified, refresh the ID token so the backend
  // and Firestore rules see `email_verified: true`. Returns the current verified state.
  const refreshVerification = useCallback(async () => {
    if (!auth.currentUser) return false
    await auth.currentUser.reload()
    const verified = !needsEmailVerification(auth.currentUser)
    if (verified) {
      await auth.currentUser.getIdToken(true)
      setProfileVersion(v => v + 1)
    }
    return verified
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
    sendVerification,
    refreshVerification,
    needsVerification: needsEmailVerification(currentUser),
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

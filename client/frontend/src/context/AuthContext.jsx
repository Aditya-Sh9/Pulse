import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth'
import { doc, setDoc, getDoc, collection, updateDoc } from 'firebase/firestore'
import { auth, db } from '../config/firebase'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Helper: Fetch user role from Firestore
  const fetchUserRole = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid))
      if (userDoc.exists()) {
        return userDoc.data().role || 'employee'
      }
      return 'employee'
    } catch (err) {
      console.error('Error fetching user role:', err)
      return 'employee'
    }
  }

  // Helper: Create user document in Firestore
  const createUserDocument = async (uid, email, name, role = 'employee') => {
    try {
      await setDoc(doc(db, 'users', uid), {
        uid,
        email,
        name,
        role,
        status: 'offline',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    } catch (err) {
      console.error('Error creating user document:', err)
      throw err
    }
  }

  // Signup with email and password
  const signup = async (email, password, name, role = 'employee') => {
    try {
      setError(null)
      const result = await createUserWithEmailAndPassword(auth, email, password)
      const uid = result.user.uid

      // Create user document in Firestore
      await createUserDocument(uid, email, name, role)

      setCurrentUser(result.user)
      setUserRole(role)
      return result.user
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  // Login with email and password
  const login = async (email, password, rememberMe = false) => {
    try {
      setError(null)
      // Set persistence based on rememberMe flag
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
      const result = await signInWithEmailAndPassword(auth, email, password)
      const uid = result.user.uid

      // Fetch user role from Firestore
      const role = await fetchUserRole(uid)

      setCurrentUser(result.user)
      setUserRole(role)
      return result.user
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  // Google Sign In
  const googleSignIn = async () => {
    try {
      setError(null)
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const uid = result.user.uid
      const email = result.user.email
      const displayName = result.user.displayName || 'Google User'

      // Check if user document exists; if not, create it
      const userDoc = await getDoc(doc(db, 'users', uid))
      if (!userDoc.exists()) {
        await createUserDocument(uid, email, displayName, 'employee')
        setUserRole('employee')
      } else {
        const role = userDoc.data().role || 'employee'
        setUserRole(role)
      }

      setCurrentUser(result.user)
      return result.user
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  // Logout
  const logout = async () => {
    try {
      setError(null)
      if (currentUser) {
        // Optimistic offline update before signOut drops the connection
        await updateDoc(doc(db, 'users', currentUser.uid), { status: 'offline' }).catch(() => { })
      }
      await signOut(auth)
      setCurrentUser(null)
      setUserRole(null)
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  // Helper: Get secure ID Token for Node.js Backend API
  const getAuthToken = async () => {
    if (auth.currentUser) {
      return await auth.currentUser.getIdToken();
    }
    return null;
  }

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user)
        const role = await fetchUserRole(user.uid)
        setUserRole(role)
      } else {
        setCurrentUser(null)
        setUserRole(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  // Handle tab close for offline status - REMOVED
  // The backend socket.io connection now robustly handles online/offline status
  // tracking across multiple tabs, making the beforeunload handler obsolete.

  const value = {
    currentUser,
    userRole,
    loading,
    error,
    signup,
    login,
    googleSignIn,
    logout,
    getAuthToken
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
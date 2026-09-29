import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Auth and Firestore
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Opt-in local Firebase Emulator Suite (dev only): set VITE_USE_EMULATORS=true
// and run `firebase emulators:start --only auth,firestore` from the repo root.
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, import.meta.env.VITE_AUTH_EMULATOR_URL || 'http://127.0.0.1:9099', { disableWarnings: true })
  const [host, port] = (import.meta.env.VITE_FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':')
  connectFirestoreEmulator(db, host, Number(port))
  const [sHost, sPort] = (import.meta.env.VITE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199').split(':')
  connectStorageEmulator(storage, sHost, Number(sPort))
}

export default app

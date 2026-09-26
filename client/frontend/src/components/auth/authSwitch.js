import { createContext, useContext } from 'react'

// Provided by AuthLayout: switchTo('/login' | '/signup') animates the form out, then routes.
export const AuthSwitchContext = createContext(null)
export const useAuthSwitch = () => useContext(AuthSwitchContext)

import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import { AuthForm, AuthField, AuthError, PrimaryButton, GoogleButton, Divider } from '../components/auth/AuthShell'
import { useAuthSwitch } from '../components/auth/authSwitch'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const switchTo = useAuthSwitch()
  // Return to the page that sent the user here (e.g. a deep link from the landing page)
  const redirectTo = location.state?.from?.pathname || '/dashboard'
  const { login, googleSignIn, error: authError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(email, password, rememberMe)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setIsLoading(true)

    try {
      await googleSignIn()
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err.message || 'Google sign in failed.')
      setIsLoading(false)
    }
  }

  return (
    <AuthForm
      title="Log in to Pulse"
      subtitle="Welcome back. Pick up where your team left off."
      footer={
        <>
          New to Pulse?{' '}
          <button
            type="button"
            className="font-semibold text-neutral-100 underline decoration-edge-2 underline-offset-4 transition-colors hover:decoration-accent-400"
            onClick={() => switchTo('/signup')}
          >
            Create an account
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthField
          id="login-email"
          label="Email"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <AuthField
          id="login-password"
          label="Password"
          icon={Lock}
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div data-auth-item className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2.5 text-neutral-400 transition-colors hover:text-neutral-200">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-edge-2 bg-card text-accent-500 focus:ring-accent-400/30 focus:ring-offset-0"
            />
            Keep me signed in
          </label>
          <button type="button" className="text-neutral-400 transition-colors hover:text-neutral-100">Forgot password?</button>
        </div>

        {(error || authError) && <AuthError>{error || authError}</AuthError>}

        <PrimaryButton type="submit" disabled={isLoading} loading={isLoading} loadingLabel="Logging in…">
          Log in
          <ArrowRight size={18} aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </PrimaryButton>
      </form>

      <Divider />

      <GoogleButton onClick={handleGoogleSignIn} disabled={isLoading}>
        Continue with Google
      </GoogleButton>
    </AuthForm>
  )
}

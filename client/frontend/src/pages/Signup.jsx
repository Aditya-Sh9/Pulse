import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, User, ArrowRight } from 'lucide-react'
import { AuthForm, AuthField, AuthError, PrimaryButton, GoogleButton, Divider } from '../components/auth/AuthShell'
import { useAuthSwitch } from '../components/auth/authSwitch'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const navigate = useNavigate()
  const location = useLocation()
  const switchTo = useAuthSwitch()
  // Return to the page that sent the user here (e.g. a deep link from the landing page)
  const redirectTo = location.state?.from?.pathname || '/dashboard'
  const { signup, googleSignIn, error: authError } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Role state removed - defaulting to 'employee' in logic
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Hardcoded 'employee' role here for security
      await signup(email, password, name, 'employee')
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.')
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setError('')
    setIsLoading(true)

    try {
      await googleSignIn()
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err.message || 'Google sign up failed.')
      setIsLoading(false)
    }
  }

  return (
    <AuthForm
      title="Create your account"
      subtitle="Join your team’s workspace. It takes under a minute."
      footer={
        <>
          Already have an account?{' '}
          <button
            type="button"
            className="font-semibold text-neutral-100 underline decoration-edge-2 underline-offset-4 transition-colors hover:decoration-accent-400"
            onClick={() => switchTo('/login')}
          >
            Log in
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthField
          id="signup-name"
          label="Full name"
          icon={User}
          type="text"
          autoComplete="name"
          placeholder="Riya Kapoor"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <AuthField
          id="signup-email"
          label="Work email"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <AuthField
          id="signup-password"
          label="Password"
          icon={Lock}
          type="password"
          autoComplete="new-password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {(error || authError) && <AuthError>{error || authError}</AuthError>}

        <PrimaryButton type="submit" disabled={isLoading} loading={isLoading} loadingLabel="Creating account…">
          Create account
          <ArrowRight size={18} aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </PrimaryButton>
      </form>

      <Divider />

      <GoogleButton onClick={handleGoogleSignUp} disabled={isLoading}>
        Continue with Google
      </GoogleButton>
    </AuthForm>
  )
}

import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, User, ArrowRight } from 'lucide-react'
import { AuthForm, AuthField, AuthError, PrimaryButton, GoogleButton, Divider } from '../components/auth/AuthShell'
import { useAuthSwitch } from '../components/auth/authSwitch'
import { useAuth, friendlyAuthError } from '../context/AuthContext'

export default function Signup() {
  const navigate = useNavigate()
  const location = useLocation()
  const switchTo = useAuthSwitch()
  // Return to the page that sent the user here (e.g. a deep link from the landing page)
  const redirectTo = location.state?.from?.pathname || '/dashboard'
  const { signup, googleSignIn } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // New accounts are always employees; Firestore rules reject anything else.
      // Email/password accounts confirm their address before entering the workspace.
      const { verificationError } = await signup(email.trim(), password, name.trim())
      navigate('/verify-email', {
        replace: true,
        state: {
          justSignedUp: true,
          from: { pathname: redirectTo },
          sendError: verificationError ? { code: verificationError.code, message: verificationError.message } : undefined
        }
      })
    } catch (err) {
      setError(friendlyAuthError(err, 'Signup failed. Please try again.'))
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
      setError(friendlyAuthError(err, 'Google sign up failed.'))
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
          maxLength={60}
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
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <AuthError>{error}</AuthError>}

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

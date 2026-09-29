import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { MailCheck, RefreshCw, LogOut, CheckCircle2, Loader2 } from 'lucide-react'
import { AuthForm, AuthError, PrimaryButton } from '../components/auth/AuthShell'
import { useAuth, friendlyAuthError } from '../context/AuthContext'

const RESEND_COOLDOWN_S = 60
const POLL_MS = 3000
const COOLDOWN_KEY = 'pulse:verifyEmailSentAt'

const secondsSinceLastSend = () => {
  try {
    const at = Number(sessionStorage.getItem(COOLDOWN_KEY))
    return at ? Math.floor((Date.now() - at) / 1000) : Infinity
  } catch {
    return Infinity
  }
}
const markSent = () => {
  try { sessionStorage.setItem(COOLDOWN_KEY, String(Date.now())) } catch { /* storage unavailable */ }
}

// Shown to email/password accounts until they confirm their address.
// Polls Firebase and continues into the workspace automatically once the link is clicked.
export default function VerifyEmail() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, loading, needsVerification, sendVerification, refreshVerification, logout } = useAuth()

  // Signup passes along whether the first email failed to send
  const initialError = location.state?.sendError
  const justSignedUp = !!location.state?.justSignedUp
  const redirectTo = location.state?.from?.pathname || '/dashboard'

  const [error, setError] = useState(initialError ? friendlyAuthError(initialError, 'We couldn’t send the confirmation email.') : '')
  const [notice, setNotice] = useState('')
  const [sending, setSending] = useState(false)
  const [checking, setChecking] = useState(false)
  const [verified, setVerified] = useState(false)
  const [lastSendFailed, setLastSendFailed] = useState(!!initialError)
  // First email was just sent by signup, so start the cooldown; after a failed send allow an immediate retry
  const [cooldown, setCooldown] = useState(() => {
    if (initialError) return 0
    if (justSignedUp) { markSent(); return RESEND_COOLDOWN_S }
    return Math.max(0, RESEND_COOLDOWN_S - secondsSinceLastSend())
  })
  const continuing = useRef(false)

  const proceed = useCallback(() => {
    if (continuing.current) return
    continuing.current = true
    setVerified(true)
    try { sessionStorage.removeItem(COOLDOWN_KEY) } catch { /* storage unavailable */ }
    // Brief confirmation, then straight into the workspace
    setTimeout(() => navigate(redirectTo, { replace: true }), 1200)
  }, [navigate, redirectTo])

  const check = useCallback(async ({ manual = false } = {}) => {
    if (continuing.current) return
    if (manual) { setChecking(true); setNotice(''); setError('') }
    try {
      if (await refreshVerification()) proceed()
      else if (manual) setNotice('Not confirmed yet. Open the link in the email, then come back here.')
    } catch (err) {
      if (manual) setError(friendlyAuthError(err, 'Couldn’t check your status. Check your connection and try again.'))
    } finally {
      if (manual) setChecking(false)
    }
  }, [refreshVerification, proceed])

  // Poll while the page is open, and re-check as soon as the tab regains focus
  useEffect(() => {
    if (!currentUser || !needsVerification) return
    const id = setInterval(() => { if (!document.hidden) check() }, POLL_MS)
    const onFocus = () => check()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [currentUser, needsVerification, check])

  // Resend countdown
  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  const handleResend = async () => {
    setSending(true)
    setError('')
    setNotice('')
    try {
      await sendVerification()
      markSent()
      setLastSendFailed(false)
      setCooldown(RESEND_COOLDOWN_S)
      setNotice(`A new confirmation email is on its way to ${currentUser.email}.`)
    } catch (err) {
      setError(friendlyAuthError(err, 'We couldn’t send the email. Please try again in a moment.'))
      setLastSendFailed(true)
      // Firebase throttles repeated sends; make the user wait before retrying
      if (err?.code === 'auth/too-many-requests') setCooldown(RESEND_COOLDOWN_S)
    } finally {
      setSending(false)
    }
  }

  const handleSignOut = async () => {
    await logout().catch(() => {})
    navigate('/login', { replace: true })
  }

  if (loading) return null
  if (!currentUser) return <Navigate to="/login" replace />
  if (!needsVerification && !verified) return <Navigate to={redirectTo} replace />

  if (verified) {
    return (
      <AuthForm title="Email confirmed" subtitle="Thanks! Taking you to your workspace…">
        <div data-auth-item role="status" className="flex items-center gap-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 size={18} aria-hidden="true" /> Your account is ready.
        </div>
      </AuthForm>
    )
  }

  return (
    <AuthForm
      title="Confirm your email"
      subtitle="One last step before you get into Pulse."
      footer={
        <>
          Wrong address or different account?{' '}
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1 font-semibold text-neutral-100 underline decoration-edge-2 underline-offset-4 transition-colors hover:decoration-accent-400"
          >
            <LogOut size={13} aria-hidden="true" /> Sign out
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div data-auth-item className="flex gap-4 rounded-xl border border-raised bg-card p-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-accent-500/15 ring-1 ring-inset ring-accent-400/25">
            <MailCheck size={20} className="text-accent-300" aria-hidden="true" />
          </div>
          <div className="min-w-0 text-sm leading-relaxed text-neutral-300">
            {lastSendFailed ? 'We tried to send a confirmation link to ' : 'We sent a confirmation link to '}
            <strong className="text-neutral-50 [overflow-wrap:anywhere]">{currentUser.email}</strong>.
            {' '}Open it to activate your account. This page continues automatically once you do.
          </div>
        </div>

        <p data-auth-item className="flex items-center gap-2 text-xs text-neutral-400" role="status" aria-live="polite">
          <Loader2 size={13} className="animate-spin" aria-hidden="true" /> Waiting for confirmation…
        </p>

        {error && <AuthError>{error}</AuthError>}
        {notice && !error && (
          <p role="status" className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-2.5 text-sm text-emerald-300">{notice}</p>
        )}

        <PrimaryButton type="button" onClick={() => check({ manual: true })} disabled={checking} loading={checking} loadingLabel="Checking…">
          <CheckCircle2 size={18} aria-hidden="true" /> I’ve confirmed my email
        </PrimaryButton>

        <button
          type="button"
          data-auth-item
          onClick={handleResend}
          disabled={sending || cooldown > 0}
          aria-describedby="resend-hint"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-edge bg-card font-medium text-neutral-100 transition-colors duration-200 hover:border-edge-2 hover:bg-raised disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={16} className={sending ? 'animate-spin' : ''} aria-hidden="true" />
          {sending ? 'Sending…' : cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend confirmation email'}
        </button>
        <p id="resend-hint" data-auth-item className="text-xs text-neutral-400">
          Can’t find it? Check your spam or promotions folder. The link expires after a while, so request a new one if it doesn’t work.
        </p>
      </div>
    </AuthForm>
  )
}

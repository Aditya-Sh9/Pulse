import React, { useRef } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ArrowLeft } from 'lucide-react'
import { AuthSwitchContext } from './authSwitch'

gsap.registerPlugin(useGSAP)

const ECG = 'M0 60 H120 L136 60 L146 34 L160 88 L174 20 L186 60 H300 L312 60 L320 48 L332 72 L342 60 H480'

const MODES = [
  { path: '/login', label: 'Log in' },
  { path: '/signup', label: 'Create account' },
]
const order = (path) => Math.max(0, MODES.findIndex((m) => m.path === path))

// Persistent layout for /login and /signup: the brand panel and mode switch stay
// mounted, only the form panel transitions between routes. Switching slides the
// current form out toward the side it sits on in the switch, then routes
// (direction-aware crossfade adapted from 21st.dev "Auth Form").
export function AuthLayout() {
  const root = useRef(null)
  const panel = useRef(null)
  const pill = useRef(null)
  const tabs = useRef([])
  const leaving = useRef(false)
  const direction = useRef(0)
  const navigate = useNavigate()
  const location = useLocation()
  const { pathname } = location

  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // First mount: draw the trace, stagger the brand copy
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const trace = root.current.querySelector('[data-trace]')
      const len = trace.getTotalLength()
      gsap.fromTo(trace, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', delay: 0.2 })
      gsap.from('[data-brand-item]', { autoAlpha: 0, y: 10, duration: 0.7, ease: 'expo.out', stagger: 0.08, delay: 0.1, clearProps: 'transform' })
    })
  }, { scope: root })

  // Every route: slide the switch pill under the active mode, bring the form in
  useGSAP(() => {
    leaving.current = false
    const isMode = MODES.some((m) => m.path === pathname)
    const tab = isMode ? tabs.current[order(pathname)] : null
    const instant = reduced() || gsap.getProperty(pill.current, 'width') === 0
    if (tab) gsap.to(pill.current, { x: tab.offsetLeft, width: tab.offsetWidth, autoAlpha: 1, duration: instant ? 0 : 0.5, ease: 'expo.out' })
    else gsap.set(pill.current, { autoAlpha: 0 })

    if (reduced()) return
    const dir = direction.current
    gsap.fromTo(panel.current, { autoAlpha: 0, x: dir * 24 }, { autoAlpha: 1, x: 0, duration: 0.5, ease: 'expo.out', clearProps: 'transform' })
    gsap.from(panel.current.querySelectorAll('[data-auth-item]'), {
      autoAlpha: 0, y: dir ? 0 : 14, x: dir * 10, duration: 0.5, ease: 'expo.out', stagger: 0.035, delay: 0.04, clearProps: 'transform',
    })
  }, { dependencies: [pathname], scope: root })

  const switchTo = (path) => {
    if (path === pathname || leaving.current) return
    direction.current = order(path) > order(pathname) ? 1 : -1
    const go = () => navigate(path, { state: location.state })
    if (reduced()) return go()
    leaving.current = true
    const tab = tabs.current[order(path)]
    if (tab) gsap.to(pill.current, { x: tab.offsetLeft, width: tab.offsetWidth, duration: 0.5, ease: 'expo.out' })
    gsap.to(panel.current, { autoAlpha: 0, x: -direction.current * 24, duration: 0.2, ease: 'power2.in', onComplete: go })
  }

  return (
    <AuthSwitchContext.Provider value={switchTo}>
      <div ref={root} className="min-h-dvh bg-base text-neutral-200 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Brand panel */}
        <aside className="relative hidden lg:flex flex-col justify-between border-r border-raised bg-panel p-12 overflow-hidden">
          <Link to="/" data-brand-item className="inline-flex items-center gap-2.5 self-start rounded-md">
            <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
              <rect width="32" height="32" rx="7" className="fill-neutral-50" />
              <path d="M5 17h5l2.5-6 4 11 3-8 1.5 3H27" fill="none" className="stroke-base" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-lg font-bold tracking-tight text-neutral-50">Pulse</span>
          </Link>

          <div>
            <svg viewBox="0 0 480 120" className="mb-10 w-full max-w-md" aria-hidden="true">
              <path data-trace d={ECG} fill="none" className="stroke-accent-400" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
            <p data-brand-item className="max-w-md text-[32px] leading-[1.15] font-semibold tracking-[-0.025em] text-neutral-50">
              Your team’s work, updated the moment it changes.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-neutral-400">
              {['Board, list, table and calendar views over the same tasks', 'Direct messages next to the work', 'Roles for admins and members'].map((t) => (
                <li key={t} data-brand-item className="flex items-center gap-3">
                  <span className="h-px w-4 bg-neutral-600" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <p data-brand-item className="text-xs text-neutral-500">ISC License</p>
        </aside>

        {/* Form side */}
        <div className="flex flex-col px-6 py-8 sm:px-10">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="inline-flex items-center gap-1.5 rounded-md text-sm text-neutral-400 transition-colors hover:text-neutral-100">
              <ArrowLeft size={16} aria-hidden="true" /> Back to home
            </Link>

            <nav aria-label="Account" className="relative flex rounded-lg border border-raised bg-card p-1">
              <span ref={pill} aria-hidden="true" className="absolute inset-y-1 left-0 w-0 rounded-md bg-raised ring-1 ring-inset ring-edge" />
              {MODES.map((m, i) => (
                <a
                  key={m.path}
                  ref={(el) => (tabs.current[i] = el)}
                  href={m.path}
                  aria-current={pathname === m.path ? 'page' : undefined}
                  onClick={(e) => { e.preventDefault(); switchTo(m.path) }}
                  className={`relative z-10 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors duration-300 ${
                    pathname === m.path ? 'text-neutral-50' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {m.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex flex-1 items-center justify-center py-10">
            <div ref={panel} className="w-full max-w-[400px]">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </AuthSwitchContext.Provider>
  )
}

// Page content for a mode: heading, form, footer.
export function AuthForm({ title, subtitle, children, footer }) {
  return (
    <>
      <h1 data-auth-item className="text-[28px] leading-tight font-semibold tracking-[-0.02em] text-neutral-50">{title}</h1>
      <p data-auth-item className="mt-2 text-neutral-400">{subtitle}</p>
      <div className="mt-8">{children}</div>
      {footer && <div data-auth-item className="mt-8 border-t border-raised pt-6 text-sm text-neutral-400">{footer}</div>}
    </>
  )
}

export function AuthField({ id, label, icon: Icon, ...props }) {
  return (
    <div data-auth-item className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-neutral-300">{label}</label>
      <div className="relative">
        <Icon size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input
          id={id}
          {...props}
          className="h-12 w-full rounded-lg border border-edge bg-card pl-11 pr-4 text-[15px] text-neutral-100 placeholder-neutral-600 transition-[border-color,box-shadow] duration-200 hover:border-edge-2 focus:border-accent-400 focus:outline-none focus:ring-4 focus:ring-accent-400/15"
        />
      </div>
    </div>
  )
}

export function AuthError({ children }) {
  return (
    <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 animate-in fade-in slide-in-from-top-1">
      {children}
    </div>
  )
}

export function PrimaryButton({ loading, loadingLabel, children, ...props }) {
  return (
    <button
      {...props}
      data-auth-item
      className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-neutral-50 font-semibold text-[var(--color-base)] transition-[background-color,transform] duration-200 hover:bg-white active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-base/25 border-t-base" aria-hidden="true" />
          {loadingLabel}
        </>
      ) : children}
    </button>
  )
}

export function GoogleButton({ children, ...props }) {
  return (
    <button
      type="button"
      {...props}
      data-auth-item
      className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-edge bg-card font-medium text-neutral-100 transition-colors duration-200 hover:border-edge-2 hover:bg-raised disabled:cursor-not-allowed disabled:opacity-60"
    >
      <img src="/logos/google.svg" alt="" width="18" height="18" className="h-[18px] w-[18px]" />
      {children}
    </button>
  )
}

export function Divider() {
  return (
    <div data-auth-item className="my-6 flex items-center gap-3 text-xs text-neutral-500">
      <span className="h-px flex-1 bg-raised" /> or <span className="h-px flex-1 bg-raised" />
    </div>
  )
}

import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ArrowRight, Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PulseMark from './landing/PulseMark'
import AppLink from './landing/AppLink'
import { sections, REPO_URL } from './landing/siteMap'

gsap.registerPlugin(useGSAP)

const ring = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal'

export default function Navbar() {
  const { currentUser } = useAuth()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('')
  const menuRef = useRef(null)
  const buttonRef = useRef(null)

  // Hairline + solid background only once the page has moved
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Highlight the section currently in view
  useEffect(() => {
    const targets = sections.map((s) => document.querySelector(s.href)).filter(Boolean)
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(`#${e.target.id}`)),
      { rootMargin: '-45% 0px -50% 0px' }
    )
    targets.forEach((t) => io.observe(t))
    return () => io.disconnect()
  }, [])

  // Escape closes the mobile menu and returns focus to its toggle
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useGSAP(() => {
    if (!open || !menuRef.current) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from(menuRef.current, { autoAlpha: 0, y: -8, duration: 0.22, ease: 'power2.out' })
      gsap.from(menuRef.current.querySelectorAll('[data-menu-item]'), {
        autoAlpha: 0, y: -6, duration: 0.24, stagger: 0.03, ease: 'power2.out', delay: 0.04,
      })
    })
  }, { dependencies: [open] })

  const close = () => setOpen(false)

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-200 ${
        scrolled || open ? 'border-b border-rule bg-paper/95 backdrop-blur-sm' : 'border-b border-transparent bg-paper/0'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="Pulse home" className={`rounded-md ${ring}`}>
          <PulseMark />
        </Link>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {sections.map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  aria-current={active === s.href ? 'true' : undefined}
                  className={`relative rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${ring} ${
                    active === s.href ? 'text-ink' : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  {s.label}
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-3 -bottom-0.5 h-px origin-left bg-ink transition-transform duration-300 ${
                      active === s.href ? 'scale-x-100' : 'scale-x-0'
                    }`}
                  />
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className={`rounded-md px-3 py-2 text-sm font-medium text-ink-3 transition-colors hover:text-ink ${ring}`}
          >
            GitHub
          </a>
          {currentUser ? (
            <AppLink
              to="/dashboard"
              className={`group inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-signal-strong ${ring}`}
            >
              Open dashboard
              <ArrowRight size={16} aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </AppLink>
          ) : (
            <>
              <AppLink to="/login" className={`rounded-md px-3 py-2 text-sm font-semibold text-ink transition-colors hover:text-signal ${ring}`}>
                Log in
              </AppLink>
              <AppLink
                to="/signup"
                className={`rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-signal-strong ${ring}`}
              >
                Create account
              </AppLink>
            </>
          )}
        </div>

        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          className={`-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink transition-colors hover:bg-paper-2 md:hidden ${ring}`}
        >
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <div id="mobile-menu" ref={menuRef} className="border-t border-rule bg-paper px-4 pb-6 pt-2 md:hidden">
          <ul className="flex flex-col">
            {sections.map((s) => (
              <li key={s.href} data-menu-item>
                <a href={s.href} onClick={close} className={`flex min-h-12 items-center rounded-md px-2 text-base font-medium text-ink ${ring}`}>
                  {s.label}
                </a>
              </li>
            ))}
            <li data-menu-item>
              <a href={REPO_URL} target="_blank" rel="noreferrer" className={`flex min-h-12 items-center rounded-md px-2 text-base font-medium text-ink ${ring}`}>
                GitHub
              </a>
            </li>
          </ul>
          <div className="mt-4 grid gap-3 border-t border-rule pt-4" data-menu-item>
            {currentUser ? (
              <AppLink to="/dashboard" className={`flex h-12 items-center justify-center rounded-lg bg-ink font-semibold text-paper ${ring}`}>
                Open dashboard
              </AppLink>
            ) : (
              <>
                <AppLink to="/login" className={`flex h-12 items-center justify-center rounded-lg border border-rule font-semibold text-ink ${ring}`}>
                  Log in
                </AppLink>
                <AppLink to="/signup" className={`flex h-12 items-center justify-center rounded-lg bg-ink font-semibold text-paper ${ring}`}>
                  Create account
                </AppLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

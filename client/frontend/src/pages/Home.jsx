import React, { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { ArrowRight, ArrowUpRight, ShieldCheck } from 'lucide-react'
import Navbar from '../components/Navbar'
import HeroBoard from '../components/landing/HeroBoard'
import ViewsShowcase from '../components/landing/ViewsShowcase'
import PulseMark from '../components/landing/PulseMark'
import AppLink from '../components/landing/AppLink'
import HomeLink from '../components/landing/HomeLink'
import { workspacePages, projectViews, adminPages, sections, REPO_URL } from '../components/landing/siteMap'
import { useAuth } from '../context/AuthContext'
import useSmoothScroll from '../hooks/useSmoothScroll'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const ring = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal'

const features = [
  { n: '01', title: 'Live by default', to: '/dashboard',
    body: 'Tasks, projects and notifications stream from Firestore listeners, so a card moved on one laptop moves on every open board. No refresh button, no stale columns.' },
  { n: '02', title: 'Roles that mean something', to: '/dashboard/team',
    body: 'Admins invite people by email, manage members, change settings and read the activity log. Members get a focused workspace without the controls they don’t need.' },
  { n: '03', title: 'Conversation next to the work', to: '/dashboard/messages',
    body: 'Direct messages travel over Socket.io and are stored in MongoDB, with online presence, so the question about a task lives beside the task.' },
  { n: '04', title: 'An inbox, not a firehose', to: '/dashboard/inbox',
    body: 'Assignments, mentions and invites land in one feed you can mark read. Read notifications older than a week are cleared nightly.' },
  { n: '05', title: 'Progress you can see', to: '/dashboard/leaderboard',
    body: 'Home shows totals, completion rate and upcoming deadlines. The leaderboard turns closed tasks into XP, with seasons an admin can reset.' },
  { n: '06', title: 'A record of what happened', to: '/dashboard/activity',
    body: 'The activity log keeps a filterable history of the workspace, so “who changed this?” has an answer.' },
]

const flows = [
  { label: 'Tasks', steps: ['You move a card', 'Written to Firestore', 'Every open board updates'] },
  { label: 'Messages', steps: ['You send a message', 'Socket.io → Express', 'Saved to MongoDB, pushed to them'] },
  { label: 'Access', steps: ['Sign in with email or Google', 'Firebase issues an ID token', 'API checks token and role'] },
]

const stack = [
  ['React', 'react'], ['Vite', 'vite'], ['Tailwind CSS', 'tailwind'], ['Node.js', 'nodejs'], ['Express', 'express'],
  ['Socket.IO', 'socketio'], ['MongoDB', 'mongodb'], ['Firebase', 'firebase'],
]

const roadmap = [
  { state: 'In progress', item: 'Messaging interface polish: threads and read states in the chat UI.' },
  { state: 'In progress', item: 'Dashboard analytics wired to live backend metrics.' },
  { state: 'In progress', item: 'Finer-grained permissions for nested teams.' },
  { state: 'Later', item: 'Native mobile apps built on the same backend.' },
]

// A heartbeat trace, repeated across the hero
const ECG = 'M0 60 H180 L200 60 L212 30 L228 92 L244 18 L258 60 H470 L486 60 L496 44 L510 76 L522 60 H760 L780 60 L792 30 L808 92 L824 18 L838 60 H1050 L1066 60 L1076 44 L1090 76 L1102 60 H1440'

function SectionHead({ eyebrow, title, children, id }) {
  return (
    <div className="max-w-2xl" data-reveal>
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-3">{eyebrow}</p>
      <h2 id={id} className="mt-3 text-balance font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h2>
      {children && <p className="mt-4 text-pretty text-lg leading-relaxed text-ink-2">{children}</p>}
    </div>
  )
}

function PageCard({ page, admin }) {
  const Icon = page.icon
  return (
    <li data-reveal>
      <AppLink
        to={page.to}
        className={`group flex h-full flex-col rounded-xl border border-rule bg-white p-5 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-ink ${ring}`}
      >
        <span className="flex items-center justify-between">
          <Icon size={20} aria-hidden="true" className="text-ink-2 transition-colors duration-200 group-hover:text-signal" />
          <ArrowUpRight size={18} aria-hidden="true" className="text-ink-3 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
        </span>
        <span className="mt-4 flex items-center gap-2 font-semibold text-ink">
          {page.title}
          {admin && <span className="rounded bg-paper-2 px-1.5 py-0.5 text-[11px] font-medium text-ink-2">Admin</span>}
        </span>
        <span className="mt-1 flex-1 text-sm leading-relaxed text-ink-3">{page.desc}</span>
        <code className="mt-4 block truncate font-mono text-[11px] text-ink-3">{page.route}</code>
      </AppLink>
    </li>
  )
}

export default function Home() {
  const { currentUser } = useAuth()
  const root = useRef(null)
  useSmoothScroll()

  // Deep links like /#pages: the section only exists after render, so jump to it now
  useEffect(() => {
    const target = window.location.hash && document.querySelector(window.location.hash)
    if (target) requestAnimationFrame(() => target.scrollIntoView({ behavior: 'instant' }))
  }, [])

  useGSAP(() => {
    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // Hero: headline lines rise out of their masks, then the rest follows
      const trace = root.current.querySelector('[data-ecg]')
      const len = trace.getTotalLength()
      gsap.set(trace, { strokeDasharray: len, strokeDashoffset: len })

      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from('[data-line]', { yPercent: 110, duration: 0.9, stagger: 0.09 })
        .from('[data-hero-fade]', { autoAlpha: 0, y: 14, duration: 0.6, stagger: 0.08 }, '-=0.55')
        .to(trace, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut' }, 0.2)
        .from('[data-hero-board]', { autoAlpha: 0, y: 40, duration: 1 }, 0.35)

      // A single blip keeps travelling along the trace while the hero is visible
      const blip = root.current.querySelector('[data-blip]')
      const blipLen = blip.getTotalLength()
      gsap.set(blip, { strokeDasharray: `70 ${blipLen}`, strokeDashoffset: 70 })
      gsap.to(blip, {
        strokeDashoffset: -blipLen,
        duration: 5.5,
        ease: 'none',
        repeat: -1,
        delay: 1.6,
        scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', toggleActions: 'play pause resume pause' },
      })

      // Everything below the fold eases in as it arrives, in small batches
      gsap.set('[data-reveal]', { autoAlpha: 0, y: 18 })
      ScrollTrigger.batch('[data-reveal]', {
        start: 'top 88%',
        once: true,
        onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.06, ease: 'power2.out', overwrite: true }),
      })

      // Feature rules draw across as each row enters
      gsap.utils.toArray('[data-rule]').forEach((el) => {
        gsap.from(el, { scaleX: 0, transformOrigin: 'left center', duration: 0.9, ease: 'power3.inOut',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true } })
      })

      // Flow connectors fill in step by step, tied to scroll
      gsap.utils.toArray('[data-flow]').forEach((row) => {
        gsap.from(row.querySelectorAll('[data-connector]'), {
          scaleX: 0, transformOrigin: 'left center', stagger: 0.5, ease: 'none',
          scrollTrigger: { trigger: row, start: 'top 85%', end: 'top 55%', scrub: 0.6 },
        })
      })
    })

    // Fonts can shift layout after first paint; re-measure triggers once they settle
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
  }, { scope: root })

  const primary = currentUser
    ? { to: '/dashboard', label: 'Open your dashboard' }
    : { to: '/signup', label: 'Create a workspace' }

  return (
    <div ref={root} data-landing-root className="landing min-h-dvh overflow-x-clip bg-paper font-display text-ink antialiased selection:bg-signal-tint selection:text-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
        Skip to content
      </a>
      <Navbar />

      <main id="main">
        {/* ================= HERO ================= */}
        <section data-hero className="relative pt-28 sm:pt-36" aria-labelledby="hero-title">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <p data-hero-fade className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-ink-3">
              {/* A tiny three-column board; the orange card is the one that just moved */}
              <svg width="17" height="13" viewBox="0 0 17 13" aria-hidden="true" className="shrink-0">
                <rect x="0" y="0" width="4.5" height="3.5" rx="1" className="fill-ink-3" />
                <rect x="0" y="4.75" width="4.5" height="3.5" rx="1" className="fill-ink-3" />
                <rect x="6.25" y="0" width="4.5" height="3.5" rx="1" className="fill-ink-3" />
                <rect x="12.5" y="0" width="4.5" height="3.5" rx="1" className="fill-pulse" />
                <rect x="12.5" y="4.75" width="4.5" height="3.5" rx="1" className="fill-ink-3" />
                <rect x="12.5" y="9.5" width="4.5" height="3.5" rx="1" className="fill-ink-3" />
              </svg>
              Task workspace for small teams
            </p>

            <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-10">
              <h1 id="hero-title" className="font-display text-[2.5rem] font-extrabold leading-[1.02] tracking-[-0.035em] text-ink sm:text-6xl lg:col-span-8 lg:text-[4.25rem]">
                {['Your team’s work,', 'updated the moment', 'it changes.'].map((line) => (
                  <span key={line} className="block overflow-hidden pb-[0.08em]">
                    <span data-line className="block">{line}</span>
                  </span>
                ))}
              </h1>

              <div className="lg:col-span-4 lg:pb-2">
                <p data-hero-fade className="max-w-md text-pretty text-lg leading-relaxed text-ink-2">
                  Pulse keeps tasks, conversations and progress in one place. Move a card and everyone sees it. No refresh, no status meeting.
                </p>

                <div data-hero-fade className="mt-7 flex flex-wrap items-center gap-3">
                  <AppLink
                    to={primary.to}
                    className={`group inline-flex h-12 items-center gap-2 rounded-lg bg-ink px-5 font-semibold text-paper transition-colors duration-200 hover:bg-signal-strong ${ring}`}
                  >
                    {primary.label}
                    <ArrowRight size={18} aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5" />
                  </AppLink>
                  {!currentUser && (
                    <AppLink
                      to="/login"
                      className={`inline-flex h-12 items-center rounded-lg border border-ink/20 px-5 font-semibold text-ink transition-colors duration-200 hover:border-ink hover:bg-white ${ring}`}
                    >
                      Log in
                    </AppLink>
                  )}
                </div>

                <p data-hero-fade className="mt-5 text-sm text-ink-3">
                  Open source under the ISC license ·{' '}
                  <a href={REPO_URL} target="_blank" rel="noreferrer" className={`rounded font-medium text-ink-2 underline decoration-rule underline-offset-4 transition-colors hover:text-ink hover:decoration-ink ${ring}`}>
                    View the code
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Heartbeat trace between the headline and the board */}
          <svg className="pointer-events-none mt-10 block h-20 w-full sm:mt-14 sm:h-24" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
            <path data-ecg d={ECG} fill="none" className="stroke-ink/25" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            <path data-blip d={ECG} fill="none" className="stroke-pulse" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="0 99999" />
          </svg>

          <div data-hero-board className="mx-auto -mt-6 max-w-6xl px-4 sm:-mt-8 sm:px-6 lg:px-8">
            <HeroBoard />
          </div>
        </section>

        {/* ================= VIEWS ================= */}
        <section id="views" aria-labelledby="views-title" className="mx-auto max-w-6xl px-4 pt-28 sm:px-6 sm:pt-36 lg:px-8">
          <SectionHead id="views-title" eyebrow="One project, four views" title="Look at the same tasks the way the moment needs.">
            Plan on the board, triage in the list, audit in the table, schedule on the calendar. Switching views never changes the data underneath.
          </SectionHead>
          <div className="mt-12" data-reveal>
            <ViewsShowcase />
          </div>
        </section>

        {/* ================= FEATURES ================= */}
        <section id="features" aria-labelledby="features-title" className="mx-auto max-w-6xl px-4 pt-28 sm:px-6 sm:pt-36 lg:px-8">
          <SectionHead id="features-title" eyebrow="What’s inside" title="Built around how small teams actually work." />
          <ol className="mt-12">
            {features.map((f) => (
              <li key={f.n} className="relative">
                <span data-rule aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-rule" />
                <div data-reveal className="grid gap-3 py-8 sm:grid-cols-12 sm:gap-6">
                  <span className="font-mono text-sm tabular-nums text-ink-3 sm:col-span-1 sm:pt-1">{f.n}</span>
                  <h3 className="font-display text-xl font-bold tracking-tight text-ink sm:col-span-4">{f.title}</h3>
                  <div className="sm:col-span-7">
                    <p className="text-pretty leading-relaxed text-ink-2">{f.body}</p>
                    <AppLink
                      to={f.to}
                      className={`group mt-3 inline-flex min-h-10 items-center gap-1.5 rounded font-mono text-xs text-signal transition-colors hover:text-signal-strong ${ring}`}
                    >
                      {f.to}
                      <ArrowRight size={14} aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5" />
                    </AppLink>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <span data-rule aria-hidden="true" className="block h-px bg-rule" />
        </section>

        {/* ================= EVERY PAGE ================= */}
        <section id="pages" aria-labelledby="pages-title" className="mx-auto max-w-6xl px-4 pt-28 sm:px-6 sm:pt-36 lg:px-8">
          <SectionHead id="pages-title" eyebrow="Jump straight in" title="Every page in Pulse, one click away.">
            Signed out? You’ll be asked to log in, then taken straight to the page you picked.
          </SectionHead>

          <div className="mt-12 space-y-12">
            <div>
              <h3 className="text-sm font-semibold text-ink-2" data-reveal>Workspace</h3>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {workspacePages.map((p) => <PageCard key={p.route} page={p} />)}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink-2" data-reveal>
                Project views <span className="font-normal text-ink-3">· pick a project from the sidebar once you’re in</span>
              </h3>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {projectViews.map((p) => <PageCard key={p.route} page={p} />)}
              </ul>
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-2" data-reveal>
                <ShieldCheck size={16} aria-hidden="true" /> Admin <span className="font-normal text-ink-3">· visible to workspace admins</span>
              </h3>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {adminPages.map((p) => <PageCard key={p.route} page={p} admin />)}
              </ul>
            </div>
          </div>
        </section>

        {/* ================= HOW IT WORKS ================= */}
        <section id="stack" aria-labelledby="stack-title" className="mx-auto max-w-6xl px-4 pt-28 sm:px-6 sm:pt-36 lg:px-8">
          <SectionHead id="stack-title" eyebrow="How it works" title="Plain, well-known parts, wired for speed.">
            Firebase handles identity and live task data. An Express server with Socket.io carries messages and presence, backed by MongoDB.
          </SectionHead>

          <div className="mt-12 space-y-4">
            {flows.map((f) => (
              <div key={f.label} data-flow data-reveal className="rounded-xl border border-rule bg-white p-5 sm:p-6">
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-3">{f.label}</p>
                <ol className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-0">
                  {f.steps.map((s, i) => (
                    <React.Fragment key={s}>
                      <li className="flex items-center gap-3 sm:shrink-0">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink/15 font-mono text-xs text-ink-2">{i + 1}</span>
                        <span className="font-medium text-ink">{s}</span>
                      </li>
                      {i < f.steps.length - 1 && (
                        <li aria-hidden="true" className="mx-4 hidden h-px flex-1 bg-paper-2 sm:block">
                          <span data-connector className="block h-px w-full bg-signal" />
                        </li>
                      )}
                    </React.Fragment>
                  ))}
                </ol>
              </div>
            ))}
          </div>

          <div className="mt-12" data-reveal>
            <p className="text-sm font-semibold text-ink-2">Built with</p>
            <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-5">
              {stack.map(([name, file]) => (
                <li key={file} className="flex items-center gap-2.5 text-sm font-medium text-ink-2">
                  <img src={`/logos/${file}.svg`} alt="" width="22" height="22" loading="lazy" className="h-[22px] w-[22px] object-contain" />
                  {name}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ================= ROADMAP ================= */}
        <section id="roadmap" aria-labelledby="roadmap-title" className="mx-auto max-w-6xl px-4 pt-28 sm:px-6 sm:pt-36 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <SectionHead id="roadmap-title" eyebrow="Roadmap" title="What’s being built next.">
                Pulse is actively developed. Here’s what’s on the bench right now.
              </SectionHead>
            </div>
            <ul className="divide-y divide-rule border-y border-rule lg:col-span-7">
              {roadmap.map((r) => (
                <li key={r.item} data-reveal className="flex items-start gap-4 py-5">
                  <span className={`mt-0.5 w-24 shrink-0 rounded py-0.5 text-center font-mono text-[11px] ${r.state === 'Later' ? 'bg-paper-2 text-ink-2' : 'bg-signal-tint text-signal-strong'}`}>
                    {r.state}
                  </span>
                  <span className="leading-relaxed text-ink-2">{r.item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ================= CTA ================= */}
        <section aria-labelledby="cta-title" className="mx-auto max-w-6xl px-4 py-28 sm:px-6 sm:py-36 lg:px-8">
          <div data-reveal className="rounded-2xl bg-ink px-6 py-14 text-paper sm:px-12 sm:py-16">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-xl">
                <h2 id="cta-title" className="text-balance font-display text-3xl font-bold tracking-tight sm:text-4xl">
                  {currentUser ? 'Your workspace is waiting.' : 'Set up your workspace in a minute.'}
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-paper/75">
                  {currentUser
                    ? 'Pick up where you left off: your tasks, messages and board are live.'
                    : 'Create an account, make a project, invite your team. That’s the whole setup.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <AppLink
                  to={primary.to}
                  className="group inline-flex h-12 items-center gap-2 rounded-lg bg-paper px-5 font-semibold text-ink transition-colors duration-200 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
                >
                  {primary.label}
                  <ArrowRight size={18} aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5" />
                </AppLink>
                {!currentUser && (
                  <AppLink
                    to="/login"
                    className="inline-flex h-12 items-center rounded-lg border border-paper/25 px-5 font-semibold text-paper transition-colors duration-200 hover:border-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
                  >
                    Log in
                  </AppLink>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-rule">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-5 lg:px-8">
          <div className="lg:col-span-2">
            <HomeLink aria-label="Back to top" className="inline-flex rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal">
              <PulseMark />
            </HomeLink>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-3">
              A real-time task workspace for small teams. Built by Aditya Sharma at Lovely Professional University.
            </p>
          </div>

          <nav aria-label="On this page">
            <p className="text-sm font-semibold text-ink">On this page</p>
            <ul className="mt-3 space-y-1">
              {[...sections, { label: 'Roadmap', href: '#roadmap' }].map((s) => (
                <li key={s.href}>
                  <a href={s.href} className={`inline-flex min-h-9 items-center rounded text-sm text-ink-3 transition-colors hover:text-ink ${ring}`}>{s.label}</a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="App pages">
            <p className="text-sm font-semibold text-ink">App</p>
            <ul className="mt-3 space-y-1">
              {[...workspacePages, ...adminPages].map((p) => (
                <li key={p.route}>
                  <AppLink to={p.to} className={`inline-flex min-h-9 items-center rounded text-sm text-ink-3 transition-colors hover:text-ink ${ring}`}>{p.title}</AppLink>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Account and project">
            <p className="text-sm font-semibold text-ink">Account</p>
            <ul className="mt-3 space-y-1">
              <li><AppLink to="/login" className={`inline-flex min-h-9 items-center rounded text-sm text-ink-3 transition-colors hover:text-ink ${ring}`}>Log in</AppLink></li>
              <li><AppLink to="/signup" className={`inline-flex min-h-9 items-center rounded text-sm text-ink-3 transition-colors hover:text-ink ${ring}`}>Create account</AppLink></li>
            </ul>
            <p className="mt-6 text-sm font-semibold text-ink">Project</p>
            <ul className="mt-3 space-y-1">
              <li>
                <a href={REPO_URL} target="_blank" rel="noreferrer" className={`inline-flex min-h-9 items-center gap-2 rounded text-sm text-ink-3 transition-colors hover:text-ink ${ring}`}>
                  <img src="/logos/github.svg" alt="" width="14" height="14" className="h-3.5 w-3.5" /> Source on GitHub
                </a>
              </li>
              <li>
                <a href={`${REPO_URL}#readme`} target="_blank" rel="noreferrer" className={`inline-flex min-h-9 items-center rounded text-sm text-ink-3 transition-colors hover:text-ink ${ring}`}>Setup guide</a>
              </li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-rule">
          <p className="mx-auto max-w-6xl px-4 py-6 text-sm text-ink-3 sm:px-6 lg:px-8">© 2026 Pulse · ISC License</p>
        </div>
      </footer>
    </div>
  )
}

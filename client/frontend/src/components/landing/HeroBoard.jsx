import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP, Flip, ScrollTrigger)

const cards = {
  a: { title: 'Reconnect socket after laptop sleep', tag: 'Bug', who: 'RK' },
  b: { title: 'Invite design team to workspace', tag: 'Admin', who: 'AS' },
  c: { title: 'Draft sprint 14 board', tag: 'Planning', who: 'SM' },
  d: { title: 'Calendar view: fix timezone offset', tag: 'Bug', who: 'RK' },
  e: { title: 'Write onboarding email copy', tag: 'Docs', who: 'JL' },
}

// Each step is the board after one teammate's move. Step 0 is the resting state.
const steps = [
  { todo: ['c', 'e'], doing: ['a', 'd'], done: ['b'] },
  { todo: ['c', 'e'], doing: ['d'], done: ['a', 'b'], move: { card: 'a', by: 'Riya', to: 'Done' } },
  { todo: ['e'], doing: ['c', 'd'], done: ['a', 'b'], move: { card: 'c', by: 'Sam', to: 'In progress' } },
  { todo: ['e'], doing: ['c'], done: ['d', 'a', 'b'], move: { card: 'd', by: 'Riya', to: 'Done' } },
]

const columns = [
  { key: 'todo', label: 'To do' },
  { key: 'doing', label: 'In progress' },
  { key: 'done', label: 'Done' },
]

const TICK_MS = 3400

export default function HeroBoard() {
  const root = useRef(null)
  const cursor = useRef(null)
  const flipState = useRef(null)
  const [step, setStep] = useState(0)
  const [inView, setInView] = useState(false)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useGSAP(() => {
    // Park the teammate cursor low in the middle of the board until it has something to do
    gsap.set(cursor.current, { x: root.current.offsetWidth * 0.5, y: root.current.offsetHeight * 0.8 })

    // Only run the demo while the board is on screen
    ScrollTrigger.create({
      trigger: root.current,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => setInView(self.isActive),
    })
  }, { scope: root })

  // Tweens started from the timer live outside useGSAP's context; stop them on unmount
  useEffect(() => {
    const el = root.current
    return () => gsap.killTweensOf([el, ...el.querySelectorAll('*')])
  }, [])

  // Center of an element, relative to the board
  const pointAt = (el) => {
    const b = root.current.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    return { x: r.left - b.left + r.width * 0.72, y: r.top - b.top + r.height * 0.55 }
  }

  const tick = useEffectEvent(() => {
    const next = (step + 1) % steps.length

    if (next === 0) {
      // Loop back quietly: crossfade to the resting board
      const cols = root.current.querySelector('[data-columns]')
      gsap.timeline()
        .to([cols, cursor.current], { autoAlpha: 0, duration: 0.3, ease: 'power1.in' })
        .add(() => setStep(0))
        .to(cols, { autoAlpha: 1, duration: 0.4, ease: 'power1.out' }, '+=0.05')
      return
    }

    const { card, by } = steps[next].move
    const src = root.current.querySelector(`[data-flip-id="${card}"]`)
    if (!src) return
    cursor.current.querySelector('[data-name]').textContent = by
    const p = pointAt(src)

    gsap.timeline()
      .to(cursor.current, { autoAlpha: 1, duration: 0.2 }, 0)
      .to(cursor.current, { x: p.x, y: p.y, duration: 0.7, ease: 'power3.inOut' }, 0)
      .to(src, { scale: 1.03, duration: 0.15, ease: 'power2.out' })
      .add(() => {
        flipState.current = Flip.getState(root.current.querySelectorAll('[data-flip-id]'))
        setStep(next)
      })
  })

  // After React re-renders the columns, animate every card from where it was
  useLayoutEffect(() => {
    if (!flipState.current) return
    const state = flipState.current
    flipState.current = null
    const moved = steps[step].move?.card
    Flip.from(state, {
      targets: root.current.querySelectorAll('[data-flip-id]'),
      duration: 0.65,
      ease: 'power3.inOut',
      absolute: true,
    })
    const dest = root.current.querySelector(`[data-flip-id="${moved}"]`)
    if (dest) {
      const p = pointAt(dest)
      gsap.to(cursor.current, { x: p.x, y: p.y, duration: 0.65, ease: 'power3.inOut' })
      gsap.fromTo(dest, { scale: 1.03 }, { scale: 1, duration: 0.3, delay: 0.6, ease: 'power2.out' })
      gsap.fromTo(dest.querySelector('[data-flash]'), { autoAlpha: 1 }, { autoAlpha: 0, duration: 1.2, delay: 0.6 })
    }
  }, [step])

  useEffect(() => {
    if (!inView || reduced) return
    const id = setTimeout(tick, step === 0 ? 1600 : TICK_MS)
    return () => clearTimeout(id)
  }, [inView, reduced, step])

  const board = steps[step]
  const last = steps[step].move

  return (
    <figure className="relative">
      <div
        ref={root}
        className="relative overflow-hidden rounded-2xl border border-ink/10 bg-app text-slate-200"
        aria-hidden="true"
      >
        {/* Window bar */}
        <div className="flex items-center justify-between border-b border-white/5 bg-app-2 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Product</span>
            <span className="text-slate-600">/</span>
            <span className="font-semibold text-slate-100">Sprint 14</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            4 online
          </div>
        </div>

        {/* Columns */}
        <div data-columns className="grid grid-cols-3 gap-2 p-3 sm:gap-3 sm:p-4">
          {columns.map((col) => (
            <div key={col.key} className="min-h-[260px] rounded-xl bg-white/[0.03] p-2 sm:min-h-[300px] sm:p-2.5">
              <div className="mb-2.5 flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{col.label}</span>
                <span className="font-mono text-[11px] tabular-nums text-slate-500">{board[col.key].length}</span>
              </div>
              <div className="space-y-2">
                {board[col.key].map((id) => (
                  <div
                    key={id}
                    data-flip-id={id}
                    className="relative rounded-lg border border-white/5 bg-app-2 p-2.5 sm:p-3"
                  >
                    <span data-flash className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-teal-300/60 opacity-0" />
                    <p className={`text-[11px] leading-snug sm:text-[13px] ${col.key === 'done' ? 'text-slate-500 line-through decoration-slate-600' : 'text-slate-100'}`}>
                      {cards[id].title}
                    </p>
                    <div className="mt-2.5 hidden items-center justify-between sm:flex">
                      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">{cards[id].tag}</span>
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-[9px] font-semibold text-slate-200">
                        {cards[id].who}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Status line: the "someone else just did this" moment */}
        <div className="flex items-center justify-between border-t border-white/5 px-4 py-2.5 font-mono text-[11px] text-slate-400">
          <span className="truncate">
            {last ? <>{last.by} moved “{cards[last.card].title}” → {last.to}</> : 'Synced · no pending changes'}
          </span>
          <span className="ml-3 shrink-0 text-slate-500">{last ? 'just now' : ''}</span>
        </div>

        {/* Teammate cursor */}
        <div ref={cursor} className="pointer-events-none invisible absolute left-0 top-0 z-10 opacity-0">
          <svg width="16" height="16" viewBox="0 0 16 16" className="-translate-x-0.5 -translate-y-0.5">
            <path d="M1 1l5.5 13 1.8-5.2L13.5 7z" fill="#F5F4EF" stroke="#111412" strokeWidth="1" />
          </svg>
          <span data-name className="ml-3 inline-block rounded bg-pulse px-1.5 py-0.5 text-[10px] font-semibold text-white">Riya</span>
        </div>
      </div>

      <figcaption className="mt-3 text-sm text-ink-3">
        <span>A shared board. Teammates’ moves appear on your screen as they happen.</span>
      </figcaption>
    </figure>
  )
}

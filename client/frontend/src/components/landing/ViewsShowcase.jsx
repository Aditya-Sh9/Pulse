import { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ArrowRight } from 'lucide-react'
import AppLink from './AppLink'
import { projectViews } from './siteMap'

gsap.registerPlugin(useGSAP)

const tasks = [
  { t: 'Reconnect socket after laptop sleep', s: 'In progress', p: 'High', who: 'RK', due: 'Sep 29', day: 29 },
  { t: 'Draft sprint 14 board', s: 'To do', p: 'Medium', who: 'SM', due: 'Oct 2', day: 2 },
  { t: 'Invite design team to workspace', s: 'Done', p: 'Low', who: 'AS', due: 'Sep 24', day: 24 },
  { t: 'Calendar view: fix timezone offset', s: 'In progress', p: 'High', who: 'RK', due: 'Oct 1', day: 1 },
  { t: 'Write onboarding email copy', s: 'To do', p: 'Low', who: 'JL', due: 'Oct 6', day: 6 },
]

const statusDot = { 'To do': 'bg-ink-3', 'In progress': 'bg-pulse', Done: 'bg-signal' }

function BoardPreview() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {['To do', 'In progress', 'Done'].map((col) => (
        <div key={col} className="rounded-xl bg-paper-2 p-2.5">
          <p className="mb-2 px-1 text-xs font-semibold text-ink-2">{col}</p>
          <div className="space-y-2">
            {tasks.filter((x) => x.s === col).map((x) => (
              <div key={x.t} className="rounded-lg border border-rule bg-white p-2.5 text-xs leading-snug text-ink sm:text-sm">{x.t}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ListPreview() {
  return (
    <ul className="divide-y divide-rule rounded-xl border border-rule bg-white">
      {tasks.map((x) => (
        <li key={x.t} className="flex items-center gap-3 px-4 py-3 text-sm">
          <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot[x.s]}`} />
          <span className={`flex-1 truncate ${x.s === 'Done' ? 'text-ink-3 line-through' : 'text-ink'}`}>{x.t}</span>
          <span className="hidden text-xs text-ink-3 sm:inline">{x.s}</span>
          <span className="font-mono text-xs tabular-nums text-ink-3">{x.due}</span>
        </li>
      ))}
    </ul>
  )
}

function TablePreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-rule bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-paper-2 text-xs text-ink-2">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-semibold">Task</th>
            <th scope="col" className="hidden px-4 py-2.5 font-semibold sm:table-cell">Status</th>
            <th scope="col" className="px-4 py-2.5 font-semibold">Priority</th>
            <th scope="col" className="px-4 py-2.5 font-semibold">Owner</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {tasks.map((x) => (
            <tr key={x.t}>
              <td className="max-w-0 truncate px-4 py-2.5 text-ink">{x.t}</td>
              <td className="hidden px-4 py-2.5 text-ink-2 sm:table-cell">{x.s}</td>
              <td className="px-4 py-2.5 text-ink-2">{x.p}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-ink-2">{x.who}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CalendarPreview() {
  // Weekdays from Mon Sep 21 to Fri Oct 9, 2026
  const days = [21, 22, 23, 24, 25, 28, 29, 30, 1, 2, 5, 6, 7, 8, 9]
  return (
    <div className="rounded-xl border border-rule bg-white p-3">
      <div className="mb-2 grid grid-cols-5 gap-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-3">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {days.map((d) => {
          const due = tasks.filter((x) => x.day === d)
          return (
            <div key={d} className="min-h-16 rounded-md bg-paper p-1.5 sm:min-h-20">
              <span className="font-mono text-[11px] tabular-nums text-ink-3">{d}</span>
              {due.map((x) => (
                <p key={x.t} className="mt-1 truncate rounded bg-signal-tint px-1 py-0.5 text-[10px] font-medium text-signal-strong sm:text-[11px]">{x.t}</p>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const previews = { Board: BoardPreview, List: ListPreview, Table: TablePreview, Calendar: CalendarPreview }

export default function ViewsShowcase() {
  const [index, setIndex] = useState(0)
  const tabs = useRef([])
  const panel = useRef(null)
  useGSAP(() => {
    const el = panel.current
    return () => gsap.killTweensOf(el)
  })

  const select = (i) => {
    if (i === index) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return setIndex(i)
    gsap.killTweensOf(panel.current)
    gsap.to(panel.current, {
      autoAlpha: 0,
      y: 6,
      duration: 0.14,
      ease: 'power1.in',
      onComplete: () => {
        setIndex(i)
        gsap.fromTo(panel.current, { autoAlpha: 0, y: -6 }, { autoAlpha: 1, y: 0, duration: 0.28, ease: 'power2.out' })
      },
    })
  }

  const onKeyDown = (e) => {
    const last = projectViews.length - 1
    const map = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }
    if (!(e.key in map)) return
    e.preventDefault()
    select(map[e.key])
    tabs.current[map[e.key]]?.focus()
  }

  const view = projectViews[index]
  const Preview = previews[view.title]

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-12">
      <div>
        <div role="tablist" aria-label="Project views" onKeyDown={onKeyDown} className="flex flex-col gap-1">
          {projectViews.map((v, i) => {
            const Icon = v.icon
            const selected = i === index
            return (
              <button
                key={v.title}
                ref={(el) => (tabs.current[i] = el)}
                role="tab"
                id={`view-tab-${i}`}
                aria-selected={selected}
                aria-controls="view-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => select(i)}
                className={`group flex w-full items-start gap-4 rounded-xl border px-4 py-4 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal ${
                  selected ? 'border-ink bg-white' : 'border-transparent hover:border-rule hover:bg-white/60'
                }`}
              >
                <Icon size={20} aria-hidden="true" className={`mt-0.5 shrink-0 transition-colors ${selected ? 'text-signal' : 'text-ink-3 group-hover:text-ink-2'}`} />
                <span>
                  <span className="block font-semibold text-ink">{v.title}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-ink-3">{v.desc}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div id="view-panel" role="tabpanel" aria-labelledby={`view-tab-${index}`} tabIndex={0}
        className="rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal">
        <div ref={panel}>
          <Preview />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <code className="font-mono text-xs text-ink-3">{view.route}</code>
            <AppLink
              to={view.to}
              className="group inline-flex min-h-10 items-center gap-1.5 rounded-md text-sm font-semibold text-signal transition-colors hover:text-signal-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            >
              Open {view.title.toLowerCase()} view
              <ArrowRight size={16} aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </AppLink>
          </div>
        </div>
      </div>
    </div>
  )
}

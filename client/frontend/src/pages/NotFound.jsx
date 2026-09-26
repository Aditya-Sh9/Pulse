import React, { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

gsap.registerPlugin(useGSAP)

export default function NotFound() {
    const navigate = useNavigate()
    const root = useRef(null)

    // The trace beats twice, then runs flat: nothing alive at this address.
    useGSAP(() => {
        const mm = gsap.matchMedia()
        mm.add('(prefers-reduced-motion: no-preference)', () => {
            const trace = root.current.querySelector('[data-trace]')
            const len = trace.getTotalLength()
            gsap.timeline()
                .fromTo(trace, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 2.2, ease: 'power1.inOut' })
                .from('[data-nf]', { autoAlpha: 0, y: 12, duration: 0.6, ease: 'expo.out', stagger: 0.06, clearProps: 'transform' }, 0.3)
        })
    }, { scope: root })

    return (
        <div ref={root} className="min-h-dvh bg-base text-neutral-200 flex flex-col items-center justify-center px-6 py-16">
            <svg viewBox="0 0 640 120" className="w-full max-w-2xl" aria-hidden="true">
                <path
                    data-trace
                    d="M0 60 H110 L126 60 L136 30 L150 94 L164 18 L176 60 H250 L262 60 L270 46 L282 76 L292 60 H640"
                    fill="none"
                    className="stroke-accent-400"
                    strokeWidth="1.75"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
            </svg>

            <div className="mt-10 max-w-md text-center">
                <p data-nf className="font-mono text-sm text-neutral-500">404</p>
                <h1 data-nf className="mt-3 text-[28px] leading-tight font-semibold tracking-[-0.02em] text-neutral-50">No pulse at this address.</h1>
                <p data-nf className="mt-3 text-neutral-400 leading-relaxed">
                    The page you’re looking for doesn’t exist or has moved. Your workspace is still right where you left it.
                </p>

                <div data-nf className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="group inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-edge bg-card px-5 font-medium text-neutral-200 transition-colors hover:bg-raised"
                    >
                        <ArrowLeft size={17} aria-hidden="true" className="transition-transform duration-200 group-hover:-translate-x-0.5" />
                        Go back
                    </button>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-neutral-50 px-5 font-semibold text-[var(--color-base)] transition-colors hover:bg-white"
                    >
                        <Home size={17} aria-hidden="true" />
                        Take me home
                    </button>
                </div>
            </div>
        </div>
    )
}

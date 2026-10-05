import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import './ContactDock.css'

export interface ContactPerson {
  name: string
  role: string
  initials: string
  tint: 'teal' | 'amber' | 'blue' | 'purple' | 'rose' | 'green' | 'cyan'
  email: string
  whatsapp: string
  github: string
  instagram: string
  phone: string
}

const DEFAULT_PEOPLE: ContactPerson[] = [
  { name: 'Diego',
    role: 'Full Stack',
    initials: 'DM',
    tint: 'cyan',
    email: 'diealemorgom@gmail.com',
    whatsapp: '573146449803',
    github: 'https://github.com/Damg53',
    instagram: 'https://www.instagram.com/damg53/',
    phone: '+57 314 644 9803',
  
  },
  {
    name: 'Daniel',
    role: 'Frontend',
    initials: 'DS',
    tint: 'rose',
    email: 'daniel.sarmiento140905@gmail.com',
    whatsapp: '573225761257',
    github: 'https://github.com/DASA1409',
    instagram: 'https://www.instagram.com/dasa_da_man/',
    phone: '+57 322 576 1257',
  },
  {
    name: 'Kale',
    role: 'Backend',
    initials: 'KL',
    tint: 'purple',
    email: '',
    whatsapp: '',
    github: 'https://github.com/',
    instagram: 'https://www.instagram.com',
    phone: '',
  },
]

const MAGNIFY_MAX_SCALE = 1.35
const MAGNIFY_INFLUENCE = 90

interface ContactDockProps {
  people?: ContactPerson[]
}

export default function ContactDock({ people = DEFAULT_PEOPLE }: ContactDockProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [switching, setSwitching] = useState(false)
  const [showLabel, setShowLabel] = useState(false)
  const [toast, setToast] = useState({ text: '', show: false })
  const dockRef = useRef<HTMLElement | null>(null)
  const itemRefs = useRef<Array<HTMLElement | null>>([])
  const toastTimer = useRef<number | undefined>(undefined)
  const switchTimer = useRef<number | undefined>(undefined)

  const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const isTouch = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches
  const active = people[activeIndex] ?? people[0]

  useEffect(() => {
    return () => {
      window.clearTimeout(toastTimer.current)
      window.clearTimeout(switchTimer.current)
    }
  }, [])

  function tintVar(tint: ContactPerson['tint']) {
    const colors = {
      teal: 'rgba(95,184,172,0.32)',
      amber: 'rgba(230,163,85,0.32)',
      blue: 'rgba(84,151,238,0.32)',
      purple: 'rgba(155,113,224,0.32)',
      rose: 'rgba(232,106,142,0.32)',
      green: 'rgba(101,190,116,0.32)',
      cyan: 'rgba(70,190,210,0.32)',
    } satisfies Record<ContactPerson['tint'], string>

    return colors[tint]
  }

  function switchPerson(index: number) {
    if (index === activeIndex) return
    setShowLabel(true)
    if (!reduceMotion) {
      setSwitching(true)
      window.clearTimeout(switchTimer.current)
      switchTimer.current = window.setTimeout(() => {
        setActiveIndex(index)
        setSwitching(false)
      }, 140)
    } else {
      setActiveIndex(index)
    }
  }

  function handleMouseMove(e: MouseEvent<HTMLElement>) {
    if (reduceMotion || isTouch) return
    itemRefs.current.forEach((el) => {
      if (!el) return
      const rect = el.getBoundingClientRect()
      const distance = Math.abs(e.clientX - (rect.left + rect.width / 2))
      const scale = distance < MAGNIFY_INFLUENCE
        ? 1 + (MAGNIFY_MAX_SCALE - 1) * (1 - distance / MAGNIFY_INFLUENCE)
        : 1
      el.style.transform = `scale(${scale.toFixed(3)})`
    })
  }

  function resetMagnify() {
    itemRefs.current.forEach((el) => {
      if (el) el.style.transform = 'scale(1)'
    })
  }

  function bounce(el: HTMLElement | null) {
    if (!el) return
    el.classList.remove('dock-item--clicked')
    void el.offsetWidth
    el.classList.add('dock-item--clicked')
  }

  function handleTouchOpen(el: HTMLElement | null) {
    if (!isTouch || !el) return
    itemRefs.current.forEach((other) => other?.classList.remove('dock-item--touch-open'))
    el.classList.add('dock-item--touch-open')
    window.setTimeout(() => el.classList.remove('dock-item--touch-open'), 1600)
  }

  async function handleCopyPhone(e: MouseEvent<HTMLButtonElement>) {
    bounce(e.currentTarget)
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(active.phone)
    } finally {
      window.clearTimeout(toastTimer.current)
      setToast({ text: `Número de ${active.name} copiado`, show: true })
      toastTimer.current = window.setTimeout(() => setToast((current) => ({ ...current, show: false })), 1800)
    }
  }

  const channelHrefs = {
    email: `mailto:${active.email}`,
    whatsapp: `https://wa.me/${active.whatsapp}`,
    github: active.github,
    instagram: active.instagram,
  }

  return (
    <section id="contact" className="contact-dock-page">
      <div className="contact-dock-grain" />
      <div className="contact-dock-intro">
        <div className="contact-dock-eyebrow">
          <span className="contact-dock-dash" />
          <span className="contact-dock-eyebrow-label">Equipo WorkPalace</span>
          <span className="contact-dock-dash contact-dock-dash--right" />
        </div>
        <h2 className="contact-dock-title">Habla con quien <span className="contact-dock-accent">necesites</span></h2>
        <p className="contact-dock-sub">Elige a una persona y luego el canal de contacto que prefieras.</p>
      </div>

      <div className="contact-dock-people" role="tablist" aria-label="Elegir persona">
        {people.map((person, index) => (
          <button
            key={person.email}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            className={`contact-dock-chip${index === activeIndex ? ' contact-dock-chip--active' : ''}`}
            style={{ ['--tint' as string]: tintVar(person.tint) }}
            onClick={() => switchPerson(index)}
          >
            <span className="contact-dock-avatar">{person.initials}</span>
            {person.name}
          </button>
        ))}
      </div>

      <div className="contact-dock-wrap">
        <span className={`contact-dock-label${showLabel ? ' contact-dock-label--show' : ''}`}>
          {active.name} — {active.role}
        </span>
        <nav
          ref={dockRef}
          className={`contact-dock${switching ? ' contact-dock--switching' : ''}`}
          aria-label="Canales de contacto"
          onMouseMove={handleMouseMove}
          onMouseLeave={resetMagnify}
        >
          <a ref={(el) => { itemRefs.current[0] = el }} className="dock-item" style={{ ['--tint' as string]: tintVar('teal') }} href={channelHrefs.email} aria-label="Enviar correo" onClick={(e) => bounce(e.currentTarget)} onTouchStart={(e) => handleTouchOpen(e.currentTarget)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5h18v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-12Z" /><path d="M3 7l9 6.5L21 7" /></svg>
            <span className="dock-tooltip">Correo</span><span className="dock-dot" />
          </a>
          <a ref={(el) => { itemRefs.current[1] = el }} className="dock-item" style={{ ['--tint' as string]: tintVar('teal') }} href={channelHrefs.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="Escribir por WhatsApp" onClick={(e) => bounce(e.currentTarget)} onTouchStart={(e) => handleTouchOpen(e.currentTarget)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.4-4.2A8 8 0 1 1 9 18.4L4 20Z" /><path d="M8.9 9.1c-.3-.6.1-1.3.7-1.3h.6c.3 0 .6.2.7.5l.4 1c.1.3 0 .6-.2.8l-.4.4c.4 1 1.2 1.8 2.2 2.2l.4-.4c.2-.2.5-.3.8-.2l1 .4c.3.1.5.4.5.7v.6c0 .6-.7 1-1.3.7-2.7-.9-4.8-3-5.7-5.7Z" /></svg>
            <span className="dock-tooltip">WhatsApp</span><span className="dock-dot" />
          </a>
          <a ref={(el) => { itemRefs.current[2] = el }} className="dock-item" style={{ ['--tint' as string]: tintVar('amber') }} href={channelHrefs.github} target="_blank" rel="noopener noreferrer" aria-label="Ver GitHub" onClick={(e) => bounce(e.currentTarget)} onTouchStart={(e) => handleTouchOpen(e.currentTarget)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.4c0-.9.3-1.5.7-1.8-2.5-.3-5.2-1.3-5.2-5.6 0-1.2.4-2.2 1.1-3-.1-.3-.5-1.5.1-3 0 0 .9-.3 3.1 1.1a10.7 10.7 0 0 1 5.6 0c2.1-1.4 3.1-1.1 3.1-1.1.6 1.5.2 2.7.1 3 .7.8 1.1 1.8 1.1 3 0 4.3-2.7 5.3-5.2 5.6.4.4.8 1.1.8 2.2V19" /></svg>
            <span className="dock-tooltip">GitHub</span><span className="dock-dot" />
          </a>
          <a ref={(el) => { itemRefs.current[3] = el }} className="dock-item" style={{ ['--tint' as string]: tintVar('amber') }} href={channelHrefs.instagram} target="_blank" rel="noopener noreferrer" aria-label="Ver Instagram" onClick={(e) => bounce(e.currentTarget)} onTouchStart={(e) => handleTouchOpen(e.currentTarget)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><circle cx="12" cy="12" r="4" /><circle cx="17.4" cy="6.6" r="0.8" fill="currentColor" stroke="none" /></svg>
            <span className="dock-tooltip">Instagram</span><span className="dock-dot" />
          </a>
          <button ref={(el) => { itemRefs.current[4] = el }} type="button" className="dock-item" style={{ ['--tint' as string]: tintVar('teal') }} aria-label="Copiar número de teléfono" onClick={handleCopyPhone} onTouchStart={(e) => handleTouchOpen(e.currentTarget)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5L16 13l4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A15.5 15.5 0 0 1 5 5.6 1.5 1.5 0 0 1 6.5 4Z" /></svg>
            <span className="dock-tooltip">Copiar número</span><span className="dock-dot" />
          </button>
        </nav>
        <div className={`contact-dock-toast${toast.show ? ' contact-dock-toast--show' : ''}`}>{toast.text}</div>
      </div>
    </section>
  )
}

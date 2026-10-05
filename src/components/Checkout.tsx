import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './Checkout.css'

const API = 'http://localhost:3001'

type Mode = 'hour' | 'halfDay' | 'fullDay' | 'day' | 'night' | 'week' | 'fortnight' | 'month' | 'appointment' | 'flexible'
type Pay = 'card' | 'pse' | 'nequi'

interface CheckoutProps {
  user: { id?: number; username: string; fullName?: string; email?: string; role?: string }
  isDark: boolean
  setIsDark: (value: boolean) => void
}

interface Place {
  id: number
  name: string
  tipo: string
  barrio: string | null
  ciudad: string | null
  modalidad: string | null
  precio_hora: number | null
  active?: boolean
  unavailable_reason?: string | null
  available_from?: string | null
}

const MODES: { id: Mode; label: string; unit: [string, string]; max: number }[] = [
  { id: 'hour', label: 'Por hora', unit: ['hora', 'horas'], max: 12 },
  { id: 'halfDay', label: 'Media jornada (4 horas)', unit: ['jornada', 'jornadas'], max: 1 },
  { id: 'fullDay', label: 'Jornada completa (8 horas)', unit: ['jornada', 'jornadas'], max: 1 },
  { id: 'day', label: 'Por día', unit: ['día', 'días'], max: 30 },
  { id: 'night', label: 'Por noche', unit: ['noche', 'noches'], max: 1 },
  { id: 'week', label: 'Por semana', unit: ['semana', 'semanas'], max: 8 },
  { id: 'fortnight', label: 'Por 15 días', unit: ['15 días', '15 días'], max: 4 },
  { id: 'month', label: 'Por mes', unit: ['mes', 'meses'], max: 3 },
  { id: 'appointment', label: 'Solo por cita', unit: ['cita', 'citas'], max: 1 },
  { id: 'flexible', label: 'Flexible', unit: ['reserva', 'reservas'], max: 1 },
]

const PAYS: { id: Pay; label: string; hint: string }[] = [
  { id: 'card', label: 'Tarjeta', hint: 'Crédito o débito' },
  { id: 'pse', label: 'PSE', hint: 'Desde tu banco' },
  { id: 'nequi', label: 'Nequi', hint: 'Con tu celular' },
]

const COUPONS: Record<string, { label: string; discount: number }> = {
  
}

const DECLINED_TEST_CARD = '4000000000000002'

const cop = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

const hourLabel = (h: number) => `${h > 12 ? h - 12 : h}:00 ${h >= 12 && h < 24 ? 'pm' : 'am'}`

const toDate = (iso: string, plus = 0) => {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + plus)
  return d
}

const dateLabel = (d: Date) =>
  d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })

const tomorrow = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

const isValidCardExpiry = (value: string) => {
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(value)
  if (!match) return false
  const expiry = new Date(2000 + Number(match[2]), Number(match[1]), 0)
  const now = new Date()
  return expiry >= new Date(now.getFullYear(), now.getMonth() + 1, 0)
}

const formatAvailabilityDate = (value: string | null | undefined) => value
  ? new Date(`${value}T00:00:00`).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  : null

const getUnavailableMessage = (placeData: Partial<Place> | null | undefined) => {
  if (!placeData) return 'Este espacio no está disponible para la fecha seleccionada.'

  const reason = placeData.unavailable_reason || 'No disponible temporalmente'
  const nextDate = formatAvailabilityDate(placeData.available_from)

  if (nextDate) {
    return `Este espacio no está disponible por ${reason.toLowerCase()}. Disponible nuevamente el ${nextDate}.`
  }

  return `Este espacio no está disponible por ${reason.toLowerCase()}.`
}

const getModeOptionsFromPlace = (modalidad: string | null | undefined): Mode[] => {
  if (!modalidad) return ['hour', 'day', 'week', 'fortnight', 'month']

  const normalized = modalidad.toLowerCase().trim()
  const modes: Mode[] = []
  const add = (candidate: Mode) => { if (!modes.includes(candidate)) modes.push(candidate) }

  if (normalized.includes('por hora') || normalized === 'hora') add('hour')
  if (normalized.includes('media jornada') || normalized.includes('4 horas')) add('halfDay')
  if (normalized.includes('jornada completa') || normalized.includes('8 horas')) add('fullDay')
  if (normalized.includes('por día') || normalized.includes('por dia')) add('day')
  if (normalized.includes('por noche')) add('night')
  if (normalized.includes('por semana')) add('week')
  if (normalized.includes('15 días') || normalized.includes('15 dias')) add('fortnight')
  if (normalized.includes('por mes')) add('month')
  if (normalized.includes('solo por cita')) add('appointment')
  if (normalized.includes('flexible')) add('flexible')

  return modes.length > 0 ? modes : ['hour']
}

const resolveModeFromPlace = (modalidad: string | null | undefined): Mode => {
  const modes = getModeOptionsFromPlace(modalidad)
  return modes[0] ?? 'hour'
}

export default function Checkout({ user, isDark }: CheckoutProps) {
  const { placeId } = useParams()
  const navigate = useNavigate()

  const [place, setPlace] = useState<Place | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('hour')
  const [availableModes, setAvailableModes] = useState<Mode[]>(['hour', 'day', 'week', 'fortnight', 'month'])
  const [date, setDate] = useState(tomorrow())
  const [start, setStart] = useState(9)
  const [qty, setQty] = useState(3)
  const [name, setName] = useState(user.fullName || user.username || '')
  const [email, setEmail] = useState(user.email || '')
  const [phone, setPhone] = useState('')
  const [pay, setPay] = useState<Pay>('card')
  const [card, setCard] = useState('')
  const [exp, setExp] = useState('')
  const [cvc, setCvc] = useState('')
  const [coupon, setCoupon] = useState('')
  const [applied, setApplied] = useState<string | null>(null)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponAttempted, setCouponAttempted] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [couponChecking, setCouponChecking] = useState(false)
  const [terms, setTerms] = useState(false)
  const [status, setStatus] = useState<'idle' | 'paying' | 'done' | 'rejected'>('idle')

  useEffect(() => {
    if (!placeId) {
      setError('Espacio no especificado')
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetchPlace() {
      try {
        const res = await fetch(`${API}/api/places?date=${encodeURIComponent(date)}`, {
          headers: { 'x-user-id': String(user.id) },
        })
        const data = await res.json()
        if (cancelled) return

        if (!res.ok) {
          setError(data.error || 'Error al cargar el espacio')
          return
        }

        const found = (data.places || []).find((p: Place) => String(p.id) === String(placeId))
        if (!found) {
          setPlace(null)
          setError('Este espacio no existe o ya no está publicado.')
          return
        }

        if (!found.active) {
          setPlace(found)
          setError(getUnavailableMessage(found))
          return
        }

        const initialMode = resolveModeFromPlace(found.modalidad)
        setPlace(found)
        setMode(initialMode)
        setAvailableModes(getModeOptionsFromPlace(found.modalidad))
        setQty(initialMode === 'hour' ? 3 : 1)
      } catch (_e) {
        if (!cancelled) setError('No se pudo cargar la información del espacio.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchPlace()
    return () => { cancelled = true }
  }, [date, placeId, user.id])

  useEffect(() => {
    if (status !== 'rejected') return

    const timer = window.setTimeout(() => {
      setError('Compra rechazada (prueba): la tarjeta fue declinada intencionalmente.')
      setStatus('idle')
    }, 2500)

    return () => window.clearTimeout(timer)
  }, [status])

  const cfg = MODES.find((m) => m.id === mode) ?? MODES[0]
  const maxQty = mode === 'hour' ? Math.min(cfg.max, 22 - start) : cfg.max

  const changeMode = (m: Mode) => {
    setMode(m)
    setQty(m === 'hour' ? 3 : 1)
  }

  const changeStart = (h: number) => {
    setStart(h)
    setQty((q) => Math.min(q, 22 - h))
  }

  const baseRate = Number(place?.precio_hora ?? 45000)
  const rateMap = {
    hour: baseRate,
    halfDay: baseRate,
    fullDay: baseRate,
    day: baseRate,
    night: baseRate,
    week: baseRate,
    fortnight: baseRate,
    month: baseRate,
    appointment: baseRate,
    flexible: baseRate,
  } as const

  const { subtotal, discount, fee, total } = useMemo(() => {
    const subtotalValue = rateMap[mode] * qty
    const discountValue = applied
      ? Math.round(subtotalValue * (couponDiscount / 100))
      : 0
    const feeValue = Math.round((subtotalValue - discountValue) * 0.08)
    return {
      subtotal: subtotalValue,
      discount: discountValue,
      fee: feeValue,
      total: subtotalValue - discountValue + feeValue,
    }
  }, [applied, couponDiscount, mode, qty, rateMap])

  const slot = useMemo(() => {
    if (mode === 'hour') {
      return { title: dateLabel(toDate(date)), sub: `${hourLabel(start)} a ${hourLabel(start + qty)}` }
    }

    const days = mode === 'day' || mode === 'halfDay' || mode === 'fullDay' || mode === 'night' || mode === 'appointment' || mode === 'flexible'
      ? qty
      : mode === 'week' ? qty * 7 : mode === 'fortnight' ? qty * 15 : qty * 30
    return {
      title: `${dateLabel(toDate(date))} al ${dateLabel(toDate(date, days - 1))}`,
      sub: `${days} ${days === 1 ? 'día' : 'días'} completos`,
    }
  }, [date, mode, qty, start])

  const emailOk = /^\S+@\S+\.\S+$/.test(email)
  const expiryOk = isValidCardExpiry(exp)
  const cardOk = pay !== 'card' || (card.replace(/\s/g, '').length === 16 && expiryOk && cvc.length >= 3)
  const canPay = name.trim().length > 2 && emailOk && phone.replace(/\D/g, '').length >= 10 && cardOk && terms

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!place || !user.id) return
    if (!date) {
      setError('Debes seleccionar una fecha válida.')
      return
    }
    setError(null)
    setStatus('paying')

    if (pay === 'card' && card.replace(/\s/g, '') === DECLINED_TEST_CARD) {
      setStatus('rejected')
      return
    }

    if (pay === 'pse' || pay === 'nequi') {
      await new Promise((resolve) => window.setTimeout(resolve, 1500))
    }

    try {
      const res = await fetch(`${API}/api/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user.id),
        },
        body: JSON.stringify({
          placeId: place.id,
          checkIn: date,
          checkOut: new Date(new Date(date).getTime() + (mode === 'hour' ? qty * 60 * 60 * 1000 : qty * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10),
          huespedes: qty,
          couponCode: applied,
          payment: {
            method: pay,
            name,
            email,
            ...(pay === 'card' ? { last4: card.slice(-4), exp } : {}),
          },
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(`Compra rechazada: ${data.error || 'no se pudo completar la reserva.'}`)
        setStatus('idle')
        return
      }

      setStatus('done')
      setTimeout(() => navigate('/dashboard', { replace: true }), 5000)
    } catch (_e) {
      setError('Compra rechazada: no se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.')
      setStatus('idle')
    }
  }

  const handleCancel = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/', { replace: true })
  }

  const handleApplyCoupon = async () => {
    const normalizedCoupon = coupon.trim().toUpperCase()
    setCoupon(normalizedCoupon)
    setCouponAttempted(true)
    setCouponError(null)
    setApplied(null)
    setCouponDiscount(0)

    setCouponChecking(true)
    try {
      const res = await fetch(`${API}/api/coupons/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user.id),
        },
        body: JSON.stringify({ couponCode: normalizedCoupon }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCouponError(data.error || 'No se pudo validar el cupón.')
        return
      }

      setApplied(normalizedCoupon)
      setCouponDiscount(Number(data.coupon?.discount ?? COUPONS[normalizedCoupon]?.discount ?? 0))
    } catch (_e) {
      setCouponError('No se pudo validar el cupón. Inténtalo de nuevo.')
    } finally {
      setCouponChecking(false)
    }
  }

  const themeClass = isDark ? 'ck ck--dark' : 'ck ck--light'

  if (loading) {
    return <main className={themeClass}><section className="ck-card ck-card--loading"><p className="settings-loading">Cargando información del espacio...</p></section></main>
  }

  if (place && !place.active) {
    return (
      <main className={themeClass}>
        <section className="ck-card ck-card--loading">
          <p className="reservations-error">{error || getUnavailableMessage(place)}</p>
          <h2>{place.name}</h2>
          <p>{place.tipo} · {[place.barrio, place.ciudad].filter(Boolean).join(', ') || 'Ubicación no disponible'}</p>
          <p style={{ marginTop: '1rem' }}>
            {getUnavailableMessage(place)}
          </p>
          <button type="button" className="ck-btn" onClick={handleCancel} style={{ marginTop: '1rem' }}>
            Volver a espacios
          </button>
        </section>
      </main>
    )
  }

  if (error && !place) {
    return <main className={themeClass}><section className="ck-card ck-card--loading"><p className="reservations-error">{error}</p></section></main>
  }

  if (status === 'done') {
    return (
      <main className={`${themeClass} ck--done`}>
        <section className="ck-thanks" aria-live="polite">
          <span className="ck-thanks__check" aria-hidden="true">✓</span>
          <h1>Reserva confirmada</h1>
          <p>
            {place?.name} es tuyo el {slot.title}, {slot.sub}. Te enviamos el código de acceso a {email}.
          </p>
          <p className="ck-thanks__hint">Esta confirmación se cerrará automáticamente en 5 segundos.</p>
          <button className="ck-btn" onClick={() => navigate('/dashboard', { replace: true })}>Cerrar y ver mis reservas</button>
        </section>
      </main>
    )
  }

  if (status === 'rejected') {
    return (
      <main className={`${themeClass} ck--done`}>
        <section className="ck-thanks ck-rejected" aria-live="assertive">
          <span className="ck-thanks__check ck-thanks__check--error" aria-hidden="true">×</span>
          <h1>Compra rechazada</h1>
          <p>La tarjeta fue declinada. Estamos devolviéndote al checkout para que puedas corregir los datos.</p>
          <p className="ck-thanks__hint">Volverás automáticamente en unos segundos.</p>
          <button
            className="ck-btn"
            onClick={() => {
              setError('Compra rechazada (prueba): la tarjeta fue declinada intencionalmente.')
              setStatus('idle')
            }}
          >
            Volver al checkout
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className={themeClass}>
      <header className="ck-head">
        <h1>Confirma tu reserva</h1>
        <p>Elige cuándo lo necesitas, comparte tus datos y paga en segundos.</p>
      </header>

      <div className="ck-grid">
        <div className="ck-steps">
          <section className="ck-card">
            <h2>¿Por cuánto tiempo?</h2>
            <div className="ck-seg" role="radiogroup" aria-label="Tipo de renta">
              {MODES.filter((m) => availableModes.includes(m.id)).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={mode === m.id}
                  className={mode === m.id ? 'is-on' : ''}
                  onClick={() => changeMode(m.id)}
                >
                  <strong>{m.label}</strong>
                  <span>{cop(rateMap[m.id])}</span>
                </button>
              ))}
            </div>

            <div className="ck-row">
              <label className="ck-field">
                <span>{mode === 'hour' ? 'Fecha' : 'Fecha de inicio'}</span>
                <input type="date" value={date} min={tomorrow()} onChange={(e) => setDate(e.target.value)} />
              </label>

              {mode === 'hour' && (
                <label className="ck-field">
                  <span>Hora de llegada</span>
                  <select value={start} onChange={(e) => changeStart(Number(e.target.value))}>
                    {Array.from({ length: 14 }, (_, i) => 8 + i).map((h) => (
                      <option key={h} value={h}>{hourLabel(h)}</option>
                    ))}
                  </select>
                </label>
              )}

              <div className="ck-field">
                <span>Cantidad de {cfg.unit[1]}</span>
                <div className="ck-step">
                  <button type="button" aria-label="Menos" disabled={qty <= 1} onClick={() => setQty(qty - 1)}>−</button>
                  <output>{qty} {qty === 1 ? cfg.unit[0] : cfg.unit[1]}</output>
                  <button type="button" aria-label="Más" disabled={qty >= maxQty} onClick={() => setQty(qty + 1)}>+</button>
                </div>
              </div>
            </div>
          </section>

          <section className="ck-card">
            <h2>Tus datos</h2>
            <label className="ck-field">
              <span>Nombre completo</span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Camila Restrepo" />
            </label>
            <div className="ck-row">
              <label className="ck-field">
                <span>Correo</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="camila@correo.com"
                  aria-invalid={email.length > 0 && !emailOk}
                />
              </label>
              <label className="ck-field">
                <span>Celular</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  placeholder="300 123 4567"
                />
              </label>
            </div>
          </section>

          <section className="ck-card">
            <h2>¿Cómo quieres pagar?</h2>
            <div className="ck-pays" role="radiogroup" aria-label="Método de pago">
              {PAYS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={pay === p.id}
                  className={pay === p.id ? 'is-on' : ''}
                  onClick={() => setPay(p.id)}
                >
                  <strong>{p.label}</strong>
                  <span>{p.hint}</span>
                </button>
              ))}
            </div>

            {pay === 'card' ? (
              <>
                <label className="ck-field">
                  <span>Número de tarjeta</span>
                  <input
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="0000 0000 0000 0000"
                    value={card}
                    onChange={(e) => setCard(e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim())}
                  />
                </label>
                <div className="ck-row">
                  <label className="ck-field">
                    <span>Vence</span>
                    <input
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      placeholder="MM/AA"
                      value={exp}
                      aria-invalid={exp.length > 0 && !expiryOk}
                      aria-describedby={exp.length === 5 && !expiryOk ? 'checkout-expiry-error' : undefined}
                      onChange={(e) => {
                        const d = e.target.value.replace(/\D/g, '').slice(0, 4)
                        setExp(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d)
                      }}
                    />
                    {exp.length === 5 && !expiryOk && (
                      <span className="ck-field-hint" id="checkout-expiry-error">
                        Fecha inválida o vencida.
                      </span>
                    )}
                  </label>
                  <label className="ck-field">
                    <span>CVC</span>
                    <input
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      placeholder="123"
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    />
                  </label>
                </div>
              </>
            ) : (
              <p className="ck-note">
                {pay === 'pse'
                  ? 'Autoriza el pago desde el portal de tu banco.'
                  : 'Confirma el pago desde la aplicación de Nequi.'}
              </p>
            )}
          </section>
        </div>

        <aside className="ck-ticket" aria-label="Resumen de la reserva">
          <div className="ck-ticket__top">
            <h2>{place?.name ?? 'Espacio'}</h2>
            <p>{place ? `${place.tipo} · ${[place.barrio, place.ciudad].filter(Boolean).join(', ')}` : 'Reserva'}</p>

            <div className="ck-slot">
              <strong>{slot.title}</strong>
              <span>{slot.sub}</span>
            </div>

            {mode === 'hour' && (
              <div className="ck-bar" role="img" aria-label={`Ocupas de ${hourLabel(start)} a ${hourLabel(start + qty)}`}>
                <div className="ck-bar__track">
                  <i
                    style={{
                      left: `${((start - 8) / 14) * 100}%`,
                      width: `${(qty / 14) * 100}%`,
                    }}
                  />
                </div>
                <div className="ck-bar__ends">
                  <span>{hourLabel(8)}</span>
                  <span>{hourLabel(22)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="ck-ticket__bottom">
            {error && (
              <p className="ck-note ck-note--warn" role="alert">{error}</p>
            )}

            <dl className="ck-lines">
              <div>
                <dt>{cop(rateMap[mode])} × {qty} {qty === 1 ? cfg.unit[0] : cfg.unit[1]}</dt>
                <dd>{cop(subtotal)}</dd>
              </div>
              {applied && (
                <div className="is-good">
                  <dt>Cupón {applied}</dt>
                  <dd>−{cop(discount)}</dd>
                </div>
              )}
              <div>
                <dt>Tarifa de servicio</dt>
                <dd>{cop(fee)}</dd>
              </div>
            </dl>

            <div className="ck-coupon">
              <input
                aria-label="Código de cupón"
                placeholder="¿Tienes un cupón?"
                value={coupon}
                onChange={(e) => {
                  setCoupon(e.target.value.toUpperCase())
                  setApplied(null)
                  setCouponDiscount(0)
                  setCouponAttempted(false)
                  setCouponError(null)
                }}
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={Boolean(applied) || couponChecking}
              >
                {couponChecking ? 'Validando...' : applied ? 'Aplicado' : 'Aplicar'}
              </button>
            </div>
            {applied && (
              <p className="ck-note ck-note--success">
                Cupón {applied} aplicado correctamente. Solo se permite un cupón por compra.
              </p>
            )}
            {couponAttempted && couponError && (
              <p className="ck-note ck-note--warn" role="alert">{couponError}</p>
            )}

            <div className="ck-total">
              <span>Total a pagar</span>
              <strong>{cop(total)}</strong>
            </div>

            <label className="ck-check">
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
              <span>Acepto las normas del espacio y la política de cancelación gratuita hasta 48 horas antes.</span>
            </label>

            <button type="button" className="ck-btn ck-btn--secondary" onClick={handleCancel}>
              Cancelar
            </button>

            <button type="button" className="ck-btn" disabled={!canPay || status === 'paying'} onClick={handlePay}>
              {status === 'paying' ? 'Procesando pago…' : `Pagar ${cop(total)}`}
            </button>
          </div>
        </aside>
      </div>
    </main>
  )
}


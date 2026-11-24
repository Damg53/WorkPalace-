import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './Checkout.css'
import { API_BASE_URL, API_UNAVAILABLE_MESSAGE } from '../services/api'
import { formatAvailableFrom } from '../utils/dateFormatting'
import { to12HourTime, to24HourTime } from '../utils/timeInput'
import TimeInput from './TimeInput'
import PhoneNumberInput from './PhoneNumberInput'
import { isValidColombianMobile } from '../utils/phoneValidation'

const API = API_BASE_URL

type Mode = 'hour' | 'halfDay' | 'fullDay' | 'day' | 'night' | 'week' | 'fortnight' | 'month' | 'appointment'
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
  owner_active?: boolean
  active?: boolean
  has_block?: boolean
  has_partial_block?: boolean
  has_reservation?: boolean
  unavailable_reason?: string | null
  available_from?: string | null
}

const MODES: { id: Mode; label: string; unit: [string, string]; max: number }[] = [
  { id: 'hour', label: 'Por hora', unit: ['hora', 'horas'], max: 12 },
  { id: 'halfDay', label: 'Media jornada (4 horas)', unit: ['jornada', 'jornadas'], max: 1 },
  { id: 'fullDay', label: 'Jornada completa (8 horas)', unit: ['jornada', 'jornadas'], max: 1 },
  { id: 'day', label: 'Por día', unit: ['día', 'días'], max: 30 },
  { id: 'night', label: 'Por noche', unit: ['noche', 'noches'], max: 30 },
  { id: 'week', label: 'Por semana', unit: ['semana', 'semanas'], max: 8 },
  { id: 'fortnight', label: 'Por 15 días', unit: ['15 días', '15 días'], max: 4 },
  { id: 'month', label: 'Por mes', unit: ['mes', 'meses'], max: 3 },
  { id: 'appointment', label: 'Solo por cita', unit: ['cita', 'citas'], max: 30 },
]

const BAR_UNITS: Record<Mode, { singular: string; plural: string }> = {
  hour: { singular: 'hora', plural: 'horas' },
  halfDay: { singular: 'jornada', plural: 'jornadas' },
  fullDay: { singular: 'jornada', plural: 'jornadas' },
  day: { singular: 'día', plural: 'días' },
  night: { singular: 'noche', plural: 'noches' },
  week: { singular: 'semana', plural: 'semanas' },
  fortnight: { singular: 'quincena', plural: 'quincenas' },
  month: { singular: 'mes', plural: 'meses' },
  appointment: { singular: 'cita', plural: 'citas' },
}

const FIXED_SCHEDULES: Partial<Record<Mode, { startTime?: string; minStartTime?: string; maxStartTime?: string; minuteStep?: number; durationHours: number }>> = {
  halfDay: { minStartTime: '07:00', maxStartTime: '18:00', minuteStep: 30, durationHours: 4 },
  fullDay: { minStartTime: '07:00', maxStartTime: '09:00', minuteStep: 30, durationHours: 8 },
  night: { startTime: '18:00', durationHours: 14 },
}

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

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

const isValidTimeValue = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)

const minutesToTime = (minutes: number) => {
  const normalized = ((minutes % 1440) + 1440) % 1440
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`
}

const hourLabel = (minutes: number) => {
  const normalized = ((minutes % 1440) + 1440) % 1440
  const hours = Math.floor(normalized / 60)
  return `${hours % 12 || 12}:${String(normalized % 60).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`
}

const toDate = (iso: string, plus = 0) => {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + plus)
  return d
}

const dateLabel = (d: Date) =>
  d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })

const dateInputValue = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const bogotaDateTime = (instant: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  const wallClock = new Date(Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  ))
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
    wallClock,
  }
}

const addDaysToDateInput = (value: string, days: number) => {
  const [year, month, day] = value.split('-').map(Number)
  return dateInputValue(new Date(year, month - 1, day + days))
}

const nextAvailableDateTime = (now: Date) => {
  const nextMinute = bogotaDateTime(now).wallClock
  nextMinute.setUTCSeconds(0, 0)
  nextMinute.setUTCMinutes(nextMinute.getUTCMinutes() + 1)
  return {
    date: `${nextMinute.getUTCFullYear()}-${String(nextMinute.getUTCMonth() + 1).padStart(2, '0')}-${String(nextMinute.getUTCDate()).padStart(2, '0')}`,
    time: `${String(nextMinute.getUTCHours()).padStart(2, '0')}:${String(nextMinute.getUTCMinutes()).padStart(2, '0')}`,
  }
}

const nextAvailableDateTimeAtInterval = (now: Date, interval: number) => {
  const nextAvailable = nextAvailableDateTime(now)
  const roundedMinutes = Math.ceil(timeToMinutes(nextAvailable.time) / interval) * interval
  if (roundedMinutes >= 1440) {
    return { date: addDaysToDateInput(nextAvailable.date, 1), time: '00:00' }
  }
  return { date: nextAvailable.date, time: minutesToTime(roundedMinutes) }
}

const isValidCardExpiry = (value: string) => {
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(value)
  if (!match) return false
  const expiry = new Date(2000 + Number(match[2]), Number(match[1]), 0)
  const now = new Date()
  return expiry >= new Date(now.getFullYear(), now.getMonth() + 1, 0)
}

const getUnavailableMessage = (placeData: Partial<Place> | null | undefined) => {
  if (!placeData) return 'Este espacio no está disponible para la fecha seleccionada.'

  const reason = placeData.unavailable_reason || 'No disponible temporalmente'
  const nextDate = formatAvailableFrom(placeData.available_from)

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

  return modes.length > 0 ? modes : ['hour']
}

export default function Checkout({ user, isDark }: CheckoutProps) {
  const { placeId } = useParams()
  const navigate = useNavigate()

  const [place, setPlace] = useState<Place | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('hour')
  const [availableModes, setAvailableModes] = useState<Mode[]>(['hour', 'day', 'week', 'fortnight', 'month'])
  const [date, setDate] = useState(() => bogotaDateTime(new Date()).date)
  const [startTimeInput, setStartTimeInput] = useState(() => to12HourTime(nextAvailableDateTime(new Date()).time))
  const [clock, setClock] = useState(() => new Date())
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
  const startTime = to24HourTime(startTimeInput)
  const setStartTime = (value: string) => setStartTimeInput(to12HourTime(value))

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

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

        const modesForPlace = getModeOptionsFromPlace(found.modalidad)
        const timedMode = modesForPlace.find((candidate) => ['hour', 'halfDay', 'fullDay', 'night', 'appointment'].includes(candidate))
        const supportsTimedReservations = Boolean(timedMode)
        const reservationMayHaveAnotherAvailableSlot = found.owner_active
          && ((found.has_reservation && !found.has_block) || found.has_partial_block)
          && supportsTimedReservations
        if (!found.active && !reservationMayHaveAnotherAvailableSlot) {
          setPlace(found)
          setError(getUnavailableMessage(found))
          return
        }

        const initialMode = (found.has_partial_block && timedMode ? timedMode : modesForPlace[0]) ?? 'hour'
        setPlace(found)
        setMode(initialMode)
        setAvailableModes(modesForPlace)
        setQty(initialMode === 'hour' ? 3 : 1)
        if (initialMode === 'halfDay' || initialMode === 'fullDay') {
          setStartTimeInput(to12HourTime('07:00'))
        }
        const todayInBogota = bogotaDateTime(new Date()).date
        if (initialMode !== 'hour' && initialMode !== 'appointment' && date <= todayInBogota) {
          setDate(addDaysToDateInput(todayInBogota, 1))
        }
      } catch {
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
  const barUnit = BAR_UNITS[mode]
  const maxQty = cfg.max
  const earliest = nextAvailableDateTime(clock)
  const earliestAppointment = nextAvailableDateTimeAtInterval(clock, 30)
  const todayInBogota = bogotaDateTime(clock).date
  const appointmentMode = mode === 'appointment'
  const fixedSchedule = FIXED_SCHEDULES[mode]
  const timeBasedMode = mode === 'hour' || appointmentMode || Boolean(fixedSchedule)
  const minimumDate = mode === 'hour'
    ? earliest.date
    : appointmentMode
      ? earliestAppointment.date
      : addDaysToDateInput(todayInBogota, 1)
  const minimumTime = mode === 'hour'
    ? date === earliest.date ? earliest.time : '00:00'
    : appointmentMode && date === earliestAppointment.date
      ? earliestAppointment.time
      : fixedSchedule?.minStartTime ?? '00:00'
  const maximumTime = fixedSchedule?.maxStartTime
  const timeMinuteStep = appointmentMode ? 30 : fixedSchedule?.minuteStep ?? 1
  const reservationStartTime = fixedSchedule?.startTime ?? (isValidTimeValue(startTime) ? startTime : minimumTime)
  const reservationHours = mode === 'hour'
    ? qty
    : mode === 'night'
      ? 14 + (qty - 1) * 24
      : fixedSchedule?.durationHours ?? (appointmentMode ? 1 : qty)
  const billableQuantity = mode === 'halfDay' || mode === 'fullDay' ? reservationHours : qty
  const startMinutes = timeToMinutes(reservationStartTime)
  const endMinutes = startMinutes + reservationHours * 60
  const endDate = addDaysToDateInput(date, Math.floor(endMinutes / 1440))
  const appointmentLastEndMinutes = startMinutes + 60
  const appointmentLastEndDate = addDaysToDateInput(
    date,
    qty - 1 + Math.floor(appointmentLastEndMinutes / 1440),
  )
  const reservationEndDate = appointmentMode ? appointmentLastEndDate : endDate
  const reservationEndTime = minutesToTime(appointmentMode ? appointmentLastEndMinutes : endMinutes)
  const barFillPercent = (qty / maxQty) * 100
  const barQuantityLabel = `${qty} ${qty === 1 ? barUnit.singular : barUnit.plural}`
  const barMaximumLabel = `${maxQty} ${maxQty === 1 ? barUnit.singular : barUnit.plural}`
  const chargeUnit = mode === 'hour' || mode === 'halfDay' || mode === 'fullDay'
    ? billableQuantity === 1 ? 'hora' : 'horas'
    : qty === 1 ? cfg.unit[0] : cfg.unit[1]

  useEffect(() => {
    const minDate = mode === 'hour'
      ? earliest.date
      : appointmentMode
        ? earliestAppointment.date
        : addDaysToDateInput(todayInBogota, 1)
    if (date < minDate) setDate(minDate)
    if (mode === 'hour' && date === earliest.date && isValidTimeValue(startTime) && startTime < earliest.time) {
      setStartTime(earliest.time)
    } else if (appointmentMode && date === earliestAppointment.date && isValidTimeValue(startTime) && startTime < earliestAppointment.time) {
      setStartTime(earliestAppointment.time)
    }
  }, [appointmentMode, clock, date, earliest.date, earliest.time, earliestAppointment.date, earliestAppointment.time, mode, startTime, todayInBogota])

  const changeMode = (m: Mode) => {
    setMode(m)
    setQty(m === 'hour' ? 3 : 1)
    if (m === 'appointment') {
      const currentTime = isValidTimeValue(startTime) ? timeToMinutes(startTime) : timeToMinutes(earliestAppointment.time)
      setStartTime(minutesToTime(Math.ceil(currentTime / 30) * 30))
    } else if (m === 'halfDay' || m === 'fullDay') {
      setStartTime('07:00')
    }
    const todayInBogota = bogotaDateTime(new Date()).date
    if (m !== 'hour' && m !== 'appointment' && date <= todayInBogota) {
      setDate(addDaysToDateInput(todayInBogota, 1))
    }
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
  } as const

  const { subtotal, discount, fee, total } = useMemo(() => {
    const subtotalValue = rateMap[mode] * billableQuantity
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
  }, [applied, billableQuantity, couponDiscount, mode, rateMap])

  const slot = useMemo(() => {
    if (mode === 'night') {
      return {
        title: `${dateLabel(toDate(date))} al ${dateLabel(toDate(endDate))}`,
        sub: `${qty} ${qty === 1 ? 'noche' : 'noches'} · 18:00 a 08:00`,
      }
    }

    if (mode === 'appointment' && qty > 1) {
      return {
        title: `${dateLabel(toDate(date))} al ${dateLabel(toDate(appointmentLastEndDate))}`,
        sub: `${qty} citas de 1 hora, una diaria a las ${hourLabel(startMinutes)}`,
      }
    }

    if (timeBasedMode) {
      return {
        title: endDate === date ? dateLabel(toDate(date)) : `${dateLabel(toDate(date))} al ${dateLabel(toDate(endDate))}`,
        sub: `${hourLabel(startMinutes)} a ${hourLabel(endMinutes)}${endDate === date ? '' : ' (día siguiente)'}`,
      }
    }

    const days = mode === 'day' ? qty : mode === 'week' ? qty * 7 : mode === 'fortnight' ? qty * 15 : qty * 30
    return {
      title: `${dateLabel(toDate(date))} al ${dateLabel(toDate(date, days - 1))}`,
      sub: `${days} ${days === 1 ? 'día' : 'días'} completos`,
    }
  }, [appointmentLastEndDate, date, endDate, endMinutes, mode, qty, startMinutes, timeBasedMode])

  const emailOk = /^\S+@\S+\.\S+$/.test(email)
  const phoneOk = isValidColombianMobile(phone)
  const expiryOk = isValidCardExpiry(exp)
  const cardOk = pay !== 'card' || (card.replace(/\s/g, '').length === 16 && expiryOk && cvc.length >= 3)
  const canPay = name.trim().length > 2 && emailOk && phoneOk && cardOk && terms

  async function handlePay() {
    if (!place || !user.id) return
    if (!date) {
      setError('Debes seleccionar una fecha válida.')
      return
    }
    if (mode === 'hour' && !isValidTimeValue(startTime)) {
      setError('Debes seleccionar una hora de inicio válida.')
      return
    }
    if (appointmentMode && (!isValidTimeValue(startTime) || Number(startTime.slice(3)) % 30 !== 0)) {
      setError('Selecciona una hora de inicio válida en intervalos de 30 minutos.')
      return
    }
    if (fixedSchedule?.minStartTime && (!isValidTimeValue(startTime)
      || startTime < fixedSchedule.minStartTime
      || startTime > (fixedSchedule.maxStartTime ?? '23:59')
      || Number(startTime.slice(3)) % (fixedSchedule.minuteStep ?? 1) !== 0)) {
      setError('Selecciona una hora dentro del horario permitido para esta jornada.')
      return
    }
    if (!phoneOk) {
      setError('Ingresa un celular colombiano de 10 dígitos que empiece por 3.')
      return
    }
    if (timeBasedMode && Date.parse(`${date}T${reservationStartTime}:00-05:00`) <= Date.now()) {
      setError('Selecciona una hora de inicio futura.')
      return
    }
    if (mode !== 'hour' && !appointmentMode && date <= bogotaDateTime(new Date()).date) {
      setError('Las reservas por días deben iniciar desde mañana.')
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
          checkOut: timeBasedMode
            ? reservationEndDate
            : addDaysToDateInput(date, qty),
          reservationMode: mode,
          ...(timeBasedMode ? {
            checkInTime: reservationStartTime,
            checkOutTime: reservationEndTime,
          } : {}),
          phone,
          huespedes: billableQuantity,
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
    } catch {
      setError(API_UNAVAILABLE_MESSAGE)
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
    } catch {
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
                <input
                  type="date"
                  value={date}
                  min={minimumDate}
                  required
                  onChange={(event) => {
                    setDate(event.target.value)
                    if (mode === 'hour' && event.target.value === earliest.date && isValidTimeValue(startTime) && startTime < earliest.time) {
                      setStartTime(earliest.time)
                    }
                    if (appointmentMode && event.target.value === earliestAppointment.date && isValidTimeValue(startTime) && startTime < earliestAppointment.time) {
                      setStartTime(earliestAppointment.time)
                    }
                  }}
                />
              </label>

              {mode === 'hour' && (
                <label className="ck-field">
                  <span>Hora de llegada</span>
                  <TimeInput
                    className="ck-time-input"
                    value={startTimeInput}
                    minTime={minimumTime}
                    required
                    onChange={setStartTimeInput}
                  />
                </label>
              )}
              {(appointmentMode || (fixedSchedule?.minStartTime !== undefined)) && (
                <label className="ck-field">
                  <span>{appointmentMode
                    ? 'Hora de inicio (intervalos de 30 minutos)'
                    : mode === 'halfDay'
                      ? `Hora de inicio (${hourLabel(timeToMinutes('07:00'))} a ${hourLabel(timeToMinutes('18:00'))}, cada 30 min)`
                      : `Hora de inicio (${hourLabel(timeToMinutes('07:00'))} a ${hourLabel(timeToMinutes('09:00'))}, cada 30 min)`}</span>
                  <TimeInput
                    className="ck-time-input"
                    value={startTimeInput}
                    minTime={minimumTime}
                    maxTime={maximumTime}
                    minuteStep={timeMinuteStep}
                    allowedPeriods={mode === 'fullDay' ? ['AM'] : undefined}
                    required
                    onChange={setStartTimeInput}
                  />
                </label>
              )}
              {fixedSchedule && (
                <div className="ck-field">
                  <span>Horario establecido</span>
                  <output className="ck-time-summary">{hourLabel(startMinutes)} a {hourLabel(endMinutes)}{endDate === date ? '' : ' (día siguiente)'}</output>
                </div>
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
                <PhoneNumberInput
                  id="checkout-phone"
                  value={phone}
                  onChange={setPhone}
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

            <div
              className="ck-bar"
              role="img"
              aria-label={`Cantidad seleccionada: ${barQuantityLabel} de ${barMaximumLabel}`}
            >
              <div className="ck-bar__track">
                <i style={{ left: 0, width: `${barFillPercent}%` }} />
              </div>
              <div className={`ck-bar__ends${maxQty === 1 ? ' ck-bar__ends--single' : ''}`}>
                <span>1 {barUnit.singular}</span>
                {maxQty > 1 && <span>{barMaximumLabel}</span>}
              </div>
            </div>
          </div>

          <div className="ck-ticket__bottom">
            {error && (
              <p className="ck-note ck-note--warn" role="alert">{error}</p>
            )}

            <dl className="ck-lines">
              <div>
                <dt>{cop(rateMap[mode])} × {billableQuantity} {chargeUnit}</dt>
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
      <div className="ck-mobile-cta">
        <div className="ck-mobile-cta__total">
          <span>Total a pagar</span>
          <strong>{cop(total)}</strong>
        </div>
        <button
          type="button"
          className="ck-btn"
          disabled={!canPay || status === 'paying'}
          onClick={handlePay}
        >
          {status === 'paying' ? 'Procesando…' : canPay ? 'Confirmar reserva' : 'Completa tus datos'}
        </button>
      </div>
    </main>
  )
}

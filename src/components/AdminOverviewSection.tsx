import { useEffect, useState } from 'react'
import type { AdminCoupon, AdminPlace, AdminReservation, AdminUser } from './adminTypes'
import { formatReadableDate, formatReadableTime } from '../utils/dateFormatting'

interface AdminOverviewSectionProps {
  users: AdminUser[]
  reservations: AdminReservation[]
  places: AdminPlace[]
  coupons: AdminCoupon[]
}

function text(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function countCreatedInRange<T extends { created_at?: string }>(items: T[], start: number, end: number) {
  return items.filter((item) => {
    if (!item.created_at) return false
    const createdAt = new Date(item.created_at).getTime()
    return Number.isFinite(createdAt) && createdAt >= start && createdAt < end
  }).length
}

function reservationIncomeInRange(reservations: AdminReservation[], start: number, end: number) {
  return reservations.reduce((total, reservation) => {
    if (reservation.estado === 'cancelada') return total
    const createdAt = typeof reservation.created_at === 'string' ? new Date(reservation.created_at).getTime() : Number.NaN
    if (reservation.total_amount == null) return total
    const amount = Number(reservation.total_amount)
    if (!Number.isFinite(createdAt) || createdAt < start || createdAt >= end || !Number.isFinite(amount)) return total
    return total + amount
  }, 0)
}

function dateInBogota(timestamp: number) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(timestamp))
  const part = (type: string) => parts.find((item) => item.type === type)?.value || ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function couponExpiration(coupon: AdminCoupon) {
  if (!coupon.ends_at) return null
  const date = coupon.ends_at.slice(0, 10)
  const time = coupon.ends_at_time?.slice(0, 5) || null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) return null
  const expiresAt = Date.parse(`${date}T${time ? `${time}:00` : '23:59:59'}-05:00`)
  return Number.isFinite(expiresAt) ? { date, time, expiresAt } : null
}

export default function AdminOverviewSection({ users, reservations, places, coupons }: AdminOverviewSectionProps) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000)
    return () => window.clearInterval(timer)
  }, [])
  const currentPeriodStart = now - 30 * 24 * 60 * 60 * 1000
  const previousPeriodStart = currentPeriodStart - 30 * 24 * 60 * 60 * 1000
  const trends = [
    { label: 'Usuarios registrados', current: countCreatedInRange(users, currentPeriodStart, now + 1), previous: countCreatedInRange(users, previousPeriodStart, currentPeriodStart) },
    { label: 'Reservas creadas', current: countCreatedInRange(reservations, currentPeriodStart, now + 1), previous: countCreatedInRange(reservations, previousPeriodStart, currentPeriodStart) },
    { label: 'Lugares publicados', current: countCreatedInRange(places, currentPeriodStart, now + 1), previous: countCreatedInRange(places, previousPeriodStart, currentPeriodStart) },
  ]
  const totalReservationIncome = reservationIncomeInRange(reservations, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY)
  const currentPeriodIncome = reservationIncomeInRange(reservations, currentPeriodStart, now + 1)
  const previousPeriodIncome = reservationIncomeInRange(reservations, previousPeriodStart, currentPeriodStart)
  const incomeDifference = currentPeriodIncome - previousPeriodIncome
  const incomeChange = previousPeriodIncome > 0
    ? `${incomeDifference > 0 ? '+' : ''}${Math.round((incomeDifference / previousPeriodIncome) * 100)}% frente a los 30 días anteriores`
    : currentPeriodIncome > 0 ? 'Sin ingresos en el período anterior' : 'Sin ingresos en este período'
  const formatCop = (amount: number) => amount.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  })
  const reservationStates = [
    { label: 'Pendientes', value: reservations.filter((item) => item.estado === 'pendiente').length, className: 'pending' },
    { label: 'Confirmadas', value: reservations.filter((item) => item.estado === 'confirmada').length, className: 'confirmed' },
    { label: 'Completadas', value: reservations.filter((item) => item.estado === 'completada').length, className: 'completed' },
    { label: 'Canceladas', value: reservations.filter((item) => item.estado === 'cancelada').length, className: 'cancelled' },
  ]

  const cityCounts = places.reduce<Record<string, number>>((counts, place) => {
    const city = text(place.ciudad, 'Sin ciudad')
    counts[city] = (counts[city] || 0) + 1
    return counts
  }, {})
  const topCities = Object.entries(cityCounts).sort(([, first], [, second]) => second - first).slice(0, 5)
  const inactiveUsers = users.filter((user) => user.active === false).length
  const inactivePlaces = places.filter((place) => place.active === false).length
  const todayInBogota = dateInBogota(now)
  const tomorrowDate = new Date(`${todayInBogota}T00:00:00.000Z`)
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1)
  const tomorrowInBogota = tomorrowDate.toISOString().slice(0, 10)
  const couponExpirations = coupons
    .filter((coupon) => coupon.active)
    .map((coupon) => ({ coupon, expiration: couponExpiration(coupon) }))
    .filter((item): item is { coupon: AdminCoupon; expiration: NonNullable<ReturnType<typeof couponExpiration>> } => item.expiration !== null)
  const couponsNeedingAttention = couponExpirations
    .filter(({ expiration }) => expiration.expiresAt >= now && expiration.expiresAt <= now + 7 * 24 * 60 * 60 * 1000)
    .sort((first, second) => first.expiration.expiresAt - second.expiration.expiresAt)
  const expiredActiveCoupons = couponExpirations.filter(({ expiration }) => expiration.expiresAt < now).length
  const nextCouponExpiration = couponsNeedingAttention[0]?.expiration
  const nextCouponExpiryLabel = nextCouponExpiration
    ? `${nextCouponExpiration.date === todayInBogota ? 'hoy' : nextCouponExpiration.date === tomorrowInBogota ? 'mañana' : formatReadableDate(nextCouponExpiration.date)} ${nextCouponExpiration.time ? `a las ${formatReadableTime(nextCouponExpiration.time)}` : 'al final del día'}`
    : ''
  const recentUsers = users.slice(-4).reverse()
  const recentReservations = reservations.slice(-4).reverse()
  const recentPlaces = places.slice(-4).reverse()
  const pendingMessage = reservationStates[0].value
    ? `${reservationStates[0].value} reserva${reservationStates[0].value === 1 ? '' : 's'} pendiente${reservationStates[0].value === 1 ? '' : 's'} de revisión.`
    : 'No hay reservas pendientes.'
  const inactiveUsersMessage = inactiveUsers
    ? `${inactiveUsers} usuario${inactiveUsers === 1 ? '' : 's'} desactivado${inactiveUsers === 1 ? '' : 's'}.`
    : 'Todos los usuarios están activos.'
  const inactivePlacesMessage = inactivePlaces
    ? `${inactivePlaces} lugar${inactivePlaces === 1 ? '' : 'es'} desactivado${inactivePlaces === 1 ? '' : 's'}.`
    : 'Todos los lugares están publicados.'
  const couponAlertMessage = [
    expiredActiveCoupons
      ? `${expiredActiveCoupons} cupón${expiredActiveCoupons === 1 ? '' : 'es'} activo${expiredActiveCoupons === 1 ? '' : 's'} ya vencido${expiredActiveCoupons === 1 ? '' : 's'}.`
      : '',
    couponsNeedingAttention.length === 1
      ? `1 cupón vence ${nextCouponExpiryLabel}.`
      : couponsNeedingAttention.length > 1
        ? `${couponsNeedingAttention.length} cupones vencen en los próximos 7 días. El próximo vence ${nextCouponExpiryLabel}.`
        : '',
  ].filter(Boolean).join(' ') || 'No hay cupones próximos a vencer.'
  const couponAlertCount = expiredActiveCoupons + couponsNeedingAttention.length

  return (
    <section className="admin-overview">
      <div className="admin-overview-grid">
        <article className="overview-card overview-chart-card">
          <div className="overview-card-heading"><div><span className="overview-kicker">Resumen visual</span><h2>Estado de reservas</h2></div><span className="overview-total">{reservations.length}</span></div>
          <div className="reservation-bars">
            {reservationStates.map((state) => (
              <div className="reservation-bar-row" key={state.label}>
                <span>{state.label}</span><div className="reservation-bar-track"><div className={`reservation-bar-fill ${state.className}`} style={{ width: `${reservations.length ? Math.max((state.value / reservations.length) * 100, state.value ? 8 : 0) : 0}%` }} /></div><strong>{state.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="overview-card">
          <div className="overview-card-heading"><div><span className="overview-kicker">Distribución</span><h2>Lugares por ciudad</h2></div><span className="overview-total">{places.length}</span></div>
          <div className="city-list">
            {topCities.length === 0 ? <p className="overview-empty">Todavía no hay lugares publicados.</p> : topCities.map(([city, count]) => <div className="city-row" key={city}><span>{city}</span><strong>{count}</strong></div>)}
          </div>
        </article>
      </div>

      <article className="overview-card alerts-card">
        <div className="overview-card-heading"><div><span className="overview-kicker">Atención</span><h2>Alertas importantes</h2></div><span className="alert-count">{reservationStates[0].value + inactiveUsers + inactivePlaces + couponAlertCount}</span></div>
        <div className="alert-list">
          <div className={`alert-item ${reservationStates[0].value ? 'has-alert' : 'ok'}`}><span className="alert-dot" /><span>{pendingMessage}</span></div>
          <div className={`alert-item ${inactiveUsers ? 'has-alert' : 'ok'}`}><span className="alert-dot" /><span>{inactiveUsersMessage}</span></div>
          <div className={`alert-item ${inactivePlaces ? 'has-alert' : 'ok'}`}><span className="alert-dot" /><span>{inactivePlacesMessage}</span></div>
          <div className={`alert-item ${couponAlertCount ? 'has-alert' : 'ok'}`}><span className="alert-dot" /><span>{couponAlertMessage}</span></div>
        </div>
      </article>

      <div className="admin-overview-grid">
        <article className="overview-card">
          <div className="overview-card-heading"><div><span className="overview-kicker">Últimos 30 días</span><h2>Tendencia de actividad</h2></div></div>
          <div className="trend-list">
            {trends.map((trend) => {
              const difference = trend.current - trend.previous
              const direction = difference > 0 ? 'up' : difference < 0 ? 'down' : 'steady'
              const changeText = trend.previous === 0
                ? (trend.current ? 'Sin actividad en el período anterior' : 'Sin cambios')
                : `${difference > 0 ? '+' : ''}${Math.round((difference / trend.previous) * 100)}% frente a los 30 días anteriores`
              return (
                <div className="trend-row" key={trend.label}>
                  <span>{trend.label}</span>
                  <strong>{trend.current}</strong>
                  <small className={`trend-change ${direction}`}>{changeText}</small>
                </div>
              )
            })}
          </div>
          <p className="overview-note">La comparación usa la fecha de creación de cada registro.</p>
        </article>

        <article className="overview-card revenue-card">
          <div className="overview-card-heading"><div><span className="overview-kicker">Reservas</span><h2>Ingresos registrados</h2></div></div>
          <strong className="revenue-total">{formatCop(totalReservationIncome)}</strong>
          <p className="overview-note">Suma de reservas no canceladas, incluidas las confirmadas y completadas.</p>
          <div className="revenue-period">
            <span>Últimos 30 días</span>
            <strong>{formatCop(currentPeriodIncome)}</strong>
            <small className={`trend-change ${incomeDifference > 0 ? 'up' : incomeDifference < 0 ? 'down' : 'steady'}`}>{incomeChange}</small>
          </div>
          {reservations.some((reservation) => reservation.total_amount_estimated === true && reservation.estado !== 'cancelada') && (
            <p className="overview-note">Incluye una estimación con los precios actuales para reservas antiguas que no guardaron su monto original.</p>
          )}
        </article>
      </div>

      <div className="admin-overview-grid activity-grid">
        <article className="overview-card activity-card activity-users"><div className="overview-card-heading"><div><span className="overview-kicker">Actividad reciente</span><h2>Nuevos usuarios</h2></div><span className="activity-count">{recentUsers.length}</span></div><div className="activity-list">{recentUsers.length ? recentUsers.map((user) => <div className="activity-item" key={user.id}><span className="activity-icon activity-user-icon"><i className="fa fa-user" aria-hidden="true" /></span><div><strong>{text(user.full_name, user.username)}</strong><span>{user.username}</span></div></div>) : <p className="overview-empty">No hay usuarios recientes.</p>}</div></article>
        <article className="overview-card activity-card activity-reservations"><div className="overview-card-heading"><div><span className="overview-kicker">Actividad reciente</span><h2>Últimas reservas</h2></div><span className="activity-count">{recentReservations.length}</span></div><div className="activity-list">{recentReservations.length ? recentReservations.map((reservation) => <div className="activity-item" key={reservation.id}><span className="activity-icon"><i className="fa fa-calendar" aria-hidden="true" /></span><div><strong>{text(reservation.hotel, 'Reserva sin alojamiento')}</strong><span>{text(reservation.username, 'Cliente')} · {text(reservation.estado, 'Sin estado')}</span></div></div>) : <p className="overview-empty">No hay reservas recientes.</p>}</div></article>
        <article className="overview-card activity-card activity-places"><div className="overview-card-heading"><div><span className="overview-kicker">Actividad reciente</span><h2>Nuevos lugares</h2></div><span className="activity-count">{recentPlaces.length}</span></div><div className="activity-list">{recentPlaces.length ? recentPlaces.map((place) => <div className="activity-item" key={place.id}><span className="activity-icon"><i className="fa fa-home" aria-hidden="true" /></span><div><strong>{place.name}</strong><span>{text(place.tipo, 'Espacio')} · {text(place.ciudad, 'Sin ciudad')}</span></div></div>) : <p className="overview-empty">No hay lugares recientes.</p>}</div></article>
      </div>
    </section>
  )
}

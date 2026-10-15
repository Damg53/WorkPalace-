import type { AdminPlace, AdminReservation, AdminUser } from './adminTypes'

interface AdminOverviewSectionProps {
  users: AdminUser[]
  reservations: AdminReservation[]
  places: AdminPlace[]
}

function text(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

export default function AdminOverviewSection({ users, reservations, places }: AdminOverviewSectionProps) {
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
        <div className="overview-card-heading"><div><span className="overview-kicker">Atención</span><h2>Alertas importantes</h2></div><span className="alert-count">{reservationStates[0].value + inactiveUsers + inactivePlaces}</span></div>
        <div className="alert-list">
          <div className={`alert-item ${reservationStates[0].value ? 'has-alert' : 'ok'}`}><span className="alert-dot" /><span>{pendingMessage}</span></div>
          <div className={`alert-item ${inactiveUsers ? 'has-alert' : 'ok'}`}><span className="alert-dot" /><span>{inactiveUsersMessage}</span></div>
          <div className={`alert-item ${inactivePlaces ? 'has-alert' : 'ok'}`}><span className="alert-dot" /><span>{inactivePlacesMessage}</span></div>
        </div>
      </article>

      <div className="admin-overview-grid activity-grid">
        <article className="overview-card activity-card activity-users"><div className="overview-card-heading"><div><span className="overview-kicker">Actividad reciente</span><h2>Nuevos usuarios</h2></div><span className="activity-count">{recentUsers.length}</span></div><div className="activity-list">{recentUsers.length ? recentUsers.map((user) => <div className="activity-item" key={user.id}><span className="activity-icon activity-user-icon"><i className="fa fa-user" aria-hidden="true" /></span><div><strong>{text(user.full_name, user.username)}</strong><span>@{user.username}</span></div></div>) : <p className="overview-empty">No hay usuarios recientes.</p>}</div></article>
        <article className="overview-card activity-card activity-reservations"><div className="overview-card-heading"><div><span className="overview-kicker">Actividad reciente</span><h2>Últimas reservas</h2></div><span className="activity-count">{recentReservations.length}</span></div><div className="activity-list">{recentReservations.length ? recentReservations.map((reservation) => <div className="activity-item" key={reservation.id}><span className="activity-icon"><i className="fa fa-calendar" aria-hidden="true" /></span><div><strong>{text(reservation.hotel, 'Reserva sin alojamiento')}</strong><span>{text(reservation.username, 'Cliente')} · {text(reservation.estado, 'Sin estado')}</span></div></div>) : <p className="overview-empty">No hay reservas recientes.</p>}</div></article>
        <article className="overview-card activity-card activity-places"><div className="overview-card-heading"><div><span className="overview-kicker">Actividad reciente</span><h2>Nuevos lugares</h2></div><span className="activity-count">{recentPlaces.length}</span></div><div className="activity-list">{recentPlaces.length ? recentPlaces.map((place) => <div className="activity-item" key={place.id}><span className="activity-icon"><i className="fa fa-home" aria-hidden="true" /></span><div><strong>{place.name}</strong><span>{text(place.tipo, 'Espacio')} · {text(place.ciudad, 'Sin ciudad')}</span></div></div>) : <p className="overview-empty">No hay lugares recientes.</p>}</div></article>
      </div>
    </section>
  )
}

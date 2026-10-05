import Sidebar from './Sidebar'
import '../App.css'
import './Dashboard.css'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { cancelReservation } from '../services/api'

interface DashboardProps {
  user: { id?: number; username: string; role?: string; fullName?: string; email?: string }
  onLogout: () => void
  isDark: boolean
  setIsDark: (value: boolean) => void
}

type EstadoReserva = 'confirmada' | 'pendiente' | 'cancelada' | 'completada'

interface Reserva {
  id: number
  hotel: string
  tipo: string
  ubicacion: string
  checkIn: string
  checkOut: string
  checkInRaw: string
  checkOutRaw: string
  huespedes: number
  estado: EstadoReserva
}

const API = 'http://localhost:3001'
const PREFERENCES_KEY = 'workpalace-user-preferences'

function loadUserPreferences() {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY)
    if (!raw) {
      return {
        phone: '',
        city: 'Medellín',
        preferences: 'Trabajo remoto, reuniones y sesiones creativas',
        notificationsEnabled: true,
      }
    }
    const parsed = JSON.parse(raw)
    return {
      phone: typeof parsed.phone === 'string' ? parsed.phone : '',
      city: typeof parsed.city === 'string' ? parsed.city : 'Medellín',
      preferences: typeof parsed.preferences === 'string' ? parsed.preferences : 'Trabajo remoto, reuniones y sesiones creativas',
      notificationsEnabled: typeof parsed.notificationsEnabled === 'boolean' ? parsed.notificationsEnabled : true,
    }
  } catch {
    return {
      phone: '',
      city: 'Medellín',
      preferences: 'Trabajo remoto, reuniones y sesiones creativas',
      notificationsEnabled: true,
    }
  }
}

function saveUserPreferences(preferences: ReturnType<typeof loadUserPreferences>) {
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function isoDateOnly(date: Date): string {
  // YYYY-MM-DD in local time (avoids timezone shifting issues for comparisons)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getCancellationPolicy(r: Reserva) {
  if (!r.checkInRaw) {
    return { label: 'Política estándar', detail: 'Cancelación libre hasta 48 horas antes del inicio.', refund: 'reembolso total' }
  }

  const start = new Date(`${r.checkInRaw}T00:00:00`)
  const today = new Date()
  const diffMs = start.getTime() - today.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays >= 2) {
    return { label: 'Reembolso completo', detail: 'Puedes cancelar sin costo y te devolvemos el valor total.', refund: '100%' }
  }

  if (diffDays >= 1) {
    return { label: 'Reembolso parcial', detail: 'Se aplica una penalidad por cancelación cercana al inicio.', refund: '50%' }
  }

  return { label: 'Sin reembolso', detail: 'La cancelación está sujeta a condiciones del espacio y la fecha.', refund: '0%' }
}

export default function Dashboard({ user, onLogout, isDark, setIsDark }: DashboardProps) {
  const todayIso = isoDateOnly(new Date())
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [availableFilter, setAvailableFilter] = useState<'todas' | EstadoReserva>('todas')
  const [reservationView, setReservationView] = useState<'todas' | 'activas' | 'pendientes' | 'historial'>('todas')
  const [cancelling, setCancelling] = useState<number | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [selectedReservation, setSelectedReservation] = useState<Reserva | null>(null)
  const [preferences] = useState(loadUserPreferences)
  const [favoriteSpaces, setFavoriteSpaces] = useState<Array<{ id: number; place_id: number; place_name: string; place_city: string | null }>>([])
  const [notificationItems, setNotificationItems] = useState<Array<{ id: number; title: string; detail: string; tone: string; is_read: boolean }>>([])
  const [suggestedPlaces, setSuggestedPlaces] = useState<Array<{ id: number; name: string; ciudad: string | null }>>([])

  const prioritizeSuggestedPlaces = (places: Array<{ id: number; name: string; ciudad?: string | null; active?: boolean; precio_hora?: number | null }>, userCity: string) => {
    const normalizedCity = userCity.trim().toLowerCase()

    return [...places]
      .filter((place) => place.name && place.active !== false)
      .sort((a, b) => {
        const cityA = (a.ciudad || '').trim().toLowerCase()
        const cityB = (b.ciudad || '').trim().toLowerCase()

        const cityScoreA = cityA && normalizedCity && (cityA.includes(normalizedCity) || normalizedCity.includes(cityA)) ? 100 : 0
        const cityScoreB = cityB && normalizedCity && (cityB.includes(normalizedCity) || normalizedCity.includes(cityB)) ? 100 : 0

        const aPrice = Number(a.precio_hora || 0)
        const bPrice = Number(b.precio_hora || 0)

        if (cityScoreA !== cityScoreB) return cityScoreB - cityScoreA
        if (aPrice !== bPrice) return aPrice - bPrice
        return (a.name || '').localeCompare(b.name || '')
      })
      .slice(0, 4)
  }

  useEffect(() => {
    saveUserPreferences(preferences)
  }, [preferences])

  useEffect(() => {
    if (!user.id) return

    async function fetchUserExtras() {
      try {
        const [favoritesRes, notificationsRes, placesRes] = await Promise.all([
          fetch(`${API}/api/users/${user.id}/favorites`, {
            headers: { 'x-user-id': String(user.id) },
          }),
          fetch(`${API}/api/users/${user.id}/notifications`, {
            headers: { 'x-user-id': String(user.id) },
          }),
          fetch(`${API}/api/places?date=${encodeURIComponent(todayIso)}`, {
            headers: { 'x-user-id': String(user.id) },
          }),
        ])

        if (favoritesRes.ok) {
          const favoritesData = await favoritesRes.json()
          setFavoriteSpaces(favoritesData.favorites || [])
        }

        if (notificationsRes.ok) {
          const notificationsData = await notificationsRes.json()
          setNotificationItems(notificationsData.notifications || [])
        }

        if (placesRes.ok) {
          const placesData = await placesRes.json()
          const places = Array.isArray(placesData.places) ? placesData.places : []
          const ranked = prioritizeSuggestedPlaces(places, preferences.city || '')
          setSuggestedPlaces(ranked.map((place) => ({
            id: Number(place.id),
            name: String(place.name),
            ciudad: place.ciudad || null,
          })))
        }
      } catch (_error) {
        // ignorar y usar valores vacíos; la UI seguirá funcionando
      }
    }

    fetchUserExtras()
  }, [user.id, todayIso, preferences.city])

  const toggleFavorite = async (place: { id: number; name: string; ciudad: string | null }) => {
    if (!user.id) return

    const exists = favoriteSpaces.some((item) => item.place_id === place.id)

    try {
      if (exists) {
        const res = await fetch(`${API}/api/users/${user.id}/favorites/${place.id}`, {
          method: 'DELETE',
          headers: { 'x-user-id': String(user.id) },
        })
        if (res.ok) {
          setFavoriteSpaces((prev) => prev.filter((item) => item.place_id !== place.id))
        }
        return
      }

      const res = await fetch(`${API}/api/users/${user.id}/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user.id),
        },
        body: JSON.stringify({
          placeId: place.id,
          placeName: place.name,
          placeCity: place.ciudad || '',
        }),
      })

      if (!res.ok) return
      const data = await res.json()
      setFavoriteSpaces((prev) => [
        {
          id: data.favorite.id,
          place_id: data.favorite.place_id,
          place_name: data.favorite.place_name,
          place_city: data.favorite.place_city,
        },
        ...prev,
      ])
    } catch (_error) {
      console.error('Error actualizando favorito')
    }
  }

  const markNotificationRead = async (notificationId: number) => {
    if (!user.id) return

    try {
      const res = await fetch(`${API}/api/users/${user.id}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'x-user-id': String(user.id) },
      })

      if (!res.ok) return

      setNotificationItems((prev) => prev.map((item) =>
        item.id === notificationId ? { ...item, is_read: true } : item
      ))
    } catch (_error) {
      console.error('Error actualizando notificación')
    }
  }

  useEffect(() => {
    if (user.id == null) {
      setLoading(false)
      return
    }
    let cancelled = false
    async function fetchReservations() {
      try {
        const res = await fetch(`${API}/api/reservations`, {
          headers: { 'x-user-id': String(user.id) },
        })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setError(data.error || 'Error al cargar reservas')
          return
        }
        const rows = (data.reservations || []).map((r: {
          id: number
          hotel: string
          tipo_alojamiento: string
          ubicacion: string
          check_in: string
          check_out: string
          huespedes: number
          estado: string
        }) => ({
          id: r.id,
          hotel: r.hotel,
          tipo: r.tipo_alojamiento,
          ubicacion: r.ubicacion,
          checkIn: formatDate(r.check_in),
          checkOut: formatDate(r.check_out),
          checkInRaw: r.check_in,
          checkOutRaw: r.check_out,
          huespedes: r.huespedes,
          estado: r.estado as EstadoReserva,
        }))
        setReservas(rows)
      } catch {
        if (!cancelled) setError('Error de conexión. ¿Está el servidor en marcha?')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchReservations()
    return () => { cancelled = true }
  }, [user.id])

  useEffect(() => {
    if (!selectedReservation) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedReservation(null)
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [selectedReservation])

  const reservasDisponiblesBase = reservas.filter((r) => {
    // "Disponibles" = próximas (desde hoy) y activas (pendiente/confirmada)
    if (r.checkInRaw && r.checkInRaw < todayIso) return false
    return r.estado === 'pendiente' || r.estado === 'confirmada'
  })
  const reservasDisponibles = reservasDisponiblesBase.filter((r) => {
    if (availableFilter === 'todas') return true
    return r.estado === availableFilter
  })

  const activeReservations = reservas.filter((r) => r.estado === 'pendiente' || r.estado === 'confirmada')
  const pendingReservations = reservas.filter((r) => r.estado === 'pendiente')
  const historialReservations = reservas.filter((r) => r.estado === 'cancelada' || r.estado === 'completada')

  const visibleReservations = (() => {
    switch (reservationView) {
      case 'activas':
        return activeReservations
      case 'pendientes':
        return pendingReservations
      case 'historial':
        return historialReservations
      default:
        return reservas
    }
  })()

  const nextReservation = [...reservas]
    .filter((r) => r.estado === 'pendiente' || r.estado === 'confirmada')
    .sort((a, b) => new Date(a.checkInRaw).getTime() - new Date(b.checkInRaw).getTime())[0]

  const handleCancelReservation = async (reservaId: number) => {
    const reservation = reservas.find((item) => item.id === reservaId)
    if (!reservation) return

    const policy = getCancellationPolicy(reservation)
    const confirmed = window.confirm(
      `¿Cancelar ${reservation.hotel}?\n\nPolítica: ${policy.label}. ${policy.detail}`
    )

    if (!confirmed) {
      return
    }

    setCancelling(reservaId)
    setCancelError(null)

    try {
      if (!user.id) {
        throw new Error('Usuario no identificado')
      }
      await cancelReservation(reservaId, user.id)
      // Actualizar la lista de reservaciones
      setReservas((prev) => 
        prev.map((r) => 
          r.id === reservaId ? { ...r, estado: 'cancelada' as EstadoReserva } : r
        )
      )
      setSelectedReservation(null)
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Error al cancelar la reservación'
      setCancelError(errorMsg)
      console.error('Error cancelando reservación:', e)
    } finally {
      setCancelling(null)
    }
  }

  function renderReservationsTable(rows: Reserva[], emptyText: string, showActions: boolean = false) {
    return (
      <div className="dashboard-reservations">
        <div className="reservations-table-wrap">
          <table className="reservations-table">
            <thead>
              <tr>
                <th>Alojamiento</th>
                <th>Ubicación</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Huéspedes</th>
                <th>Estado</th>
                {showActions && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={showActions ? 7 : 6} style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                    {emptyText}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="reservation-hotel">{r.hotel}</span>
                      <div className="reservation-type">{r.tipo}</div>
                    </td>
                    <td>{r.ubicacion}</td>
                    <td>{r.checkIn}</td>
                    <td>{r.checkOut}</td>
                    <td>{r.huespedes}</td>
                    <td>
                      <span className={`reservation-badge ${r.estado}`}>
                        {r.estado.charAt(0).toUpperCase() + r.estado.slice(1)}
                      </span>
                    </td>
                    {showActions && (
                      <td>
                        {(r.estado === 'pendiente' || r.estado === 'confirmada') ? (
                          <button
                            className="cancel-btn"
                            onClick={() => handleCancelReservation(r.id)}
                            disabled={cancelling === r.id}
                            title="Cancelar esta reservación"
                          >
                            {cancelling === r.id ? 'Cancelando...' : 'Cancelar'}
                          </button>
                        ) : (
                          <span style={{ color: '#999', fontSize: '0.9rem' }}>-</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  function renderReservationCards(rows: Reserva[], emptyText: string) {
    return (
      <div className="reservation-card-list">
        {rows.length === 0 ? (
          <div className="reservation-empty-state">{emptyText}</div>
        ) : (
          rows.map((r) => (
            <article key={r.id} className={`reservation-card reservation-card--${r.estado}`}>
              <div className="reservation-card__top">
                <div>
                  <p className="reservation-card__eyebrow">Espacio</p>
                  <h3>{r.hotel}</h3>
                  <span className="reservation-card__type">{r.tipo}</span>
                </div>
                <span className={`reservation-badge ${r.estado}`}>
                  {r.estado.charAt(0).toUpperCase() + r.estado.slice(1)}
                </span>
              </div>

              <div className="reservation-card__meta">
                <div>
                  <span className="reservation-card__label">Ubicación</span>
                  <strong>{r.ubicacion}</strong>
                </div>
                <div>
                  <span className="reservation-card__label">Huéspedes</span>
                  <strong>{r.huespedes}</strong>
                </div>
              </div>

              <div className="reservation-card__dates">
                <div>
                  <span className="reservation-card__label">Check-in</span>
                  <strong>{r.checkIn}</strong>
                </div>
                <div>
                  <span className="reservation-card__label">Check-out</span>
                  <strong>{r.checkOut}</strong>
                </div>
              </div>

              <div className="reservation-card__footer">
                <button
                  type="button"
                  className="reservation-card__ghost"
                  onClick={() => setSelectedReservation(r)}
                  aria-label={`Ver detalles de la reserva de ${r.hotel}`}
                >
                  Ver detalle
                </button>
                {(r.estado === 'pendiente' || r.estado === 'confirmada') && (
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => handleCancelReservation(r.id)}
                    disabled={cancelling === r.id}
                  >
                    {cancelling === r.id ? 'Cancelando...' : 'Cancelar'}
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    )
  }

  return (
    <div className="with-sidebar">
      <Sidebar user={user} isDark={isDark} setIsDark={setIsDark} onLogout={onLogout} />

      {/* Hero-like welcome */}
      <section className="hero">
        <h1>Hola, {user.username}</h1>
        <p>Bienvenido a tu panel de control</p>
      </section>

      <section className="features" id="user-overview">
        <div className="features-container">
          <div className="section-title-row">
            <h2 className="section-title">Mi cuenta</h2>
          </div>

          <div className="user-overview-grid">
            <div className="user-panel-card user-panel-card--primary">
              <span className="user-panel-label">Perfil</span>
              <strong>{user.fullName || user.username}</strong>
              <p>{preferences.city} · {preferences.phone || 'Sin teléfono registrado'}</p>
            </div>
            <div className="user-panel-card">
              <span className="user-panel-label">Preferencias</span>
              <strong>{preferences.notificationsEnabled ? 'Notificaciones activas' : 'Notificaciones pausadas'}</strong>
              <p>{preferences.preferences}</p>
            </div>
            <div className="user-panel-card">
              <span className="user-panel-label">Reservas</span>
              <strong>{activeReservations.length} activas</strong>
              <p>{pendingReservations.length} pendientes y {historialReservations.length} en historial</p>
            </div>
            <div className="user-panel-card">
              <span className="user-panel-label">Próxima reserva</span>
              <strong>{nextReservation ? nextReservation.hotel : 'Sin reservas'}</strong>
              <p>{nextReservation ? `${nextReservation.checkIn} · ${nextReservation.estado}` : 'Explora espacios y crea tu siguiente agenda'}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="features" id="favorites-and-notifications">
        <div className="features-container user-two-column">
          <div className="user-box">
            <div className="section-title-row section-title-row--tight">
              <h2 className="section-title">Favoritos</h2>
            </div>
            <div className="mini-list">
              {favoriteSpaces.length === 0 ? (
                <div className="reservation-empty-state">Aún no tienes favoritos guardados.</div>
              ) : (
                favoriteSpaces.map((space) => (
                  <div className="mini-list-item" key={`${space.place_id}-${space.place_name}`}>
                    <div>
                      <strong>{space.place_name}</strong>
                      <span>{space.place_city || 'Ciudad no indicada'}</span>
                    </div>
                    <button
                      type="button"
                      className="reservation-card__ghost"
                      onClick={() => toggleFavorite({ id: space.place_id, name: space.place_name, ciudad: space.place_city || null })}
                    >
                      Quitar
                    </button>
                  </div>
                ))
              )}
            </div>

            {suggestedPlaces.length > 0 && (
              <div className="suggested-list" style={{ marginTop: '1rem' }}>
                <p className="reservation-empty-state__eyebrow">Sugeridos</p>
                {suggestedPlaces.map((place) => {
                  const isSaved = favoriteSpaces.some((item) => item.place_id === place.id)
                  return (
                    <div className="mini-list-item" key={place.id}>
                      <div>
                        <strong>{place.name}</strong>
                        <span>{place.ciudad || 'Ciudad no indicada'}</span>
                      </div>
                      <button
                        type="button"
                        className="reservation-card__ghost"
                        onClick={() => toggleFavorite(place)}
                      >
                        {isSaved ? 'Guardado' : 'Guardar'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="user-box">
            <div className="section-title-row section-title-row--tight">
              <h2 className="section-title">Notificaciones</h2>
            </div>
            <div className="notification-list">
              {notificationItems.length === 0 ? (
                <div className="reservation-empty-state">No tienes notificaciones nuevas.</div>
              ) : (
                notificationItems.map((item) => (
                  <div className={`notification-item notification-item--${item.tone}`} key={item.id}>
                    <div style={{ width: '100%' }}>
                      <strong>{item.title}</strong>
                      <span>{item.detail}</span>
                    </div>
                    {!item.is_read && (
                      <button
                        type="button"
                        className="reservation-card__ghost"
                        onClick={() => markNotificationRead(item.id)}
                      >
                        Leer
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Reservas disponibles - próximas y activas */}
      <section className="features" id="available-reservations">
        <div className="features-container">
          <div className="section-title-row">
            <h2 className="section-title">Reservas disponibles</h2>
            <div className="reservations-actions">
              <label className="reservations-filter">
                <span>Estado</span>
                <select
                  value={availableFilter}
                  onChange={(e) => setAvailableFilter(e.target.value as ('todas' | EstadoReserva))}
                >
                  <option value="todas">Todas</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="confirmada">Confirmada</option>
                </select>
              </label>
            </div>
          </div>

          <div className="reservation-summary reservation-summary--compact">
            <div className="reservation-summary__item">
              <span>Próximas</span>
              <strong>{reservasDisponibles.length}</strong>
            </div>
            <div className="reservation-summary__item">
              <span>Activas</span>
              <strong>{activeReservations.length}</strong>
            </div>
          </div>

          {error && <p className="reservations-error">{error}</p>}
          {loading ? (
            <p className="settings-loading">Cargando reservas...</p>
          ) : reservasDisponibles.length === 0 ? (
            <div className="reservation-empty-state reservation-empty-state--featured">
              <div>
                <p className="reservation-empty-state__eyebrow">Sin reservas próximas</p>
                <h3>No tienes reservas disponibles por el momento.</h3>
                <p>Explora otros espacios y encuentra el ideal para tu siguiente reserva.</p>
              </div>
              <Link to="/places" className="btn btn-primary reservation-empty-state__button">
                Buscar espacio
              </Link>
            </div>
          ) : (
            renderReservationsTable(
              reservasDisponibles,
              'No hay reservas disponibles (próximas) por el momento.',
              false
            )
          )}
        </div>
      </section>

      {/* Reservas - experiencia tipo dashboard */}
      <section className="features" id="stats">
        <div className="features-container">
          <div className="section-title-row">
            <h2 className="section-title">Mis reservas</h2>
            <div className="reservations-tabs" aria-label="Filtros de reservas">
              {[
                { key: 'todas', label: 'Todas' },
                { key: 'activas', label: 'Activas' },
                { key: 'pendientes', label: 'Pendientes' },
                { key: 'historial', label: 'Historial' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`reservation-tab ${reservationView === tab.key ? 'active' : ''}`}
                  onClick={() => setReservationView(tab.key as 'todas' | 'activas' | 'pendientes' | 'historial')}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="reservation-summary">
            <div className="reservation-summary__item">
              <span>Activas</span>
              <strong>{activeReservations.length}</strong>
            </div>
            <div className="reservation-summary__item">
              <span>Pendientes</span>
              <strong>{pendingReservations.length}</strong>
            </div>
            <div className="reservation-summary__item">
              <span>Historial</span>
              <strong>{historialReservations.length}</strong>
            </div>
          </div>

          {cancelError && <p className="reservations-error">{cancelError}</p>}
          {error && <p className="reservations-error">{error}</p>}
          {loading ? (
            <p className="settings-loading">Cargando reservas...</p>
          ) : (
            renderReservationCards(
              visibleReservations,
              reservationView === 'historial'
                ? 'Todavía no tienes reservas finalizadas o canceladas.'
                : reservationView === 'pendientes'
                  ? 'No tienes reservas pendientes.'
                  : reservationView === 'activas'
                    ? 'No tienes reservas activas en este momento.'
                    : 'No tienes reservas aún.'
            )
          )}
        </div>
      </section>

      {selectedReservation && (
        <div
          className="reservation-detail-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedReservation(null)
          }}
        >
          <section
            className="reservation-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reservation-detail-title"
          >
            <div className="reservation-detail-modal__header">
              <div>
                <p className="reservation-card__eyebrow">Detalle de reserva</p>
                <h2 id="reservation-detail-title">{selectedReservation.hotel}</h2>
              </div>
              <button
                type="button"
                className="reservation-detail-modal__close"
                onClick={() => setSelectedReservation(null)}
                aria-label="Cerrar detalles"
              >
                ×
              </button>
            </div>

            <span className={`reservation-badge ${selectedReservation.estado}`}>
              {selectedReservation.estado.charAt(0).toUpperCase() + selectedReservation.estado.slice(1)}
            </span>

            <dl className="reservation-detail-list">
              <div>
                <dt>Número de reserva</dt>
                <dd>#{selectedReservation.id}</dd>
              </div>
              <div>
                <dt>Tipo de espacio</dt>
                <dd>{selectedReservation.tipo}</dd>
              </div>
              <div>
                <dt>Ubicación</dt>
                <dd>{selectedReservation.ubicacion || 'No especificada'}</dd>
              </div>
              <div>
                <dt>Check-in</dt>
                <dd>{selectedReservation.checkIn}</dd>
              </div>
              <div>
                <dt>Check-out</dt>
                <dd>{selectedReservation.checkOut}</dd>
              </div>
              <div>
                <dt>Huéspedes</dt>
                <dd>{selectedReservation.huespedes}</dd>
              </div>
            </dl>

            <div className="reservation-policy-box">
              <strong>{getCancellationPolicy(selectedReservation).label}</strong>
              <span>{getCancellationPolicy(selectedReservation).detail}</span>
            </div>

            <div className="reservation-detail-modal__footer">
              {(selectedReservation.estado === 'pendiente' || selectedReservation.estado === 'confirmada') && (
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => handleCancelReservation(selectedReservation.id)}
                  disabled={cancelling === selectedReservation.id}
                >
                  {cancelling === selectedReservation.id ? 'Cancelando...' : 'Cancelar reserva'}
                </button>
              )}
              <button type="button" className="reservation-detail-modal__done" onClick={() => setSelectedReservation(null)}>
                Cerrar
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Footer reuse landing footer */}
      <footer id="site-footer">
        <p>&copy; 2026 WorkPalace. Todos los derechos reservados.</p>
        <p>Panel de usuario</p>
      </footer>
    </div>
  )
}

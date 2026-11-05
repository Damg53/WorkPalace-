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
  cancellationReason: string | null
}

interface ReservaApiRecord {
  id: number
  hotel: string
  tipo_alojamiento: string
  ubicacion: string
  check_in: string
  check_out: string
  huespedes: number
  estado: string
  cancellation_reason?: string | null
}

interface NotificationItem {
  id: number
  reservation_id: number | null
  title: string
  detail: string
  tone: string
  is_read: boolean
}

const API = 'http://localhost:3001'
const PREFERENCES_KEY = 'workpalace-user-preferences'

function loadUserPreferences() {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY)
    if (!raw) {
      return {
        phone: '',
        city: '',
        preferences: 'Trabajo remoto, reuniones y sesiones creativas',
        notificationsEnabled: true,
      }
    }
    const parsed = JSON.parse(raw)
    return {
      phone: typeof parsed.phone === 'string' ? parsed.phone : '',
      city: typeof parsed.city === 'string' ? parsed.city : '',
      preferences: typeof parsed.preferences === 'string' ? parsed.preferences : 'Trabajo remoto, reuniones y sesiones creativas',
      notificationsEnabled: typeof parsed.notificationsEnabled === 'boolean' ? parsed.notificationsEnabled : true,
    }
  } catch {
    return {
      phone: '',
      city: '',
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

function mapReservation(reservation: ReservaApiRecord): Reserva {
  return {
    id: Number(reservation.id),
    hotel: reservation.hotel,
    tipo: reservation.tipo_alojamiento,
    ubicacion: reservation.ubicacion,
    checkIn: formatDate(reservation.check_in),
    checkOut: formatDate(reservation.check_out),
    checkInRaw: reservation.check_in,
    checkOutRaw: reservation.check_out,
    huespedes: reservation.huespedes,
    estado: reservation.estado as EstadoReserva,
    cancellationReason: reservation.cancellation_reason ?? null,
  }
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
  const [reservationToCancel, setReservationToCancel] = useState<Reserva | null>(null)
  const [preferences] = useState(loadUserPreferences)
  const [favoriteSpaces, setFavoriteSpaces] = useState<Array<{ id: number; place_id: number; place_name: string; place_city: string | null }>>([])
  const [notificationItems, setNotificationItems] = useState<NotificationItem[]>([])
  const [notificationError, setNotificationError] = useState<string | null>(null)
  const [clearingNotifications, setClearingNotifications] = useState(false)
  const [showClearNotificationsDialog, setShowClearNotificationsDialog] = useState(false)
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
        const [favoritesRes, placesRes] = await Promise.all([
          fetch(`${API}/api/users/${user.id}/favorites`, {
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
      } catch (error) {
        console.error('Error cargando datos complementarios del panel:', error)
      }
    }

    fetchUserExtras()
  }, [user.id, todayIso, preferences.city])

  useEffect(() => {
    if (!user.id) return

    let active = true
    let requestInProgress = false

    const fetchNotifications = async () => {
      if (requestInProgress) return
      requestInProgress = true
      try {
        const response = await fetch(`${API}/api/users/${user.id}/notifications`, {
          headers: { 'x-user-id': String(user.id) },
        })
        if (!response.ok) {
          throw new Error('No se pudieron cargar las notificaciones.')
        }

        const data = await response.json()
        if (active) {
          setNotificationItems(Array.isArray(data.notifications) ? data.notifications : [])
          setNotificationError(null)
        }
      } catch (error) {
        if (active) {
          setNotificationError(error instanceof Error ? error.message : 'No se pudieron cargar las notificaciones.')
        }
      } finally {
        requestInProgress = false
      }
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void fetchNotifications()
    }

    void fetchNotifications()
    const intervalId = window.setInterval(fetchNotifications, 60000)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      active = false
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [user.id])

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
    } catch (error) {
      console.error('Error actualizando favorito:', error)
    }
  }

  const markNotificationRead = async (notificationId: number) => {
    if (!user.id) return

    try {
      const res = await fetch(`${API}/api/users/${user.id}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'x-user-id': String(user.id) },
      })

      if (!res.ok) {
        setNotificationError('No se pudo marcar la notificación como leída.')
        return
      }

      setNotificationItems((prev) => prev.map((item) =>
        item.id === notificationId ? { ...item, is_read: true } : item
      ))
      setNotificationError(null)
      window.dispatchEvent(new Event('workpalace-notifications-updated'))
    } catch {
      setNotificationError('No se pudo marcar la notificación como leída.')
    }
  }

  const clearNotifications = async () => {
    if (!user.id || clearingNotifications || notificationItems.length === 0) return

    setClearingNotifications(true)
    try {
      const response = await fetch(`${API}/api/users/${user.id}/notifications`, {
        method: 'DELETE',
        headers: { 'x-user-id': String(user.id) },
      })
      const data: { error?: string } = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(
          response.status === 503
            ? 'La base de datos no está disponible. Revisa que el servidor de base de datos esté iniciado y vuelve a intentar.'
            : data.error || `No se pudieron limpiar las notificaciones (error ${response.status}).`
        )
      }

      setNotificationItems([])
      setNotificationError(null)
      setShowClearNotificationsDialog(false)
      window.dispatchEvent(new Event('workpalace-notifications-updated'))
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'No se pudieron limpiar las notificaciones.')
    } finally {
      setClearingNotifications(false)
    }
  }

  const openNotificationReservation = async (item: NotificationItem) => {
    if (!user.id || item.reservation_id == null) return

    try {
      const response = await fetch(`${API}/api/reservations`, {
        headers: { 'x-user-id': String(user.id) },
      })
      const data: { reservations?: ReservaApiRecord[]; error?: string } = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo cargar la reserva.')
      }

      const rows = Array.isArray(data.reservations) ? data.reservations : []
      const matchingReservation = rows.find((reservation) => Number(reservation.id) === item.reservation_id)
      if (!matchingReservation) {
        setNotificationError('La reserva asociada ya no está disponible.')
        return
      }

      const updatedReservations = rows.map(mapReservation)
      setReservas(updatedReservations)
      setSelectedReservation(updatedReservations.find((reservation) => reservation.id === item.reservation_id) ?? null)
      await markNotificationRead(item.id)
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'No se pudo abrir la reserva.')
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
        const rows = (data.reservations || []).map(mapReservation)
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

  useEffect(() => {
    if (!showClearNotificationsDialog || clearingNotifications) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowClearNotificationsDialog(false)
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showClearNotificationsDialog, clearingNotifications])

  useEffect(() => {
    if (!reservationToCancel || cancelling != null) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setReservationToCancel(null)
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [reservationToCancel, cancelling])

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
          r.id === reservaId
            ? { ...r, estado: 'cancelada' as EstadoReserva, cancellationReason: 'Cancelada por el usuario.' }
            : r
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

  const requestCancelReservation = (reservaId: number) => {
    const reservation = reservas.find((item) => item.id === reservaId)
    if (reservation) setReservationToCancel(reservation)
  }

  const confirmCancelReservation = async () => {
    if (!reservationToCancel) return
    const reservationId = reservationToCancel.id
    setReservationToCancel(null)
    await handleCancelReservation(reservationId)
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
                            onClick={() => requestCancelReservation(r.id)}
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
                    onClick={() => requestCancelReservation(r.id)}
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
            <div className="section-title-row section-title-row--tight notification-heading">
              <h2 className="section-title">Notificaciones</h2>
              {notificationItems.length > 0 && (
                <button
                  type="button"
                  className="notification-clear-button"
                  onClick={() => setShowClearNotificationsDialog(true)}
                  disabled={clearingNotifications}
                >
                  Limpiar
                </button>
              )}
            </div>
            <div className="notification-list">
              {notificationError && (
                <p className="notification-error" role="alert">{notificationError}</p>
              )}
              {notificationItems.length === 0 ? (
                <div className="reservation-empty-state">No tienes notificaciones.</div>
              ) : (
                notificationItems.map((item) => (
                  <div className={`notification-item notification-item--${item.tone}`} key={item.id}>
                    <div style={{ width: '100%' }}>
                      <strong>{item.title}</strong>
                      <span>{item.detail}</span>
                    </div>
                    {item.reservation_id != null ? (
                      <button
                        type="button"
                        className="reservation-card__ghost"
                        onClick={() => openNotificationReservation(item)}
                      >
                        Ver reserva
                      </button>
                    ) : !item.is_read && (
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

            {selectedReservation.estado === 'cancelada' && selectedReservation.cancellationReason && (
              <div className="reservation-cancellation-reason">
                <strong>Motivo de cancelación</strong>
                <span>{selectedReservation.cancellationReason}</span>
              </div>
            )}

            <div className="reservation-detail-modal__footer">
              {(selectedReservation.estado === 'pendiente' || selectedReservation.estado === 'confirmada') && (
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => requestCancelReservation(selectedReservation.id)}
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

      {showClearNotificationsDialog && (
        <div
          className="notification-confirm-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !clearingNotifications) {
              setShowClearNotificationsDialog(false)
            }
          }}
        >
          <section
            className="notification-confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="notification-confirm-title"
            aria-describedby="notification-confirm-description"
          >
            <div className="notification-confirm-dialog__icon" aria-hidden="true">
              <i className="fa fa-trash-o" />
            </div>
            <h2 id="notification-confirm-title">Limpiar notificaciones</h2>
            <p id="notification-confirm-description">
              Se eliminarán todas tus notificaciones. Esta acción no se puede deshacer.
            </p>
            <div className="notification-confirm-dialog__actions">
              <button
                type="button"
                className="notification-confirm-dialog__cancel"
                onClick={() => setShowClearNotificationsDialog(false)}
                disabled={clearingNotifications}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="notification-confirm-dialog__confirm"
                onClick={clearNotifications}
                disabled={clearingNotifications}
              >
                {clearingNotifications ? 'Limpiando...' : 'Sí, limpiar'}
              </button>
            </div>
          </section>
        </div>
      )}

      {reservationToCancel && (
        <div
          className="notification-confirm-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && cancelling == null) setReservationToCancel(null)
          }}
        >
          <section
            className="notification-confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reservation-cancel-title"
            aria-describedby="reservation-cancel-description"
          >
            <div className="notification-confirm-dialog__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M16 3v4M8 3v4M3 10h18M9 14l6 5M15 14l-6 5" />
              </svg>
            </div>
            <h2 id="reservation-cancel-title">Cancelar reserva</h2>
            <p id="reservation-cancel-description">
              ¿Quieres cancelar la reserva de {reservationToCancel.hotel}?{' '}
              {getCancellationPolicy(reservationToCancel).label}: {getCancellationPolicy(reservationToCancel).detail}
            </p>
            <div className="notification-confirm-dialog__actions">
              <button
                type="button"
                className="notification-confirm-dialog__cancel"
                onClick={() => setReservationToCancel(null)}
                disabled={cancelling != null}
              >
                Volver
              </button>
              <button
                type="button"
                className="notification-confirm-dialog__confirm"
                onClick={() => void confirmCancelReservation()}
                disabled={cancelling != null}
              >
                {cancelling != null ? 'Cancelando...' : 'Sí, cancelar reserva'}
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

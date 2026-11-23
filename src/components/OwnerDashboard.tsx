import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AdminPlacesSection from './AdminPlacesSection'
import PageHeader from './PageHeader'
import WorkPalaceSelect from './WorkPalaceSelect'
import type { AdminPlace } from './adminTypes'
import { API_BASE_URL } from '../services/api'
import { formatReadableDate, formatReadableTime } from '../utils/dateFormatting'
import './OwnerDashboard.css'

interface OwnerDashboardProps {
  user: { id?: number; username: string; fullName?: string }
  onLogout: () => void
  isDark: boolean
  setIsDark: (value: boolean) => void
}

interface OwnerReservation {
  id: number
  hotel: string
  place_name: string
  check_in: string
  check_out: string
  check_in_time: string | null
  check_out_time: string | null
  huespedes: number
  estado: string
  customer_name: string
  can_complete: boolean
}

interface OwnerDashboardMetrics {
  monthly_reservations: number
  priced_reservations: number
  monthly_value: string
  active_space_count: number
  occupancy_percentage: string | null
}

interface OwnerReviewSummary {
  review_count: number
  average_rating: string
}

interface OwnerReview {
  id: number
  rating: number
  comment: string | null
  created_at: string
  place_name: string
  reviewer_name: string
}

interface OwnerAgendaReservation {
  id: number
  check_in: string
  check_out: string
  check_in_time: string | null
  check_out_time: string | null
  customer_name: string
  place_name: string
}

const API = API_BASE_URL
const formatCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})
const cancellationReasons = [
  'El espacio no está disponible en las fechas solicitadas',
  'No fue posible confirmar la reserva',
  'Problema con el pago',
  'La información de la reserva está incompleta o es incorrecta',
  'Incumplimiento de las políticas del espacio',
  'Otro motivo',
]

export default function OwnerDashboard({ user }: OwnerDashboardProps) {
  const location = useLocation()
  const [places, setPlaces] = useState<AdminPlace[]>([])
  const [reservations, setReservations] = useState<OwnerReservation[]>([])
  const [dashboardMetrics, setDashboardMetrics] = useState<OwnerDashboardMetrics | null>(null)
  const [reviewSummary, setReviewSummary] = useState<OwnerReviewSummary | null>(null)
  const [recentReviews, setRecentReviews] = useState<OwnerReview[]>([])
  const [upcomingReservations, setUpcomingReservations] = useState<OwnerAgendaReservation[]>([])
  const [reservationToCancel, setReservationToCancel] = useState<OwnerReservation | null>(null)
  const [cancellationReason, setCancellationReason] = useState('')
  const [customCancellationReason, setCustomCancellationReason] = useState('')
  const [savingCancellation, setSavingCancellation] = useState(false)
  const [cancellationError, setCancellationError] = useState('')
  const [placeToDelete, setPlaceToDelete] = useState<AdminPlace | null>(null)
  const [deletingPlace, setDeletingPlace] = useState(false)
  const [placeDeleteError, setPlaceDeleteError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    'x-user-id': String(user.id ?? ''),
  }), [user.id])

  const loadData = useCallback(async () => {
    try {
      const [placesResponse, reservationsResponse, dashboardResponse] = await Promise.all([
        fetch(`${API}/api/owner/places`, { headers }),
        fetch(`${API}/api/owner/reservations`, { headers }),
        fetch(`${API}/api/owner/dashboard-data`, { headers }),
      ])
      const placesData = await placesResponse.json()
      const reservationsData = await reservationsResponse.json()
      const dashboardData = await dashboardResponse.json() as {
        metrics: OwnerDashboardMetrics
        reviewSummary: OwnerReviewSummary
        reviews: OwnerReview[]
        upcomingReservations: OwnerAgendaReservation[]
        error?: string
      }
      if (!placesResponse.ok) throw new Error(placesData.error || 'No se pudieron cargar tus espacios.')
      if (!reservationsResponse.ok) throw new Error(reservationsData.error || 'No se pudieron cargar tus reservas.')
      if (!dashboardResponse.ok) throw new Error(dashboardData.error || 'No se pudo cargar el resumen de tu negocio.')
      setPlaces(placesData.places || [])
      setReservations(reservationsData.reservations || [])
      setDashboardMetrics(dashboardData.metrics)
      setReviewSummary(dashboardData.reviewSummary)
      setRecentReviews(dashboardData.reviews || [])
      setUpcomingReservations(dashboardData.upcomingReservations || [])
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los datos del propietario.')
    } finally {
      setLoading(false)
    }
  }, [headers])

  useEffect(() => {
    void loadData()
    const intervalId = window.setInterval(() => void loadData(), 30000)
    window.addEventListener('focus', loadData)
    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', loadData)
    }
  }, [loadData])

  async function savePlace(url: string, method: 'POST' | 'PUT' | 'DELETE', body?: unknown) {
    const response = await fetch(url, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    if (!response.ok && response.status !== 204) {
      const data = await response.json() as { error?: string }
      throw new Error(data.error || 'No se pudo guardar el espacio.')
    }
    await loadData()
  }

  async function updateReservation(reservation: OwnerReservation, estado: string, reason?: string): Promise<boolean> {
    try {
      const response = await fetch(`${API}/api/owner/reservations/${reservation.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ estado, ...(reason ? { cancellationReason: reason } : {}) }),
      })
      const data = await response.json() as { error?: string }
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar la reserva.')
      await loadData()
      return true
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar la reserva.')
      return false
    }
  }

  useEffect(() => {
    if (!reservationToCancel || savingCancellation) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setReservationToCancel(null)
        setCancellationReason('')
        setCustomCancellationReason('')
        setCancellationError('')
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [reservationToCancel, savingCancellation])

  useEffect(() => {
    if (!placeToDelete || deletingPlace) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPlaceToDelete(null)
        setPlaceDeleteError('')
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [placeToDelete, deletingPlace])

  const closeCancellationDialog = () => {
    if (savingCancellation) return
    setReservationToCancel(null)
    setCancellationReason('')
    setCustomCancellationReason('')
    setCancellationError('')
  }

  const openCancellationDialog = (reservation: OwnerReservation) => {
    setReservationToCancel(reservation)
    setCancellationReason('')
    setCustomCancellationReason('')
    setCancellationError('')
  }

  const openPlaceDeleteDialog = (id: number) => {
    const place = places.find((item) => item.id === id)
    if (!place) {
      setError('No se encontró el espacio que intentas eliminar.')
      return
    }
    setPlaceToDelete(place)
    setPlaceDeleteError('')
  }

  const closePlaceDeleteDialog = () => {
    if (deletingPlace) return
    setPlaceToDelete(null)
    setPlaceDeleteError('')
  }

  const confirmPlaceDeletion = async () => {
    if (!placeToDelete) return
    setDeletingPlace(true)
    setPlaceDeleteError('')
    try {
      await savePlace(`${API}/api/owner/places/${placeToDelete.id}`, 'DELETE')
      setPlaceToDelete(null)
    } catch (deleteError) {
      setPlaceDeleteError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el espacio.')
    } finally {
      setDeletingPlace(false)
    }
  }

  const confirmCancellation = async () => {
    if (!reservationToCancel || !cancellationReason) {
      setCancellationError('Selecciona el motivo de la cancelación.')
      return
    }
    const reason = cancellationReason === 'Otro motivo'
      ? customCancellationReason.trim()
      : cancellationReason
    if (!reason) {
      setCancellationError('Escribe el motivo de la cancelación.')
      return
    }

    setSavingCancellation(true)
    setCancellationError('')
    const updated = await updateReservation(reservationToCancel, 'cancelada', reason)
    if (updated) {
      setReservationToCancel(null)
      setCancellationReason('')
      setCustomCancellationReason('')
      setCancellationError('')
    } else {
      setCancellationError('No se pudo cancelar la reserva. Revisa el error del panel e inténtalo de nuevo.')
    }
    setSavingCancellation(false)
  }

  const pendingReservations = reservations.filter((reservation) => reservation.estado === 'pendiente').length
  const activePlaces = places.filter((place) => place.active !== false).length
  const listingSuggestions = places
    .map((place) => ({
      place,
      missing: [
        !place.image_url?.trim() ? 'Añade una foto' : '',
        !place.caracteristicas?.trim() ? 'Completa la descripción' : '',
        !place.ciudad?.trim() || (!place.direccion?.trim() && !place.barrio?.trim()) ? 'Completa la ubicación' : '',
        !place.modalidad?.trim() ? 'Indica la modalidad' : '',
      ].filter(Boolean),
    }))
    .filter((suggestion) => suggestion.missing.length > 0)
  const monthlyValue = Number(dashboardMetrics?.monthly_value ?? 0)
  const monthlyOccupancy = dashboardMetrics?.occupancy_percentage === null || !dashboardMetrics
    ? '—'
    : `${Number(dashboardMetrics.occupancy_percentage).toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`
  const activeView = location.hash === '#places'
    ? 'places'
    : location.hash === '#owner-reservations'
      ? 'requests'
      : 'overview'
  const viewContent = {
    overview: {
      eyebrow: 'Panel de propietario',
      title: 'Controla tu negocio desde aquí',
      description: 'Consulta el estado de tus espacios y responde a las solicitudes de reserva.',
      badge: 'Resumen de actividad',
    },
    places: {
      eyebrow: 'Administración',
      title: 'Mis espacios',
      description: 'Publica, actualiza y administra los espacios que ofreces.',
      badge: 'Gestión de espacios',
    },
    requests: {
      eyebrow: 'Reservas',
      title: 'Solicitudes de reserva',
      description: 'Revisa las reservas de tus espacios y actualiza su estado.',
      badge: 'Solicitudes',
    },
  }[activeView]
  const recentPendingReservations = reservations
    .filter((reservation) => reservation.estado === 'pendiente')
    .slice(0, 3)

  return (
    <div className="with-sidebar owner-layout">
      <main className="owner-dashboard" data-owner-view={activeView}>
        <PageHeader
          eyebrow={viewContent.eyebrow}
          title={viewContent.title}
          description={viewContent.description}
          badge={viewContent.badge}
        />

        {error && <p className="owner-dashboard__error" role="alert">{error}</p>}
        {loading && <p className="owner-dashboard__loading" role="status">Cargando los datos de tu cuenta...</p>}

        <div hidden={activeView !== 'overview'}>
            <div className="owner-summary">
              <Link className="owner-stat-card" to="/owner#places">
                <span>Espacios activos</span><strong>{activePlaces}</strong><small>Administrar espacios <span aria-hidden="true">→</span></small>
              </Link>
              <Link className="owner-stat-card" to="/owner#owner-reservations">
                <span>Reservas recibidas</span><strong>{reservations.length}</strong><small>Ver todas las reservas <span aria-hidden="true">→</span></small>
              </Link>
              <Link className="owner-stat-card owner-stat-card--pending" to="/owner#owner-reservations">
                <span>Pendientes de respuesta</span><strong>{pendingReservations}</strong><small>Revisar solicitudes <span aria-hidden="true">→</span></small>
              </Link>
            </div>

            <div className="owner-monthly-metrics">
              <article className="owner-stat-card owner-monthly-card">
                <span>Valor estimado de reservas este mes</span>
                <strong>
                  {!dashboardMetrics
                    ? '—'
                    : dashboardMetrics.priced_reservations > 0
                      ? formatCOP.format(monthlyValue)
                      : 'Sin datos'}
                </strong>
                <small>
                  {dashboardMetrics
                    ? `${dashboardMetrics.priced_reservations} de ${dashboardMetrics.monthly_reservations} con importe; no es liquidación de pagos`
                    : 'Cargando importe...'}
                </small>
              </article>
              <article className="owner-stat-card owner-monthly-card">
                <span>Ocupación estimada del mes</span>
                <strong>{dashboardMetrics ? monthlyOccupancy : '—'}</strong>
                <small>Reservas confirmadas/completadas sobre disponibilidad de 24 h por espacio</small>
              </article>
            </div>

            <div className="owner-overview-grid">
              <section className="owner-overview-card">
                <div className="owner-overview-card__heading">
                  <div><span className="owner-card-eyebrow">Acción requerida</span><h2>Solicitudes pendientes</h2></div>
                  <span className="owner-overview-count">{pendingReservations}</span>
                </div>
                {loading ? (
                  <p className="owner-empty-state">Cargando solicitudes...</p>
                ) : recentPendingReservations.length === 0 ? (
                  <p className="owner-empty-state">No tienes solicitudes pendientes. Aquí aparecerán cuando alguien reserve uno de tus espacios.</p>
                ) : (
                  <div className="owner-pending-list">
                    {recentPendingReservations.map((reservation) => (
                      <article className="owner-pending-item" key={reservation.id}>
                        <span className="owner-pending-item__icon" aria-hidden="true">↗</span>
                        <div>
                          <strong>{reservation.place_name}</strong>
                          <span>{reservation.customer_name} · {formatReadableDate(reservation.check_in)}</span>
                        </div>
                        <span className="owner-pending-status">Pendiente</span>
                      </article>
                    ))}
                  </div>
                )}
                <Link className="owner-card-link" to="/owner#owner-reservations">Gestionar solicitudes <span aria-hidden="true">→</span></Link>
              </section>

              <section className="owner-overview-card owner-spaces-card">
                <div className="owner-overview-card__heading">
                  <div><span className="owner-card-eyebrow">Tu oferta</span><h2>Tus espacios</h2></div>
                  <span className="owner-overview-count">{places.length}</span>
                </div>
                {loading ? (
                  <p className="owner-empty-state">Cargando tus espacios...</p>
                ) : places.length === 0 ? (
                  <p className="owner-empty-state">Aún no has publicado espacios. Crea el primero para empezar a recibir reservas.</p>
                ) : (
                  <div className="owner-space-list">
                    {places.slice(0, 3).map((place) => (
                      <div className="owner-space-item" key={place.id}>
                        <span className={`owner-space-status${place.active === false ? ' is-inactive' : ''}`} aria-hidden="true" />
                        <div><strong>{place.name}</strong><span>{[place.barrio, place.ciudad].filter(Boolean).join(', ') || 'Ubicación por completar'}</span></div>
                        <span className="owner-space-state">{place.active === false ? 'Inactivo' : 'Activo'}</span>
                      </div>
                    ))}
                  </div>
                )}
                <Link className="owner-card-link" to="/owner#places">Administrar espacios <span aria-hidden="true">→</span></Link>
              </section>
            </div>

            <div className="owner-insights-grid">
              <section className="owner-overview-card">
                <div className="owner-overview-card__heading">
                  <div><span className="owner-card-eyebrow">Agenda</span><h2>Próximas reservas</h2></div>
                  <span className="owner-overview-count">{upcomingReservations.length}</span>
                </div>
                {loading ? (
                  <p className="owner-empty-state">Cargando agenda...</p>
                ) : upcomingReservations.length === 0 ? (
                  <p className="owner-empty-state">No tienes reservas confirmadas próximas.</p>
                ) : (
                  <div className="owner-agenda-list">
                    {upcomingReservations.map((reservation) => (
                      <article className="owner-agenda-item" key={reservation.id}>
                        <time className="owner-agenda-date" dateTime={`${reservation.check_in}${reservation.check_in_time ? `T${reservation.check_in_time}` : ''}`}>
                          <strong>{formatReadableDate(reservation.check_in)}</strong>
                          {reservation.check_in_time && <span>{formatReadableTime(reservation.check_in_time)}</span>}
                        </time>
                        <div>
                          <strong>{reservation.place_name}</strong>
                          <span>{reservation.customer_name}</span>
                          <small>
                            Hasta {formatReadableDate(reservation.check_out)}
                            {reservation.check_out_time ? ` · ${formatReadableTime(reservation.check_out_time)}` : ''}
                          </small>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                <Link className="owner-card-link" to="/owner#owner-reservations">Ver reservas <span aria-hidden="true">→</span></Link>
              </section>

              <section className="owner-overview-card">
                <div className="owner-overview-card__heading">
                  <div><span className="owner-card-eyebrow">Calidad de publicación</span><h2>Mejoras para tus espacios</h2></div>
                  <span className="owner-overview-count">{listingSuggestions.length}</span>
                </div>
                {loading ? (
                  <p className="owner-empty-state">Revisando tus publicaciones...</p>
                ) : places.length === 0 ? (
                  <p className="owner-empty-state">Publica un espacio para recibir recomendaciones de mejora.</p>
                ) : listingSuggestions.length === 0 ? (
                  <p className="owner-empty-state">Tus publicaciones incluyen foto, descripción, ubicación y modalidad.</p>
                ) : (
                  <div className="owner-listing-issues">
                    {listingSuggestions.slice(0, 4).map(({ place, missing }) => (
                      <article className="owner-listing-issue" key={place.id}>
                        <strong>{place.name}</strong>
                        <span>{missing.join(' · ')}</span>
                      </article>
                    ))}
                    {listingSuggestions.length > 4 && (
                      <p className="owner-review-total">Y {listingSuggestions.length - 4} espacios más pueden mejorar.</p>
                    )}
                  </div>
                )}
                <Link className="owner-card-link" to="/owner#places">Completar publicaciones <span aria-hidden="true">→</span></Link>
              </section>

              <section className="owner-overview-card owner-reviews-card">
                <div className="owner-overview-card__heading">
                  <div><span className="owner-card-eyebrow">Opiniones</span><h2>Reseñas recientes</h2></div>
                  {reviewSummary && reviewSummary.review_count > 0 && (
                    <span className="owner-review-rating" aria-label={`${reviewSummary.average_rating} de 5 estrellas`}>
                      <span aria-hidden="true">★</span> {reviewSummary.average_rating}
                    </span>
                  )}
                </div>
                <p className="owner-review-total">
                  {loading
                    ? 'Cargando reseñas...'
                    : reviewSummary && reviewSummary.review_count > 0
                    ? `${reviewSummary.review_count} reseña${reviewSummary.review_count === 1 ? '' : 's'} en tus espacios`
                    : 'Aún no tienes reseñas.'}
                </p>
                {!loading && recentReviews.length > 0 && (
                  <div className="owner-review-list">
                    {recentReviews.map((review) => (
                      <article className="owner-review-item" key={review.id}>
                        <div>
                          <strong>{review.reviewer_name} · {review.place_name}</strong>
                          <span>{formatReadableDate(review.created_at)}</span>
                        </div>
                        <span className="owner-review-stars" aria-label={`${review.rating} de 5 estrellas`}>
                          {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                        </span>
                        {review.comment && <p>{review.comment}</p>}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
        </div>

        <div hidden={activeView !== 'places'}>
          <AdminPlacesSection
            places={places}
            withTopSpacing={false}
            createPlace={async (place) => {
              try {
                await savePlace(`${API}/api/owner/places`, 'POST', place)
              } catch (createError) {
                setError(createError instanceof Error ? createError.message : 'No se pudo publicar el espacio.')
                throw createError
              }
            }}
            updatePlace={(id, payload) => {
              void savePlace(`${API}/api/owner/places/${id}`, 'PUT', payload).catch((updateError: unknown) => {
                setError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar el espacio.')
              })
            }}
            togglePlaceActive={(id, active) => {
              void savePlace(`${API}/api/owner/places/${id}`, 'PUT', { active }).catch((updateError: unknown) => {
                setError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar el estado del espacio.')
              })
            }}
            deletePlace={openPlaceDeleteDialog}
          />
        </div>

        <div hidden={activeView !== 'requests'}>
          <section className="users-section owner-reservations" id="owner-reservations">
            <div className="admin-section-heading">
              <div>
                <h2>Reservas de tus espacios</h2>
                <p className="admin-section-message">Confirma solicitudes y consulta el estado de cada reserva.</p>
              </div>
            </div>
            {loading ? (
              <p className="admin-empty-state">Cargando reservas...</p>
            ) : reservations.length === 0 ? (
              <p className="admin-empty-state">Todavía no has recibido reservas.</p>
            ) : (
              <div className="owner-reservation-list">
                {reservations.map((reservation) => {
                  const canComplete = reservation.estado === 'confirmada' && reservation.can_complete
                  return (
                    <article className="owner-reservation" key={reservation.id}>
                      <div>
                        <strong>{reservation.place_name}</strong>
                        <span>Reserva #{reservation.id} · {reservation.customer_name}</span>
                        <span>
                          {formatReadableDate(reservation.check_in)}
                          {reservation.check_in_time ? ` · ${formatReadableTime(reservation.check_in_time)}` : ''}
                          {' al '}
                          {formatReadableDate(reservation.check_out)}
                          {reservation.check_out_time ? ` · ${formatReadableTime(reservation.check_out_time)}` : ''}
                          {' · '}{reservation.huespedes}{reservation.check_in_time ? ' horas' : ' unidades'}
                        </span>
                      </div>
                      <span className={`reservation-badge ${reservation.estado}`}>{reservation.estado}</span>
                      <div className="owner-reservation__actions">
                        {reservation.estado === 'pendiente' && (
                          <>
                            <button type="button" className="btn btn-primary" onClick={() => void updateReservation(reservation, 'confirmada')}>Confirmar</button>
                            <button type="button" className="btn btn-secondary" onClick={() => openCancellationDialog(reservation)}>Rechazar</button>
                          </>
                        )}
                        {reservation.estado === 'confirmada' && (
                          <>
                            <button type="button" className="btn btn-secondary" onClick={() => openCancellationDialog(reservation)}>Cancelar</button>
                            {canComplete && <button type="button" className="btn btn-primary" onClick={() => void updateReservation(reservation, 'completada')}>Marcar completada</button>}
                          </>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
          {reservationToCancel && (
            <div
              className="admin-cancel-dialog-overlay"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) closeCancellationDialog()
              }}
            >
              <section
                className="admin-cancel-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="owner-cancel-title"
              >
                <div className="admin-cancel-dialog__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M16 3v4M8 3v4M3 10h18M9 14l6 5M15 14l-6 5" />
                  </svg>
                </div>
                <h3 id="owner-cancel-title">Cancelar reserva #{reservationToCancel.id}</h3>
                <p>Selecciona el motivo. El cliente lo verá en la notificación de cancelación.</p>
                <label htmlFor="owner-cancel-reason">Motivo de cancelación</label>
                <WorkPalaceSelect
                  inputId="owner-cancel-reason"
                  className="wp-select--cancel-reason"
                  value={cancellationReason}
                  onChange={(value) => {
                    setCancellationReason(value)
                    setCancellationError('')
                  }}
                  disabled={savingCancellation}
                  required
                  ariaLabel="Motivo de cancelación"
                  options={[
                    { value: '', label: 'Selecciona un motivo' },
                    ...cancellationReasons.map((reason) => ({ value: reason, label: reason })),
                  ]}
                />
                {cancellationReason === 'Otro motivo' && (
                  <textarea
                    value={customCancellationReason}
                    onChange={(event) => {
                      setCustomCancellationReason(event.target.value)
                      setCancellationError('')
                    }}
                    maxLength={500}
                    placeholder="Escribe el motivo para el cliente"
                    aria-label="Escribe el motivo de cancelación"
                    disabled={savingCancellation}
                  />
                )}
                {cancellationError && <p className="admin-cancel-dialog__error" role="alert">{cancellationError}</p>}
                <div className="admin-cancel-dialog__actions">
                  <button type="button" onClick={closeCancellationDialog} disabled={savingCancellation}>Volver</button>
                  <button
                    type="button"
                    className="admin-cancel-dialog__confirm"
                    onClick={() => void confirmCancellation()}
                    disabled={savingCancellation}
                  >
                    {savingCancellation ? 'Cancelando...' : 'Confirmar cancelación'}
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
        {placeToDelete && (
          <div
            className="admin-cancel-dialog-overlay"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closePlaceDeleteDialog()
            }}
          >
            <section
              className="admin-cancel-dialog"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="owner-delete-title"
              aria-describedby="owner-delete-message"
            >
              <div className="admin-cancel-dialog__icon" aria-hidden="true">
                <i className="fa fa-trash-o" />
              </div>
              <h3 id="owner-delete-title">Eliminar espacio</h3>
              <p id="owner-delete-message">
                ¿Eliminar “{placeToDelete.name}”? Si tiene reservas, deberás desactivarlo para conservar el historial.
              </p>
              {placeDeleteError && <p className="admin-cancel-dialog__error" role="alert">{placeDeleteError}</p>}
              <div className="admin-cancel-dialog__actions">
                <button type="button" onClick={closePlaceDeleteDialog} disabled={deletingPlace}>Cancelar</button>
                <button
                  type="button"
                  className="admin-cancel-dialog__confirm"
                  onClick={() => void confirmPlaceDeletion()}
                  disabled={deletingPlace}
                >
                  {deletingPlace ? 'Eliminando...' : 'Eliminar espacio'}
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

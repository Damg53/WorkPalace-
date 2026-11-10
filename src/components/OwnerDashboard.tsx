import { useCallback, useEffect, useMemo, useState } from 'react'
import Sidebar from './Sidebar'
import AdminPlacesSection from './AdminPlacesSection'
import type { AdminPlace } from './adminTypes'
import { API_BASE_URL } from '../services/api'
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
  huespedes: number
  estado: string
  customer_name: string
}

const API = API_BASE_URL

function localDateString() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function OwnerDashboard({ user, onLogout, isDark, setIsDark }: OwnerDashboardProps) {
  const [places, setPlaces] = useState<AdminPlace[]>([])
  const [reservations, setReservations] = useState<OwnerReservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    'x-user-id': String(user.id ?? ''),
  }), [user.id])

  const loadData = useCallback(async () => {
    try {
      const [placesResponse, reservationsResponse] = await Promise.all([
        fetch(`${API}/api/owner/places`, { headers }),
        fetch(`${API}/api/owner/reservations`, { headers }),
      ])
      const placesData = await placesResponse.json()
      const reservationsData = await reservationsResponse.json()
      if (!placesResponse.ok) throw new Error(placesData.error || 'No se pudieron cargar tus espacios.')
      if (!reservationsResponse.ok) throw new Error(reservationsData.error || 'No se pudieron cargar tus reservas.')
      setPlaces(placesData.places || [])
      setReservations(reservationsData.reservations || [])
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

  async function updateReservation(reservation: OwnerReservation, estado: string) {
    try {
      const response = await fetch(`${API}/api/owner/reservations/${reservation.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ estado }),
      })
      const data = await response.json() as { error?: string }
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar la reserva.')
      await loadData()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar la reserva.')
    }
  }

  const pendingReservations = reservations.filter((reservation) => reservation.estado === 'pendiente').length
  const activePlaces = places.filter((place) => place.active !== false).length
  const today = localDateString()

  return (
    <div className="with-sidebar">
      <Sidebar user={user} isDark={isDark} setIsDark={setIsDark} onLogout={onLogout} />
      <section className="hero">
        <h1>Panel de propietario</h1>
        <p>Administra tus espacios y responde a las solicitudes de reserva.</p>
      </section>

      <section className="features owner-dashboard">
        <div className="features-container">
          <div className="owner-summary">
            <article><span>Espacios publicados</span><strong>{activePlaces}</strong></article>
            <article><span>Reservas recibidas</span><strong>{reservations.length}</strong></article>
            <article><span>Pendientes de respuesta</span><strong>{pendingReservations}</strong></article>
          </div>

          {error && <p className="owner-dashboard__error" role="alert">{error}</p>}
          {loading && <p className="settings-loading">Cargando panel de propietario...</p>}

          <AdminPlacesSection
            places={places}
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
            deletePlace={(id) => {
              if (window.confirm('¿Eliminar este espacio? Si tiene reservas, deberás desactivarlo para conservar el historial.')) {
                void savePlace(`${API}/api/owner/places/${id}`, 'DELETE').catch((deleteError: unknown) => {
                  setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el espacio.')
                })
              }
            }}
          />

          <section className="users-section owner-reservations">
            <div className="admin-section-heading">
              <div>
                <h2>Reservas de tus espacios</h2>
                <p className="admin-section-message">Confirma solicitudes y consulta el estado de cada reserva.</p>
              </div>
            </div>
            {reservations.length === 0 ? (
              <p className="admin-empty-state">Todavía no has recibido reservas.</p>
            ) : (
              <div className="owner-reservation-list">
                {reservations.map((reservation) => {
                  const canComplete = reservation.estado === 'confirmada' && reservation.check_out.slice(0, 10) <= today
                  return (
                    <article className="owner-reservation" key={reservation.id}>
                      <div>
                        <strong>{reservation.place_name}</strong>
                        <span>Reserva #{reservation.id} · {reservation.customer_name}</span>
                        <span>{reservation.check_in.slice(0, 10)} al {reservation.check_out.slice(0, 10)} · {reservation.huespedes} unidades</span>
                      </div>
                      <span className={`reservation-badge ${reservation.estado}`}>{reservation.estado}</span>
                      <div className="owner-reservation__actions">
                        {reservation.estado === 'pendiente' && (
                          <>
                            <button type="button" className="btn btn-primary" onClick={() => void updateReservation(reservation, 'confirmada')}>Confirmar</button>
                            <button type="button" className="btn btn-secondary" onClick={() => void updateReservation(reservation, 'cancelada')}>Rechazar</button>
                          </>
                        )}
                        {reservation.estado === 'confirmada' && (
                          <>
                            <button type="button" className="btn btn-secondary" onClick={() => void updateReservation(reservation, 'cancelada')}>Cancelar</button>
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
        </div>
      </section>
    </div>
  )
}

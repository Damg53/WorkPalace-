import Navbar from './Navbar'
import './Landing.css'   // reuse landing styles for dashboard
import './Dashboard.css'
import { useState, useEffect } from 'react'
import { cancelReservation } from '../services/api'

interface DashboardProps {
  user: { id?: number; username: string; role?: string }
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

export default function Dashboard({ user, onLogout, isDark, setIsDark }: DashboardProps) {
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [availableFilter, setAvailableFilter] = useState<'todas' | EstadoReserva>('todas')
  const [cancelling, setCancelling] = useState<number | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)

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
      } catch (e) {
        if (!cancelled) setError('Error de conexión. ¿Está el servidor en marcha?')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchReservations()
    return () => { cancelled = true }
  }, [user.id])

  const todayIso = isoDateOnly(new Date())
  const reservasDisponiblesBase = reservas.filter((r) => {
    // "Disponibles" = próximas (desde hoy) y activas (pendiente/confirmada)
    if (r.checkInRaw && r.checkInRaw < todayIso) return false
    return r.estado === 'pendiente' || r.estado === 'confirmada'
  })
  const reservasDisponibles = reservasDisponiblesBase.filter((r) => {
    if (availableFilter === 'todas') return true
    return r.estado === availableFilter
  })

  const handleCancelReservation = async (reservaId: number) => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar esta reservación?')) {
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

  return (
    <>
      <Navbar isDark={isDark} setIsDark={setIsDark} user={user} onLogout={onLogout} />

      {/* Hero-like welcome */}
      <section className="hero">
        <h1>Hola, {user.username}</h1>
        <p>Bienvenido a tu panel de control</p>
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

          {error && <p className="reservations-error">{error}</p>}
          {loading ? (
            <p className="settings-loading">Cargando reservas...</p>
          ) : (
            renderReservationsTable(
              reservasDisponibles,
              'No hay reservas disponibles (próximas) por el momento.',
              false
            )
          )}
        </div>
      </section>

      {/* Reservas - tabla estilo Airbnb */}
      <section className="features" id="stats">
        <div className="features-container">
          <h2 className="section-title">Mis reservas</h2>
          {cancelError && <p className="reservations-error">{cancelError}</p>}
          {error && <p className="reservations-error">{error}</p>}
          {loading ? (
            <p className="settings-loading">Cargando reservas...</p>
          ) : (
            renderReservationsTable(reservas, 'No tienes reservas aún.', true)
          )}
        </div>
      </section>

      {/* Footer reuse landing footer */}
      <footer id="site-footer">
        <p>&copy; 2026 WorkPalace. Todos los derechos reservados.</p>
        <p>Panel de usuario</p>
      </footer>
    </>
  )
}

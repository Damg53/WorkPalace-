import Navbar from './Navbar'
import './Landing.css'   // reuse landing styles for dashboard
import './Dashboard.css'
import { useState, useEffect } from 'react'

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

export default function Dashboard({ user, onLogout, isDark, setIsDark }: DashboardProps) {
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <>
      <Navbar isDark={isDark} setIsDark={setIsDark} user={user} onLogout={onLogout} />

      {/* Hero-like welcome */}
      <section className="hero">
        <h1>Hola, {user.username}</h1>
        <p>Bienvenido a tu panel de control</p>
      </section>

      {/* Reservas - tabla estilo Airbnb */}
      <section className="features" id="stats">
        <div className="features-container">
          <h2 className="section-title">Mis reservas</h2>
          {error && <p className="reservations-error">{error}</p>}
          {loading ? (
            <p className="settings-loading">Cargando reservas...</p>
          ) : (
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
                  </tr>
                </thead>
                <tbody>
                  {reservas.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                        No tienes reservas aún.
                      </td>
                    </tr>
                  ) : (
                  reservas.map((r) => (
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
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
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

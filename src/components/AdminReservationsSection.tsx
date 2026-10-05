import { useState } from 'react'
import type { AdminReservation } from './adminTypes'

interface AdminReservationsSectionProps {
  reservations: AdminReservation[]
  updateReservation: (id: number, payload: Partial<AdminReservation>) => void
  deleteReservation: (id: number) => void
}

export default function AdminReservationsSection({ reservations, updateReservation, deleteReservation }: AdminReservationsSectionProps) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const filteredReservations = reservations.filter((reservation) => {
    const haystack = `${reservation.username ?? ''} ${reservation.email ?? ''} ${reservation.hotel ?? ''} ${reservation.ubicacion ?? ''}`.toLowerCase()
    return haystack.includes(query.toLowerCase()) && (status === 'all' || reservation.estado === status)
  })

  return (
    <section className="users-section" id="reservations" style={{ marginTop: '3rem' }}>
      <h2>Reservas de clientes</h2>
      <div className="admin-toolbar"><input placeholder="Buscar cliente, espacio o ubicación" value={query} onChange={(event) => setQuery(event.target.value)} /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos los estados</option><option value="pendiente">Pendientes</option><option value="confirmada">Confirmadas</option><option value="completada">Completadas</option><option value="cancelada">Canceladas</option></select><span>{filteredReservations.length} resultados</span></div>

      {reservations.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>No hay reservas registradas.</p>
      ) : (
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr><th>ID</th><th>Usuario</th><th>Email</th><th>Alojamiento</th><th>Ubicación</th><th>Check-in</th><th>Check-out</th><th>Huéspedes</th><th>Estado</th><th>Activo</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {filteredReservations.map((reservation) => (
                <tr key={reservation.id}>
                  <td>#{reservation.id}</td>
                  <td>{String(reservation.username ?? `Usuario #${reservation.user_id ?? ''}`)}</td>
                  <td>{String(reservation.email ?? 'N/A')}</td>
                  <td>{String(reservation.hotel ?? '')}</td>
                  <td>{String(reservation.ubicacion ?? '')}</td>
                  <td>{String(reservation.check_in ?? '')}</td>
                  <td>{String(reservation.check_out ?? '')}</td>
                  <td>
                    <input type="number" min={1} value={typeof reservation.huespedes === 'number' ? reservation.huespedes : 1} onChange={(event) => updateReservation(reservation.id, { huespedes: Number(event.target.value) || 1 })} className="table-input" style={{ width: '4rem' }} />
                  </td>
                  <td>
                    <select value={typeof reservation.estado === 'string' ? reservation.estado : ''} onChange={(event) => { const nextStatus = event.target.value; updateReservation(reservation.id, { estado: nextStatus, ...(nextStatus === 'completada' || nextStatus === 'cancelada' ? { active: true } : {}) }) }} className="table-select">
                      <option value="pendiente">Pendiente</option><option value="confirmada">Confirmada</option><option value="completada">Completada</option><option value="cancelada">Cancelada</option>
                    </select>
                  </td>
                  <td>
                    <input type="checkbox" checked={reservation.active !== false} disabled={reservation.estado === 'completada' || reservation.estado === 'cancelada'} onChange={(event) => updateReservation(reservation.id, { active: event.target.checked })} />
                  </td>
                  <td>
                    <button className="user-delete-button" onClick={() => deleteReservation(reservation.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

import { useEffect, useState } from 'react'
import type { AdminReservation } from './adminTypes'
import { formatReadableDate, formatReadableTime } from '../utils/dateFormatting'

interface AdminReservationsSectionProps {
  reservations: AdminReservation[]
  updateReservation: (id: number, payload: Partial<AdminReservation>) => Promise<boolean>
  deleteReservation: (id: number) => void
}

const cancellationReasons = [
  'El espacio no está disponible en las fechas solicitadas',
  'No fue posible confirmar la reserva',
  'Problema con el pago',
  'La información de la reserva está incompleta o es incorrecta',
  'Incumplimiento de las políticas del espacio',
  'Otro motivo',
]

export default function AdminReservationsSection({ reservations, updateReservation, deleteReservation }: AdminReservationsSectionProps) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [reservationToCancel, setReservationToCancel] = useState<AdminReservation | null>(null)
  const [cancellationReason, setCancellationReason] = useState('')
  const [customCancellationReason, setCustomCancellationReason] = useState('')
  const [savingCancellation, setSavingCancellation] = useState(false)
  const [cancellationError, setCancellationError] = useState('')

  useEffect(() => {
    if (!reservationToCancel || savingCancellation) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setReservationToCancel(null)
        setCancellationReason('')
        setCustomCancellationReason('')
        setCancellationError('')
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [reservationToCancel, savingCancellation])

  const closeCancellationDialog = () => {
    if (savingCancellation) return
    setReservationToCancel(null)
    setCancellationReason('')
    setCustomCancellationReason('')
    setCancellationError('')
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
    const updated = await updateReservation(reservationToCancel.id, {
      estado: 'cancelada',
      active: true,
      cancellationReason: reason,
    })
    setSavingCancellation(false)
    if (updated) closeCancellationDialog()
    else setCancellationError('No se pudo cancelar la reserva. Revisa el error del panel e inténtalo de nuevo.')
  }

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
        <div className="users-table-wrapper" role="region" aria-label="Tabla de reservas" tabIndex={0}>
          <table className="users-table">
            <thead>
              <tr><th>ID</th><th>Usuario</th><th>Email</th><th>Alojamiento</th><th>Ubicación</th><th>Check-in</th><th>Check-out</th><th>Huéspedes / horas</th><th>Estado</th><th>Activo</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {filteredReservations.map((reservation) => (
                <tr key={reservation.id}>
                  <td data-label="ID">#{reservation.id}</td>
                  <td data-label="Usuario">{String(reservation.username ?? `Usuario #${reservation.user_id ?? ''}`)}</td>
                  <td data-label="Email">{String(reservation.email ?? 'N/A')}</td>
                  <td data-label="Espacio">{String(reservation.hotel ?? '')}</td>
                  <td data-label="Ubicación">{String(reservation.ubicacion ?? '')}</td>
                  <td data-label="Check-in">
                    {formatReadableDate(reservation.check_in)}
                    {typeof reservation.check_in_time === 'string' && ` · ${formatReadableTime(reservation.check_in_time)}`}
                  </td>
                  <td data-label="Check-out">
                    {formatReadableDate(reservation.check_out)}
                    {typeof reservation.check_out_time === 'string' && ` · ${formatReadableTime(reservation.check_out_time)}`}
                  </td>
                  <td data-label={typeof reservation.check_in_time === 'string' ? 'Duración en horas' : 'Huéspedes'}>
                    <input type="number" min={1} value={typeof reservation.huespedes === 'number' ? reservation.huespedes : 1} disabled={typeof reservation.check_in_time === 'string'} onChange={(event) => updateReservation(reservation.id, { huespedes: Number(event.target.value) || 1 })} className="table-input" style={{ width: '4rem' }} />
                  </td>
                  <td data-label="Estado">
                    <select value={typeof reservation.estado === 'string' ? reservation.estado : ''} onChange={(event) => {
                      const nextStatus = event.target.value
                      if (nextStatus === 'cancelada' && reservation.estado !== 'cancelada') {
                        setReservationToCancel(reservation)
                        setCancellationError('')
                        return
                      }
                      void updateReservation(reservation.id, {
                        estado: nextStatus,
                        ...(nextStatus === 'completada' ? { active: true } : {}),
                      })
                    }} className="table-select">
                      <option value="pendiente">Pendiente</option><option value="confirmada">Confirmada</option><option value="completada">Completada</option><option value="cancelada">Cancelada</option>
                    </select>
                  </td>
                  <td data-label="Activo">
                    <input type="checkbox" checked={reservation.active !== false} disabled={reservation.estado === 'completada' || reservation.estado === 'cancelada'} onChange={(event) => updateReservation(reservation.id, { active: event.target.checked })} />
                  </td>
                  <td data-label="Acciones">
                    <button className="user-delete-button" onClick={() => deleteReservation(reservation.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
            aria-labelledby="admin-cancel-title"
          >
            <div className="admin-cancel-dialog__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M16 3v4M8 3v4M3 10h18M9 14l6 5M15 14l-6 5" />
              </svg>
            </div>
            <h3 id="admin-cancel-title">Cancelar reserva #{reservationToCancel.id}</h3>
            <p>Selecciona el motivo. El usuario lo verá en la notificación de cancelación.</p>
            <label htmlFor="admin-cancel-reason">Motivo de cancelación</label>
            <select
              id="admin-cancel-reason"
              value={cancellationReason}
              onChange={(event) => {
                setCancellationReason(event.target.value)
                setCancellationError('')
              }}
              disabled={savingCancellation}
            >
              <option value="">Selecciona un motivo</option>
              {cancellationReasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
            </select>
            {cancellationReason === 'Otro motivo' && (
              <textarea
                value={customCancellationReason}
                onChange={(event) => {
                  setCustomCancellationReason(event.target.value)
                  setCancellationError('')
                }}
                maxLength={500}
                placeholder="Escribe el motivo para el usuario"
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
    </section>
  )
}

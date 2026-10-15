import { useState } from 'react'
import type { AdminAuditLog, AdminBlock, AdminCoupon, AdminPlace } from './adminTypes'

interface Props {
  coupons: AdminCoupon[]
  blocks: AdminBlock[]
  auditLogs: AdminAuditLog[]
  places: AdminPlace[]
  createCoupon: (payload: { code: string; label: string; discount: number; maxUses: number | null; startsAt: string; endsAt: string }) => Promise<void>
  toggleCoupon: (id: number, active: boolean) => Promise<void>
  deleteCoupon: (id: number) => Promise<void>
  createBlock: (payload: { placeId: number; startsAt: string; endsAt: string; reason: string }) => Promise<void>
  deleteBlock: (id: number) => Promise<void>
}

const emptyCoupon = { code: '', label: '', discount: 10, maxUses: '', startsAt: '', endsAt: '' }
const emptyBlock = { placeId: '', startsAt: '', endsAt: '', reason: '' }
const dateOnly = (value: string) => value.slice(0, 10)
const actionLabel = (action: string) => ({ create: 'Creado', update: 'Actualizado', delete: 'Eliminado' }[action] || action)
const entityLabel = (entity: string) => ({ coupon: 'Cupón', place_block: 'Bloqueo de disponibilidad', place: 'Espacio', reservation: 'Reserva', user: 'Usuario' }[entity] || entity)
const auditDetail = (log: AdminAuditLog) => {
  const details = log.details || {}
  if (log.entity_type === 'coupon' && typeof details.active === 'boolean') return details.active ? 'Cupón activado' : 'Cupón desactivado'
  if (log.entity_type === 'coupon' && typeof details.code === 'string') return `Código ${details.code} creado`
  if (log.entity_type === 'place_block' && typeof details.placeId === 'number') return `Fechas bloqueadas para el espacio #${details.placeId}`
  return 'Sin detalles adicionales'
}

export default function AdminOperationsSection({ coupons, blocks, auditLogs, places, createCoupon, toggleCoupon, deleteCoupon, createBlock, deleteBlock }: Props) {
  const [couponForm, setCouponForm] = useState(emptyCoupon)
  const [blockForm, setBlockForm] = useState(emptyBlock)
  const [message, setMessage] = useState('')

  const submitCoupon = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      await createCoupon({ ...couponForm, code: couponForm.code.toUpperCase(), discount: Number(couponForm.discount), maxUses: couponForm.maxUses ? Number(couponForm.maxUses) : null })
      setCouponForm(emptyCoupon)
      setMessage('Cupón creado correctamente.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo crear el cupón.')
    }
  }

  const submitBlock = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      await createBlock({ ...blockForm, placeId: Number(blockForm.placeId) })
      setBlockForm(emptyBlock)
      setMessage('Disponibilidad bloqueada.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo crear el bloqueo.')
    }
  }

  return (
    <section className="admin-operations">
      <div className="admin-operation-grid">
        <article className="users-section">
          <div className="admin-section-heading"><div><h2>Cupones</h2><p className="admin-section-message">Crea promociones y controla su vigencia.</p></div></div>
          <form className="admin-form-grid" onSubmit={submitCoupon}>
            <input placeholder="Código" value={couponForm.code} onChange={(event) => setCouponForm({ ...couponForm, code: event.target.value })} required />
            <input placeholder="Descripción" value={couponForm.label} onChange={(event) => setCouponForm({ ...couponForm, label: event.target.value })} required />
            <input type="number" min="1" max="100" placeholder="Descuento %" value={couponForm.discount} onChange={(event) => setCouponForm({ ...couponForm, discount: Number(event.target.value) })} required />
            <input type="number" min="1" placeholder="Usos máximos" value={couponForm.maxUses} onChange={(event) => setCouponForm({ ...couponForm, maxUses: event.target.value })} />
            <label>Desde<input type="date" value={couponForm.startsAt} onChange={(event) => setCouponForm({ ...couponForm, startsAt: event.target.value })} /></label>
            <label>Hasta<input type="date" value={couponForm.endsAt} onChange={(event) => setCouponForm({ ...couponForm, endsAt: event.target.value })} /></label>
            <button className="btn btn-primary" type="submit">Crear cupón</button>
          </form>
          <div className="admin-mini-list">{coupons.map((coupon) => <div className="admin-mini-row" key={coupon.id}><div><strong>{coupon.code}</strong><span>{coupon.label} · {coupon.discount}% · {coupon.used_count}{coupon.max_uses ? `/${coupon.max_uses}` : ''} usos</span></div><div><button className="btn btn-secondary" onClick={() => toggleCoupon(coupon.id, !coupon.active)}>{coupon.active ? 'Desactivar' : 'Activar'}</button><button className="user-delete-button" onClick={() => deleteCoupon(coupon.id)}>Eliminar</button></div></div>)}</div>
        </article>

        <article className="users-section">
          <div className="admin-section-heading"><div><h2>Disponibilidad</h2><p className="admin-section-message">Bloquea fechas por mantenimiento o eventos.</p></div></div>
          <form className="admin-form-grid" onSubmit={submitBlock}>
            <select value={blockForm.placeId} onChange={(event) => setBlockForm({ ...blockForm, placeId: event.target.value })} required><option value="">Selecciona un espacio</option>{places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}</select>
            <label>Desde<input type="date" value={blockForm.startsAt} onChange={(event) => setBlockForm({ ...blockForm, startsAt: event.target.value })} required /></label>
            <label>Hasta<input type="date" value={blockForm.endsAt} onChange={(event) => setBlockForm({ ...blockForm, endsAt: event.target.value })} required /></label>
            <input placeholder="Motivo" value={blockForm.reason} onChange={(event) => setBlockForm({ ...blockForm, reason: event.target.value })} />
            <button className="btn btn-primary" type="submit">Bloquear fechas</button>
          </form>
          <div className="admin-mini-list">{blocks.map((block) => <div className="admin-mini-row" key={block.id}><div><strong>{block.place_name || `Lugar #${block.place_id}`}</strong><span>{dateOnly(block.starts_at)} a {dateOnly(block.ends_at)}{block.reason ? ` · ${block.reason}` : ''}</span></div><button className="user-delete-button" onClick={() => deleteBlock(block.id)}>Quitar</button></div>)}</div>
        </article>
      </div>

      <article className="users-section admin-audit-section"><div className="admin-section-heading"><div><h2>Actividad reciente</h2><p className="admin-section-message">Cambios realizados en el panel de administración.</p></div><span className="admin-audit-count">{auditLogs.length}</span></div><div className="users-table-wrapper"><table className="users-table"><thead><tr><th>Fecha</th><th>Administrador</th><th>Acción</th><th>Elemento</th><th>Detalle</th></tr></thead><tbody>{auditLogs.map((log) => <tr key={log.id}><td>{new Date(log.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</td><td>{log.admin_username || 'Administrador'}</td><td>{actionLabel(log.action)}</td><td>{entityLabel(log.entity_type)} #{log.entity_id || '-'}</td><td>{auditDetail(log)}</td></tr>)}</tbody></table></div></article>
      {message && <p className="admin-operation-message" role="status">{message}</p>}
    </section>
  )
}

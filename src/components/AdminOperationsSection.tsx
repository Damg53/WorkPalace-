import { useEffect, useState } from 'react'
import type { AdminAuditLog, AdminBlock, AdminCoupon, AdminPlace } from './adminTypes'
import { containsProfanity } from '../utils/contentValidation'
import { formatReadableDate, formatReadableTime } from '../utils/dateFormatting'
import { emptyTimeInput, to24HourTime } from '../utils/timeInput'
import TimeInput from './TimeInput'
import WorkPalaceSelect from './WorkPalaceSelect'
import './admin-gestion.css'

interface Props {
  coupons: AdminCoupon[]
  blocks: AdminBlock[]
  auditLogs: AdminAuditLog[]
  places: AdminPlace[]
  clearAuditLogs: () => void
  createCoupon: (payload: { code: string; label: string; discount: number; maxUses: number | null; startsAt: string; endsAt: string; endsAtTime: string }) => Promise<void>
  toggleCoupon: (id: number, active: boolean, validity?: { endsAt: string; endsAtTime: string }) => Promise<void>
  deleteCoupon: (id: number) => Promise<void>
  createBlock: (payload: { placeId: number; startsAt: string; startsAtTime: string; endsAt: string; endsAtTime: string; reason: string }) => Promise<void>
  deleteBlock: (id: number) => Promise<void>
  onFeedback: (message: string, isError?: boolean) => void
}

const emptyCoupon = { code: '', label: '', discount: 10, maxUses: '', startsAt: '', endsAt: '', endsAtTime: emptyTimeInput('PM') }
const emptyBlock = { placeId: '', startsAt: '', startsAtTime: emptyTimeInput(), endsAt: '', endsAtTime: emptyTimeInput('PM'), reason: '' }
const actionLabel = (action: string) => ({ create: 'Creado', update: 'Actualizado', delete: 'Eliminado', block: 'Bloqueado' }[action] || action)
const actionColor = (action: string) => ({ create: '#3ccf82', update: '#f0a951', delete: '#ff7a8a', block: '#3b73ff' }[action] || '#a6a3bd')
const entityLabel = (entity: string) => ({ coupon: 'Cupón', place_block: 'Bloqueo de disponibilidad', place: 'Espacio', reservation: 'Reserva', user: 'Usuario' }[entity] || entity)
const auditDetail = (log: AdminAuditLog) => {
  const details = log.details || {}
  if (log.entity_type === 'coupon' && typeof details.active === 'boolean') return details.active ? 'Cupón activado' : 'Cupón desactivado'
  if (log.entity_type === 'coupon' && typeof details.code === 'string') return `Código ${details.code} creado`
  if (log.entity_type === 'place_block' && typeof details.placeId === 'number') return `Fechas bloqueadas para el espacio #${details.placeId}`
  return 'Sin detalles adicionales'
}

export default function AdminOperationsSection({ coupons, blocks, auditLogs, places, clearAuditLogs, createCoupon, toggleCoupon, deleteCoupon, createBlock, deleteBlock, onFeedback }: Props) {
  const [couponForm, setCouponForm] = useState(emptyCoupon)
  const [reactivatingCouponId, setReactivatingCouponId] = useState<number | null>(null)
  const [couponValidity, setCouponValidity] = useState({ endsAt: '', endsAtTime: emptyTimeInput('PM') })
  const [blockForm, setBlockForm] = useState(emptyBlock)
  const [couponFeedback, setCouponFeedback] = useState<{ text: string; isError: boolean } | null>(null)
  const [blockError, setBlockError] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    if (!confirmClear) return
    const timer = window.setTimeout(() => setConfirmClear(false), 3500)
    return () => window.clearTimeout(timer)
  }, [confirmClear])

  const showMessage = (text: string, isError = false) => onFeedback(text, isError)
  const showCouponFeedback = (text: string, isError = true) => setCouponFeedback({ text, isError })

  const submitCoupon = async (event: React.FormEvent) => {
    event.preventDefault()
    setCouponFeedback(null)
    const code = couponForm.code.trim().toUpperCase()
    const label = couponForm.label.trim()
    const discount = Number(couponForm.discount)
    const maxUses = couponForm.maxUses.trim() ? Number(couponForm.maxUses) : null
    const endsAtTime = to24HourTime(couponForm.endsAtTime)

    if (!code) return showCouponFeedback('Escribe el código del cupón.')
    if (!/^[A-Z0-9_-]{3,50}$/.test(code)) {
      return showCouponFeedback('El código debe tener entre 3 y 50 caracteres y usar solo letras, números, guion o guion bajo.')
    }
    if (!label) return showCouponFeedback('Escribe la descripción del cupón.')
    if (containsProfanity(label)) return showCouponFeedback('La descripción no puede contener palabras ofensivas.')
    if (!Number.isInteger(discount) || discount < 1 || discount > 100) {
      return showCouponFeedback('El descuento debe ser un número entero entre 1 y 100.')
    }
    if (maxUses !== null && (!Number.isSafeInteger(maxUses) || maxUses < 1)) {
      return showCouponFeedback('Los usos máximos deben ser un número entero mayor que cero.')
    }
    if (couponForm.startsAt && couponForm.endsAt && couponForm.startsAt > couponForm.endsAt) {
      return showCouponFeedback('La fecha “Desde” no puede ser posterior a la fecha “Hasta”.')
    }
    if (couponForm.endsAtTime.time && !endsAtTime) {
      return showCouponFeedback('Completa una hora válida y selecciona AM o PM.')
    }
    if (endsAtTime && !couponForm.endsAt) {
      return showCouponFeedback('Selecciona la fecha “Hasta” para poder indicar la hora de vencimiento.')
    }
    if (couponForm.startsAt && couponForm.startsAt === couponForm.endsAt && endsAtTime === '00:00') {
      return showCouponFeedback('La hora de vencimiento debe ser posterior al inicio del día.')
    }

    try {
      await createCoupon({ ...couponForm, code, label, discount, maxUses, endsAtTime })
      setCouponForm(emptyCoupon)
      onFeedback('Cupón creado correctamente.')
    } catch (error) {
      onFeedback(error instanceof Error ? error.message : 'No se pudo crear el cupón.', true)
    }
  }

  const submitBlock = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!blockForm.placeId || !blockForm.startsAt || !blockForm.endsAt || blockForm.endsAt < blockForm.startsAt) {
      setBlockError('Selecciona un espacio y un rango de fechas válido.')
      return
    }
    if (!blockForm.reason.trim()) {
      setBlockError('El motivo del bloqueo es obligatorio.')
      return
    }
    if (containsProfanity(blockForm.reason)) {
      setBlockError('No se permiten palabras ofensivas en el motivo.')
      return
    }
    const startsAtTime = to24HourTime(blockForm.startsAtTime)
    const endsAtTime = to24HourTime(blockForm.endsAtTime)
    if (!startsAtTime || !endsAtTime) {
      setBlockError('Ingresa una hora válida de inicio y fin, incluyendo minutos y AM o PM.')
      return
    }
    if (blockForm.startsAt === blockForm.endsAt && endsAtTime <= startsAtTime) {
      setBlockError('La hora de fin debe ser posterior a la hora de inicio.')
      return
    }
    setBlockError('')
    try {
      await createBlock({ ...blockForm, startsAtTime, endsAtTime, placeId: Number(blockForm.placeId) })
      setBlockForm(emptyBlock)
      showMessage('Disponibilidad bloqueada.')
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'No se pudo crear el bloqueo.', true)
    }
  }

  const submitCouponReactivation = async (event: React.FormEvent, couponId: number) => {
    event.preventDefault()
    try {
      await toggleCoupon(couponId, true, { ...couponValidity, endsAtTime: to24HourTime(couponValidity.endsAtTime) })
      setReactivatingCouponId(null)
      setCouponValidity({ endsAt: '', endsAtTime: emptyTimeInput('PM') })
      showMessage('Cupón activado con la nueva vigencia.')
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'No se pudo activar el cupón.', true)
    }
  }

  const deactivateCoupon = async (couponId: number) => {
    try {
      await toggleCoupon(couponId, false)
      showMessage('Cupón desactivado correctamente.')
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'No se pudo desactivar el cupón.', true)
    }
  }

  const previewStart = couponForm.startsAt ? formatReadableDate(couponForm.startsAt) : ''
  const previewEnd = couponForm.endsAt ? formatReadableDate(couponForm.endsAt) : ''
  const previewTime24 = to24HourTime(couponForm.endsAtTime)
  const previewTime = couponForm.endsAtTime.time && previewTime24 ? formatReadableTime(previewTime24) : ''
  const previewValidity = previewStart || previewEnd
    ? `${previewStart ? `Del ${previewStart}` : 'Desde hoy'}${previewEnd ? ` al ${previewEnd}` : ''}${previewTime ? ` · vence ${previewTime}` : ''}`
    : 'Sin fecha límite'
  const blockStartTime = to24HourTime(blockForm.startsAtTime)
  const blockEndTime = to24HourTime(blockForm.endsAtTime)
  const blockStart = blockForm.startsAt && blockStartTime ? `${blockForm.startsAt}T${blockStartTime}` : ''
  const blockEnd = blockForm.endsAt && blockEndTime ? `${blockForm.endsAt}T${blockEndTime}` : ''
  const blockPreviewPlace = places.find((place) => String(place.id) === blockForm.placeId)?.name
  const showBlockPreview = Boolean(blockForm.placeId && blockStart && blockEnd && blockEnd > blockStart)

  return (
    <section className="admin-operations pg-operations">
      <div className="admin-operation-grid pg-grid">
        <article className="users-section pg-coupon">
          <header className="pg-head">
            <div className="pg-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M3 12.5V4h8.5L21 13.5 13.5 21z" /><circle cx="7.5" cy="8.5" r="1.2" /></svg>
            </div>
            <div><h2>Cupones</h2><p>Crea promociones y controla su vigencia.</p></div>
          </header>

          <div className="pg-ticket" aria-label="Vista previa del cupón">
            <div>
              <small>Vista previa</small>
              <strong className={couponForm.code.trim() ? '' : 'vacio'}>{couponForm.code.trim() ? couponForm.code.trim().toUpperCase() : 'TU CÓDIGO'}</strong>
              <em>{previewValidity} · {couponForm.maxUses.trim() ? `${couponForm.maxUses} usos máx.` : 'Usos ilimitados'}</em>
            </div>
            <div><b>{Number(couponForm.discount) || 0}%</b><small>de descuento</small></div>
          </div>

          <form className="pg-form" onSubmit={submitCoupon} noValidate>
            <div className="pg-f">
              <label htmlFor="admin-coupon-code">Código <i>*</i></label>
              <input id="admin-coupon-code" placeholder="VERANO25" value={couponForm.code} onChange={(event) => { setCouponFeedback(null); setCouponForm({ ...couponForm, code: event.target.value }) }} />
            </div>
            <div className="pg-f">
              <label htmlFor="admin-coupon-description">Descripción</label>
              <input id="admin-coupon-description" placeholder="Qué incluye la promoción" value={couponForm.label} onChange={(event) => { setCouponFeedback(null); setCouponForm({ ...couponForm, label: event.target.value }) }} />
            </div>
            <div className="pg-f">
              <label htmlFor="admin-coupon-discount">Descuento (%) <i>*</i></label>
              <input id="admin-coupon-discount" type="number" min="1" max="100" value={couponForm.discount} onChange={(event) => { setCouponFeedback(null); setCouponForm({ ...couponForm, discount: Number(event.target.value) }) }} />
            </div>
            <div className="pg-f">
              <label htmlFor="admin-coupon-uses">Usos máximos</label>
              <input id="admin-coupon-uses" type="number" min="1" placeholder="Sin límite" value={couponForm.maxUses} onChange={(event) => { setCouponFeedback(null); setCouponForm({ ...couponForm, maxUses: event.target.value }) }} />
            </div>
            <div className="pg-f">
              <label htmlFor="admin-coupon-start">Desde</label>
              <input id="admin-coupon-start" type="date" value={couponForm.startsAt} max={couponForm.endsAt || undefined} onChange={(event) => { setCouponFeedback(null); setCouponForm({ ...couponForm, startsAt: event.target.value }) }} />
            </div>
            <div className="pg-f">
              <label htmlFor="admin-coupon-end">Hasta</label>
              <input id="admin-coupon-end" type="date" value={couponForm.endsAt} min={couponForm.startsAt || undefined} onChange={(event) => { setCouponFeedback(null); setCouponForm({ ...couponForm, endsAt: event.target.value, endsAtTime: event.target.value ? couponForm.endsAtTime : emptyTimeInput('PM') }) }} />
            </div>
            <div className="pg-f pg-full">
              <label>Hora de vencimiento (Colombia)</label>
              <TimeInput className="pg-hora admin-coupon-time" value={couponForm.endsAtTime} onChange={(endsAtTime) => { setCouponFeedback(null); setCouponForm({ ...couponForm, endsAtTime }) }} disabled={!couponForm.endsAt} placeholder="11:30" />
              <small>Ejemplo: 11:30 p. m. Si queda vacía, vence al final del día.</small>
            </div>
            <div className="pg-f pg-submit">
              <button className="pg-btn pg-btn--solid" type="submit">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                Crear cupón
              </button>
            </div>
            {couponFeedback && <p className="pg-msg" data-t={couponFeedback.isError ? 'error' : 'ok'} role={couponFeedback.isError ? 'alert' : 'status'}>{couponFeedback.text}</p>}
          </form>

          <details className="pg-coupon-list">
            <summary>
              <span>Cupones existentes</span>
              <b>{coupons.length}</b>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </summary>
            <div className="admin-mini-list">
              {coupons.length === 0 ? <p className="pg-empty">Aún no hay cupones creados.</p> : coupons.map((coupon) => (
                <div className="admin-coupon-entry" key={coupon.id}>
                  <div className="admin-mini-row">
                    <div>
                      <strong>{coupon.code} · {coupon.active ? 'Activo' : 'Inactivo'}</strong>
                      <span>{coupon.label} · {coupon.discount}% · {coupon.used_count}{coupon.max_uses ? `/${coupon.max_uses}` : ''} usos</span>
                      <span>{coupon.ends_at ? `Vence ${formatReadableDate(coupon.ends_at)}${coupon.ends_at_time ? ` a las ${formatReadableTime(coupon.ends_at_time)}` : ' al final del día'}` : 'Sin vencimiento'}</span>
                    </div>
                    <div>
                      {coupon.active
                        ? <button type="button" className="btn btn-secondary" onClick={() => void deactivateCoupon(coupon.id)}>Desactivar</button>
                        : <button className="btn btn-secondary" onClick={() => { setReactivatingCouponId(coupon.id); setCouponValidity({ endsAt: '', endsAtTime: emptyTimeInput('PM') }) }}>Activar</button>}
                      <button type="button" className="place-action-button place-action-button--delete" onClick={() => deleteCoupon(coupon.id)}>Eliminar</button>
                    </div>
                  </div>
                  {reactivatingCouponId === coupon.id && <form className="admin-form-grid admin-coupon-reactivation" onSubmit={(event) => void submitCouponReactivation(event, coupon.id)}>
                    <label>Nueva fecha de vencimiento<input type="date" value={couponValidity.endsAt} onChange={(event) => setCouponValidity({ ...couponValidity, endsAt: event.target.value })} required /></label>
                    <label>Hora de vencimiento (Colombia)<TimeInput className="admin-coupon-time" value={couponValidity.endsAtTime} onChange={(endsAtTime) => setCouponValidity({ ...couponValidity, endsAtTime })} required placeholder="11:30" /><small>Ejemplo: 11:30 p. m.</small></label>
                    <button className="btn btn-primary" type="submit">Guardar y activar</button>
                    <button className="btn btn-secondary" type="button" onClick={() => setReactivatingCouponId(null)}>Cancelar</button>
                  </form>}
                </div>
              ))}
            </div>
          </details>
        </article>

        <article className="users-section pg-card pg-availability">
          <header className="pg-head">
            <div className="pg-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>
            </div>
            <div><h2>Disponibilidad</h2><p>Bloquea horarios por mantenimiento o eventos.</p></div>
          </header>
          <form className="pg-form" onSubmit={submitBlock} noValidate>
            <div className="pg-f pg-full">
              <label>Espacio <i>*</i></label>
              <WorkPalaceSelect className="pg-space-select" value={blockForm.placeId} onChange={(value) => { setBlockError(''); setBlockForm({ ...blockForm, placeId: value }) }} required ariaLabel="Espacio para bloquear" options={[{ value: '', label: 'Selecciona un espacio' }, ...places.map((place) => ({ value: String(place.id), label: place.name }))]} />
            </div>
            <div className="pg-f">
              <label htmlFor="block-start-date">Fecha de inicio <i>*</i></label>
              <input id="block-start-date" type="date" value={blockForm.startsAt} max={blockForm.endsAt || undefined} onChange={(event) => { setBlockError(''); setBlockForm({ ...blockForm, startsAt: event.target.value }) }} required />
            </div>
            <div className="pg-f">
              <label>Hora de inicio <i>*</i></label>
              <TimeInput className="pg-hora" value={blockForm.startsAtTime} onChange={(startsAtTime) => { setBlockError(''); setBlockForm({ ...blockForm, startsAtTime }) }} required placeholder="09:30" />
              <small>Ejemplo: 09:30 a. m.</small>
            </div>
            <div className="pg-f">
              <label htmlFor="block-end-date">Fecha de fin <i>*</i></label>
              <input id="block-end-date" type="date" value={blockForm.endsAt} min={blockForm.startsAt || undefined} onChange={(event) => { setBlockError(''); setBlockForm({ ...blockForm, endsAt: event.target.value }) }} required />
            </div>
            <div className="pg-f">
              <label>Hora de fin <i>*</i></label>
              <TimeInput className="pg-hora" value={blockForm.endsAtTime} onChange={(endsAtTime) => { setBlockError(''); setBlockForm({ ...blockForm, endsAtTime }) }} required placeholder="05:30" />
              <small>Ejemplo: 05:30 p. m.</small>
            </div>
            <div className="pg-f pg-full">
              <label htmlFor="block-reason">Motivo <i>*</i></label>
              <input id="block-reason" placeholder="Mantenimiento, evento privado..." value={blockForm.reason} onChange={(event) => { setBlockError(''); setBlockForm({ ...blockForm, reason: event.target.value }) }} maxLength={500} required />
            </div>
            {showBlockPreview && (
              <p className="pg-sum">
                Se bloqueará <b>{blockPreviewPlace || 'el espacio'}</b> del <b>{formatReadableDate(blockForm.startsAt)}, {formatReadableTime(blockStartTime || '')}</b> al <b>{formatReadableDate(blockForm.endsAt)}, {formatReadableTime(blockEndTime || '')}</b>.
              </p>
            )}
            <button className="pg-btn pg-btn--solid pg-full" type="submit">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>
              Bloquear horario
            </button>
            {blockError && <p className="pg-msg" data-t="error" role="alert">{blockError}</p>}
          </form>
          <details className="pg-block-list">
            <summary>
              <span>Bloqueos activos</span>
              <b>{blocks.length}</b>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </summary>
            <div className="pg-records">
              {blocks.length === 0 ? <p className="pg-empty">No hay horarios bloqueados.</p> : blocks.map((block) => (
                <div className="pg-record" key={block.id}>
                  <div className="pg-record-main">
                    <div className="pg-record-title"><strong>{block.place_name || `Lugar #${block.place_id}`}</strong></div>
                    <p>{formatReadableDate(block.starts_at)} · {block.starts_at_time ? formatReadableTime(block.starts_at_time) : '12:00 a. m.'} — {formatReadableDate(block.ends_at)} · {block.ends_at_time ? formatReadableTime(block.ends_at_time) : '11:59 p. m.'}</p>
                    {block.reason && <small>{block.reason}</small>}
                  </div>
                  <button type="button" className="pg-btn pg-btn--danger" onClick={() => deleteBlock(block.id)}>Quitar</button>
                </div>
              ))}
            </div>
          </details>
        </article>
      </div>

      <article className="users-section pg-card pg-activity">
        <header className="pg-head">
          <div className="pg-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></svg>
          </div>
          <div><h2>Actividad reciente</h2><p>Cambios realizados en el panel de administración.</p></div>
          <aside>
            <span className="pg-count">{auditLogs.length}</span>
            <button type="button" className={`pg-btn pg-btn--danger${confirmClear ? ' on' : ''}`} onClick={() => {
              if (confirmClear) {
                clearAuditLogs()
                setConfirmClear(false)
              } else {
                setConfirmClear(true)
              }
            }} disabled={auditLogs.length === 0}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8.5 0 1 13h9l1-13" /></svg>
              {confirmClear ? 'Confirmar' : 'Limpiar actividad'}
            </button>
          </aside>
        </header>
        {auditLogs.length > 0 ? (
          <div className="pg-table-wrap" role="region" aria-label="Tabla de actividad reciente" tabIndex={0}>
            <table className="pg-table">
              <thead><tr><th>Fecha</th><th>Administrador</th><th>Acción</th><th>Elemento</th><th>Detalle</th></tr></thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td data-label="Fecha">{new Date(log.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td data-label="Administrador"><span className="pg-who"><i>{(log.admin_username || 'Administrador').slice(0, 1).toUpperCase()}</i>{log.admin_username || 'Administrador'}</span></td>
                    <td data-label="Acción"><span className="pg-act" style={{ '--c': actionColor(log.action) } as React.CSSProperties}>{actionLabel(log.action)}</span></td>
                    <td data-label="Elemento">{entityLabel(log.entity_type)} #{log.entity_id || '-'}</td>
                    <td data-label="Detalle">{auditDetail(log)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="pg-vacio">Aún no hay actividad. Los cambios del panel aparecerán aquí.</p>
        )}
      </article>
    </section>
  )
}

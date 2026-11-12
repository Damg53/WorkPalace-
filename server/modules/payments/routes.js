import { Router } from 'express';
import pool from '../../db.js';
import { normalizeText } from '../../shared/validation.js';
import { logAdminAction, requireAdmin } from '../../middleware/admin.js';
import { findCoupon } from './service.js';

const router = Router();

const isValidDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const isValidTime = (value) => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const dateOnly = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : typeof value === 'string' ? value.slice(0, 10) : null;

router.get('/api/admin/coupons', requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, code, label, discount, max_uses, used_count,
              TO_CHAR(starts_at, 'YYYY-MM-DD') AS starts_at,
              TO_CHAR(ends_at, 'YYYY-MM-DD') AS ends_at,
              TO_CHAR(ends_at_time, 'HH24:MI') AS ends_at_time, active, created_at
       FROM coupons ORDER BY created_at DESC, id DESC`
    );
    res.json({ coupons: result.rows });
  } catch (error) {
    console.error('Error obteniendo cupones:', error);
    res.status(500).json({ error: 'No se pudieron cargar los cupones' });
  }
});

router.post('/api/admin/coupons', requireAdmin, async (req, res) => {
  try {
    const code = String(req.body?.code || '').trim().toUpperCase();
    const label = normalizeText(req.body?.label || '');
    const discount = Number(req.body?.discount);
    const maxUses = req.body?.maxUses === '' || req.body?.maxUses == null ? null : Number(req.body.maxUses);
    const startsAt = req.body?.startsAt == null || req.body.startsAt === '' ? null : req.body.startsAt;
    const endsAt = req.body?.endsAt == null || req.body.endsAt === '' ? null : req.body.endsAt;
    const endsAtTime = req.body?.endsAtTime == null || req.body.endsAtTime === '' ? null : req.body.endsAtTime;
    if (!/^[A-Z0-9_-]{3,50}$/.test(code) || !label || !Number.isInteger(discount) || discount < 1 || discount > 100) {
      return res.status(400).json({ error: 'Código, descripción y descuento válido son requeridos' });
    }
    if ((startsAt !== null && !isValidDate(startsAt)) || (endsAt !== null && !isValidDate(endsAt)) ||
        (startsAt && endsAt && startsAt > endsAt)) {
      return res.status(400).json({ error: 'El rango de fechas del cupón no es válido.' });
    }
    if (endsAtTime !== null && (!endsAt || !isValidTime(endsAtTime))) {
      return res.status(400).json({ error: 'La hora de vencimiento debe ser válida y requiere una fecha de vencimiento.' });
    }
    if (startsAt && startsAt === endsAt && endsAtTime === '00:00') {
      return res.status(400).json({ error: 'La hora de vencimiento debe ser posterior al inicio del cupón.' });
    }
    const result = await pool.query(
      `INSERT INTO coupons (code, label, discount, max_uses, starts_at, ends_at, ends_at_time, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
       RETURNING id, code, label, discount, max_uses, used_count,
                 TO_CHAR(starts_at, 'YYYY-MM-DD') AS starts_at,
                 TO_CHAR(ends_at, 'YYYY-MM-DD') AS ends_at,
                 TO_CHAR(ends_at_time, 'HH24:MI') AS ends_at_time, active, created_at`,
      [code, label, discount, Number.isInteger(maxUses) && maxUses > 0 ? maxUses : null, startsAt, endsAt, endsAtTime]
    );
    await logAdminAction(req, 'create', 'coupon', result.rows[0].id, { code });
    res.status(201).json({ coupon: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Ese código de cupón ya existe' });
    console.error('Error creando cupón:', error);
    res.status(500).json({ error: 'No se pudo crear el cupón' });
  }
});

router.put('/api/admin/coupons/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const hasEndTime = Object.hasOwn(req.body || {}, 'endsAtTime');
    const rawEndTime = req.body?.endsAtTime;
    const endsAtTime = typeof rawEndTime === 'string' && rawEndTime ? rawEndTime : null;
    const hasStartDate = Object.hasOwn(req.body || {}, 'startsAt');
    const hasEndDate = Object.hasOwn(req.body || {}, 'endsAt');
    const startDate = req.body?.startsAt == null || req.body.startsAt === '' ? null : req.body.startsAt;
    const endDate = req.body?.endsAt == null || req.body.endsAt === '' ? null : req.body.endsAt;
    if ((hasStartDate && startDate !== null && !isValidDate(startDate)) ||
        (hasEndDate && endDate !== null && !isValidDate(endDate)) ||
        (hasStartDate && hasEndDate && startDate && endDate && startDate > endDate)) {
      return res.status(400).json({ error: 'El rango de fechas del cupón no es válido.' });
    }
    if (hasEndTime && rawEndTime != null && rawEndTime !== '' && !isValidTime(rawEndTime)) {
      return res.status(400).json({ error: 'La hora de vencimiento no es válida.' });
    }
    const currentResult = await pool.query(
      `SELECT TO_CHAR(starts_at, 'YYYY-MM-DD') AS starts_at,
              TO_CHAR(ends_at, 'YYYY-MM-DD') AS ends_at, ends_at_time
       FROM coupons WHERE id = $1`,
      [id]
    );
    if (!currentResult.rows.length) return res.status(404).json({ error: 'Cupón no encontrado' });
    const current = currentResult.rows[0];
    const nextStartDate = hasStartDate ? startDate : dateOnly(current.starts_at);
    const nextEndDate = hasEndDate ? endDate : dateOnly(current.ends_at);
    const currentEndTime = current.ends_at_time ? String(current.ends_at_time).slice(0, 5) : null;
    const nextEndTime = hasEndTime ? endsAtTime : currentEndTime;
    if ((nextStartDate && nextEndDate && nextStartDate > nextEndDate) ||
        (nextEndTime && !nextEndDate) ||
        (nextStartDate && nextStartDate === nextEndDate && nextEndTime === '00:00')) {
      return res.status(400).json({ error: 'El rango de fechas y hora del cupón no es válido.' });
    }
    const shouldUpdateEndTime = hasEndTime || (hasEndDate && !endDate);
    const result = await pool.query(
      `UPDATE coupons SET label = COALESCE($1, label), discount = COALESCE($2, discount),
       max_uses = CASE WHEN $8 THEN $3 ELSE max_uses END,
       starts_at = CASE WHEN $9 THEN $4 ELSE starts_at END,
       ends_at = CASE WHEN $10 THEN $5 ELSE ends_at END,
       ends_at_time = CASE WHEN $12 THEN $11 ELSE ends_at_time END,
       active = COALESCE($6, active), updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
       RETURNING id, code, label, discount, max_uses, used_count,
                 TO_CHAR(starts_at, 'YYYY-MM-DD') AS starts_at,
                 TO_CHAR(ends_at, 'YYYY-MM-DD') AS ends_at,
                 TO_CHAR(ends_at_time, 'HH24:MI') AS ends_at_time, active, created_at`,
      [req.body?.label || null, Number.isInteger(req.body?.discount) ? req.body.discount : null,
        req.body?.maxUses === '' ? null : (req.body?.maxUses ?? null), req.body?.startsAt || null, req.body?.endsAt || null,
        typeof req.body?.active === 'boolean' ? req.body.active : null, id,
        Object.hasOwn(req.body || {}, 'maxUses'),
        Object.hasOwn(req.body || {}, 'startsAt'),
        Object.hasOwn(req.body || {}, 'endsAt'),
        shouldUpdateEndTime ? endsAtTime : currentEndTime,
        shouldUpdateEndTime]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Cupón no encontrado' });
    await logAdminAction(req, 'update', 'coupon', id, req.body);
    res.json({ coupon: result.rows[0] });
  } catch (error) {
    console.error('Error actualizando cupón:', error);
    res.status(500).json({ error: 'No se pudo actualizar el cupón' });
  }
});

router.delete('/api/admin/coupons/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const result = await pool.query('DELETE FROM coupons WHERE id = $1 RETURNING id, code', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Cupón no encontrado' });
    await logAdminAction(req, 'delete', 'coupon', id, result.rows[0]);
    res.status(204).send();
  } catch (error) {
    console.error('Error eliminando cupón:', error);
    res.status(500).json({ error: 'No se pudo eliminar el cupón' });
  }
});

router.post('/api/coupons/validate', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    const uid = Number.parseInt(userId || '', 10);
    const couponCode = typeof req.body?.couponCode === 'string'
      ? req.body.couponCode.trim().toUpperCase()
      : '';

    if (!userId || Number.isNaN(uid)) {
      return res.status(400).json({ error: 'Usuario no identificado.' });
    }
    const coupon = await findCoupon(couponCode);
    if (!coupon) {
      return res.status(400).json({ error: 'El cupón no es válido.' });
    }

    const previousUse = await pool.query(
      'SELECT 1 FROM reservations WHERE user_id = $1 AND coupon_code = $2 LIMIT 1',
      [uid, couponCode]
    );
    if (previousUse.rows.length > 0) {
      return res.status(409).json({ error: 'Ya utilizaste este cupón en otra compra.' });
    }

    return res.json({ valid: true, coupon: { code: coupon.code, discount: coupon.discount, label: coupon.label || '' } });
  } catch (error) {
    console.error('Error validando cupón:', error);
    return res.status(500).json({ error: 'No se pudo validar el cupón.' });
  }
});

export default router;

import { Router } from 'express';
import pool from '../../db.js';
import { normalizeText } from '../../shared/validation.js';
import { logAdminAction, requireAdmin } from '../../middleware/admin.js';
import { findCoupon } from './service.js';

const router = Router();

router.get('/api/admin/coupons', requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, code, label, discount, max_uses, used_count, starts_at, ends_at, active, created_at
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
    if (!/^[A-Z0-9_-]{3,50}$/.test(code) || !label || !Number.isInteger(discount) || discount < 1 || discount > 100) {
      return res.status(400).json({ error: 'Código, descripción y descuento válido son requeridos' });
    }
    const result = await pool.query(
      `INSERT INTO coupons (code, label, discount, max_uses, starts_at, ends_at, active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING id, code, label, discount, max_uses, used_count, starts_at, ends_at, active, created_at`,
      [code, label, discount, Number.isInteger(maxUses) && maxUses > 0 ? maxUses : null, req.body.startsAt || null, req.body.endsAt || null]
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
    const result = await pool.query(
      `UPDATE coupons SET label = COALESCE($1, label), discount = COALESCE($2, discount),
       max_uses = $3, starts_at = $4, ends_at = $5, active = COALESCE($6, active), updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
       RETURNING id, code, label, discount, max_uses, used_count, starts_at, ends_at, active, created_at`,
      [req.body?.label || null, Number.isInteger(req.body?.discount) ? req.body.discount : null,
        req.body?.maxUses === '' ? null : (req.body?.maxUses ?? null), req.body?.startsAt || null, req.body?.endsAt || null,
        typeof req.body?.active === 'boolean' ? req.body.active : null, id]
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

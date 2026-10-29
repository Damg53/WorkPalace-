import { Router } from 'express';
import pool from '../../db.js';
import { requireAdmin } from '../../middleware/admin.js';
import { syncPlaceReservationState } from '../availability/service.js';
import { findCoupon, isValidCardExpiry } from '../payments/service.js';

const router = Router();

router.get('/api/reservations', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(400).json({ error: 'Se requiere el header x-user-id' });
    }
    const uid = parseInt(userId, 10);
    if (isNaN(uid)) {
      return res.status(400).json({ error: 'x-user-id inválido' });
    }
    const result = await pool.query(
      `SELECT id, user_id, hotel, tipo_alojamiento, ubicacion, check_in, check_out, huespedes, estado, coupon_code, created_at
       FROM reservations
       WHERE user_id = $1
       ORDER BY check_in DESC`,
      [uid]
    );
    res.json({ reservations: result.rows });
  } catch (error) {
    console.error('Error obteniendo reservas:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.post('/api/reservations', async (req, res) => {
  let client;
  let inTransaction = false;
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(400).json({ error: 'Se requiere el header x-user-id' });
    }
    const uid = parseInt(userId, 10);
    if (isNaN(uid)) {
      return res.status(400).json({ error: 'x-user-id inválido' });
    }

    const { placeId, checkIn, checkOut, huespedes, payment } = req.body || {};
    const couponCode = typeof req.body?.couponCode === 'string'
      ? req.body.couponCode.trim().toUpperCase()
      : null;
    if (!placeId || !checkIn || !checkOut) {
      return res.status(400).json({ error: 'placeId, checkIn y checkOut son requeridos' });
    }
    if (payment?.method === 'card' && !isValidCardExpiry(payment.exp)) {
      return res.status(400).json({ error: 'La tarjeta está vencida o la fecha no es válida.' });
    }

    if (couponCode) {
      const coupon = await findCoupon(couponCode);
      if (!coupon) {
        return res.status(400).json({ error: 'El cupón no es válido.' });
      }
    }

    if (couponCode) {
      const previousUse = await pool.query('SELECT 1 FROM reservations WHERE user_id = $1 AND coupon_code = $2 LIMIT 1', [uid, couponCode]);
      if (previousUse.rows.length > 0) return res.status(409).json({ error: 'Ya utilizaste este cupón en otra compra.' });
    }

    const pid = parseInt(placeId, 10);
    if (isNaN(pid)) return res.status(400).json({ error: 'placeId inválido' });

    client = await pool.connect();
    await client.query('BEGIN');
    inTransaction = true;

    const placeResult = await client.query(
      `SELECT id, name, tipo, barrio, ciudad, active FROM places WHERE id = $1 FOR UPDATE`,
      [pid]
    );
    if (placeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      inTransaction = false;
      return res.status(404).json({ error: 'Espacio no encontrado' });
    }
    if (placeResult.rows[0].active === false) {
      await client.query('ROLLBACK');
      inTransaction = false;
      return res.status(409).json({ error: 'El espacio no está disponible para las fechas seleccionadas.' });
    }
    const place = placeResult.rows[0];

    const existingReservation = await client.query(
      `SELECT id FROM reservations
       WHERE place_id = $1 AND active = TRUE AND estado IN ('pendiente', 'confirmada')
         AND check_out >= $2::date AND check_in <= $3::date
       LIMIT 1`,
      [pid, checkIn, checkOut]
    );
    if (existingReservation.rows.length > 0) {
      await client.query('ROLLBACK');
      inTransaction = false;
      return res.status(409).json({ error: 'El espacio no está disponible para las fechas seleccionadas.' });
    }

    const blocked = await client.query(
      `SELECT id FROM place_blocks WHERE place_id = $1 AND starts_at <= $3::date AND ends_at >= $2::date LIMIT 1`,
      [pid, checkIn, checkOut]
    );
    if (blocked.rows.length > 0) {
      await client.query('ROLLBACK');
      inTransaction = false;
      return res.status(409).json({ error: 'El espacio no está disponible para las fechas seleccionadas.' });
    }

    const ubicacionParts = [];
    if (place.barrio) ubicacionParts.push(place.barrio);
    if (place.ciudad) ubicacionParts.push(place.ciudad);
    const ubicacion = ubicacionParts.join(', ');

    const insert = await client.query(
      `INSERT INTO reservations (user_id, hotel, tipo_alojamiento, ubicacion, check_in, check_out, huespedes, estado, place_id, coupon_code)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 1), 'pendiente', $8, $9)
       RETURNING id, user_id, hotel, tipo_alojamiento, ubicacion, check_in, check_out, huespedes, estado, place_id, coupon_code, created_at`,
      [uid, place.name, place.tipo, ubicacion, checkIn, checkOut, huespedes || 1, pid, couponCode]
    );

    if (couponCode) await client.query('UPDATE coupons SET used_count = used_count + 1, updated_at = CURRENT_TIMESTAMP WHERE code = $1', [couponCode]);
    await client.query('COMMIT');
    inTransaction = false;

    res.status(201).json({ reservation: insert.rows[0] });
  } catch (error) {
    if (client && inTransaction) await client.query('ROLLBACK');
    if (error.code === '23505' && error.constraint === 'idx_reservations_user_coupon') {
      return res.status(409).json({ error: 'Ya utilizaste este cupón en otra compra.' });
    }
    console.error('Error creando reserva:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  } finally {
    if (client) client.release();
  }
});

router.get('/api/admin/reservations', requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id,
              r.user_id,
              u.username,
              u.email,
              r.hotel,
              r.tipo_alojamiento,
              r.ubicacion,
              r.check_in,
              r.check_out,
              r.huespedes,
              r.estado,
              r.active,
              r.created_at
       FROM reservations r
       LEFT JOIN users u ON u.id = r.user_id
       ORDER BY r.check_in DESC, r.id DESC`
    );
    res.json({ reservations: result.rows });
  } catch (error) {
    console.error('Error obteniendo reservas (admin):', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.put('/api/admin/reservations/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { checkIn, checkOut, huespedes, estado, active } = req.body || {};
    const rid = parseInt(id, 10);
    if (isNaN(rid)) {
      return res.status(400).json({ error: 'ID de reserva inválido' });
    }

    const result = await pool.query(
      `UPDATE reservations SET
         check_in = COALESCE($1, check_in),
         check_out = COALESCE($2, check_out),
         huespedes = COALESCE($3, huespedes),
         estado = COALESCE($4, estado),
         active = COALESCE($5, active)
       WHERE id = $6
      RETURNING id, user_id, hotel, tipo_alojamiento, ubicacion, check_in, check_out, huespedes, estado, active, place_id, created_at`,
      [
        checkIn || null,
        checkOut || null,
        typeof huespedes === 'number' ? huespedes : null,
        estado || null,
        active === undefined ? null : !!active,
        rid,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }
    if (['completada', 'cancelada'].includes(result.rows[0].estado)) {
      await pool.query(
        'UPDATE places SET active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [result.rows[0].place_id]
      );
    } else {
      await syncPlaceReservationState(result.rows[0].place_id);
    }
    res.json({ reservation: result.rows[0] });
  } catch (error) {
    console.error('Error actualizando reserva (admin):', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.delete('/api/admin/reservations/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const rid = parseInt(id, 10);
    if (isNaN(rid)) {
      return res.status(400).json({ error: 'ID de reserva inválido' });
    }
    const result = await pool.query('DELETE FROM reservations WHERE id = $1 RETURNING id, place_id', [rid]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }
    await syncPlaceReservationState(result.rows[0].place_id);
    res.status(204).send();
  } catch (error) {
    console.error('Error eliminando reserva (admin):', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.delete('/api/reservations/:id', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(400).json({ error: 'Se requiere el header x-user-id' });
    }
    const uid = parseInt(userId, 10);
    if (isNaN(uid)) {
      return res.status(400).json({ error: 'x-user-id inválido' });
    }

    const { id } = req.params;
    const rid = parseInt(id, 10);
    if (isNaN(rid)) {
      return res.status(400).json({ error: 'ID de reserva inválido' });
    }

    // Verificar que la reservación pertenece al usuario
    const reserva = await pool.query(
      'SELECT id, user_id, place_id FROM reservations WHERE id = $1',
      [rid]
    );
    if (reserva.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    const reservationData = reserva.rows[0];
    if (reservationData.user_id !== uid) {
      return res.status(403).json({ error: 'No tienes permiso para cancelar esta reserva' });
    }

    // Actualizar estado a cancelada
    const updated = await pool.query(
      'UPDATE reservations SET estado = $1 WHERE id = $2 RETURNING id, user_id, hotel, tipo_alojamiento, ubicacion, check_in, check_out, huespedes, estado, created_at',
      ['cancelada', rid]
    );

    // Reactivar el lugar si existe
    await syncPlaceReservationState(reservationData.place_id);

    res.json({ reservation: updated.rows[0], message: '✅ Reserva cancelada exitosamente' });
  } catch (error) {
    console.error('Error cancelando reserva:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

export default router;

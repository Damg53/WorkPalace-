import { Router } from 'express';
import pool from '../../db.js';
import { requireOwner } from '../../middleware/admin.js';
import { syncPlaceReservationState } from '../availability/service.js';
import { hasProfanityInFields, isValidCapacity, parseNonNegativeInteger } from '../../shared/validation.js';

const router = Router();

router.get('/api/owner/places', requireOwner, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, tipo, direccion, barrio, ciudad, capacidad, precio_hora, modalidad,
              caracteristicas, nivel_ruido, image_url, owner_active AS active, created_at
       FROM places WHERE owner_id = $1 ORDER BY id DESC`,
      [req.ownerUserId]
    );
    res.json({ places: result.rows });
  } catch (error) {
    console.error('Error obteniendo espacios del propietario:', error);
    res.status(500).json({ error: 'No se pudieron cargar tus espacios.' });
  }
});

router.post('/api/owner/places', requireOwner, async (req, res) => {
  try {
    const payload = req.body || {};
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    const tipo = typeof payload.tipo === 'string' ? payload.tipo.trim() : '';
    const price = payload.precio_hora == null || payload.precio_hora === ''
      ? null
      : parseNonNegativeInteger(payload.precio_hora);
    if (!name || !tipo) return res.status(400).json({ error: 'El nombre y el tipo de espacio son obligatorios.' });
    if (name.length > 255 || tipo.length > 100) return res.status(400).json({ error: 'El nombre o tipo del espacio es demasiado largo.' });
    if (payload.precio_hora != null && payload.precio_hora !== '' && price === null) {
      return res.status(400).json({ error: 'El precio debe ser un valor entero válido.' });
    }
    if (!isValidCapacity(payload.capacidad)) {
      return res.status(400).json({ error: 'La capacidad es obligatoria y debe ser un número entero mayor que cero.' });
    }
    if (hasProfanityInFields(payload, ['name', 'tipo', 'direccion', 'barrio', 'ciudad', 'modalidad', 'caracteristicas', 'nivel_ruido'])) {
      return res.status(400).json({ error: 'No se permiten palabras ofensivas en los campos del espacio.' });
    }
    if (typeof payload.caracteristicas === 'string' && payload.caracteristicas.length > 2000) {
      return res.status(400).json({ error: 'Las características no pueden superar 2000 caracteres.' });
    }
    if (typeof payload.image_url === 'string' && payload.image_url.length > 50_000_000) {
      return res.status(413).json({ error: 'La imagen supera el tamaño permitido.' });
    }
    const textValue = (value) => typeof value === 'string' ? value.trim() || null : null;

    const result = await pool.query(
      `INSERT INTO places
        (owner_id, name, tipo, direccion, barrio, ciudad, capacidad, precio_hora, modalidad, caracteristicas, nivel_ruido, image_url, active, owner_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE, TRUE)
       RETURNING id, name, tipo, direccion, barrio, ciudad, capacidad, precio_hora, modalidad, caracteristicas, nivel_ruido, image_url, owner_active AS active, created_at`,
      [
        req.ownerUserId, name, tipo,
        textValue(payload.direccion), textValue(payload.barrio), textValue(payload.ciudad),
        String(payload.capacidad).trim(), price, textValue(payload.modalidad),
        textValue(payload.caracteristicas), textValue(payload.nivel_ruido), textValue(payload.image_url),
      ]
    );
    res.status(201).json({ place: result.rows[0] });
  } catch (error) {
    console.error('Error creando espacio del propietario:', error);
    res.status(500).json({ error: 'No se pudo publicar el espacio.' });
  }
});

router.put('/api/owner/places/:id', requireOwner, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'ID de espacio inválido.' });

    const payload = req.body || {};
    const hasPrice = payload.precio_hora !== undefined && payload.precio_hora !== null && payload.precio_hora !== '';
    const price = !hasPrice
      ? null
      : parseNonNegativeInteger(payload.precio_hora);
    if (hasPrice && price === null) {
      return res.status(400).json({ error: 'El precio debe ser un valor entero válido.' });
    }
    if (payload.capacidad !== undefined && !isValidCapacity(payload.capacidad)) {
      return res.status(400).json({ error: 'La capacidad debe ser un número entero mayor que cero.' });
    }
    if (hasProfanityInFields(payload, ['name', 'tipo', 'direccion', 'barrio', 'ciudad', 'modalidad', 'caracteristicas', 'nivel_ruido'])) {
      return res.status(400).json({ error: 'No se permiten palabras ofensivas en los campos del espacio.' });
    }
    if (typeof payload.caracteristicas === 'string' && payload.caracteristicas.length > 2000) {
      return res.status(400).json({ error: 'Las características no pueden superar 2000 caracteres.' });
    }
    if (typeof payload.image_url === 'string' && payload.image_url.length > 50_000_000) {
      return res.status(413).json({ error: 'La imagen supera el tamaño permitido.' });
    }
    if (typeof payload.active !== 'undefined' && typeof payload.active !== 'boolean') {
      return res.status(400).json({ error: 'El estado del espacio no es válido.' });
    }

    const result = await pool.query(
      `UPDATE places SET
         name = COALESCE($1, name), tipo = COALESCE($2, tipo), direccion = CASE WHEN $15 THEN $3 ELSE direccion END,
         barrio = COALESCE($4, barrio), ciudad = COALESCE($5, ciudad), capacidad = COALESCE($6, capacidad),
         precio_hora = COALESCE($7, precio_hora), modalidad = COALESCE($8, modalidad),
         caracteristicas = COALESCE($9, caracteristicas), nivel_ruido = COALESCE($10, nivel_ruido),
         image_url = CASE WHEN $16 THEN $11 ELSE image_url END,
         active = COALESCE($12, owner_active), owner_active = COALESCE($12, owner_active), updated_at = CURRENT_TIMESTAMP
       WHERE id = $13 AND owner_id = $14
       RETURNING id, name, tipo, direccion, barrio, ciudad, capacidad, precio_hora, modalidad,
                 caracteristicas, nivel_ruido, image_url, owner_active AS active, created_at`,
      [
        typeof payload.name === 'string' ? payload.name.trim() || null : null,
        typeof payload.tipo === 'string' ? payload.tipo.trim() || null : null,
        typeof payload.direccion === 'string' ? payload.direccion.trim() || null : null,
        typeof payload.barrio === 'string' ? payload.barrio.trim() || null : null,
        typeof payload.ciudad === 'string' ? payload.ciudad.trim() || null : null,
        payload.capacidad !== undefined ? String(payload.capacidad).trim() || null : null,
        price,
        typeof payload.modalidad === 'string' ? payload.modalidad.trim() || null : null,
        typeof payload.caracteristicas === 'string' ? payload.caracteristicas.trim() || null : null,
        typeof payload.nivel_ruido === 'string' ? payload.nivel_ruido.trim() || null : null,
        typeof payload.image_url === 'string' ? payload.image_url || null : null,
        typeof payload.active === 'boolean' ? payload.active : null,
        id, req.ownerUserId, typeof payload.direccion === 'string', typeof payload.image_url === 'string',
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'No se encontró ese espacio en tu cuenta.' });
    res.json({ place: result.rows[0] });
  } catch (error) {
    console.error('Error actualizando espacio del propietario:', error);
    res.status(500).json({ error: 'No se pudo actualizar el espacio.' });
  }
});

router.delete('/api/owner/places/:id', requireOwner, async (req, res) => {
  let client;
  let inTransaction = false;
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'ID de espacio inválido.' });
    client = await pool.connect();
    await client.query('BEGIN');
    inTransaction = true;
    const place = await client.query(
      'SELECT id FROM places WHERE id = $1 AND owner_id = $2 FOR UPDATE',
      [id, req.ownerUserId]
    );
    if (place.rows.length === 0) {
      await client.query('ROLLBACK');
      inTransaction = false;
      return res.status(404).json({ error: 'No se encontró ese espacio en tu cuenta.' });
    }
    const reservations = await client.query('SELECT 1 FROM reservations WHERE place_id = $1 LIMIT 1', [id]);
    if (reservations.rows.length > 0) {
      await client.query('ROLLBACK');
      inTransaction = false;
      return res.status(409).json({ error: 'Este espacio ya tiene reservas. Desactívalo para conservar el historial.' });
    }
    await client.query('DELETE FROM places WHERE id = $1 AND owner_id = $2', [id, req.ownerUserId]);
    await client.query('COMMIT');
    inTransaction = false;
    res.status(204).send();
  } catch (error) {
    if (client && inTransaction) await client.query('ROLLBACK');
    console.error('Error eliminando espacio del propietario:', error);
    res.status(500).json({ error: 'No se pudo eliminar el espacio.' });
  } finally {
    client?.release();
  }
});

router.get('/api/owner/reservations/pending-count', requireOwner, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS pending_count
       FROM reservations r
       JOIN places p ON p.id = r.place_id
       WHERE p.owner_id = $1 AND r.estado = 'pendiente'`,
      [req.ownerUserId]
    );
    res.json({ pendingCount: result.rows[0].pending_count });
  } catch (error) {
    console.error('Error contando solicitudes pendientes del propietario:', error);
    res.status(500).json({ error: 'No se pudieron consultar tus solicitudes pendientes.' });
  }
});

router.get('/api/owner/reservations', requireOwner, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.user_id, r.hotel, r.tipo_alojamiento, r.check_in, r.check_out,
              TO_CHAR(r.check_in_time, 'HH24:MI') AS check_in_time,
              TO_CHAR(r.check_out_time, 'HH24:MI') AS check_out_time, r.huespedes,
              (
                r.check_out < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date
                OR (
                  r.check_out = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date
                  AND COALESCE(r.check_out_time, TIME '23:59:59') <= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::time
                )
              ) AS can_complete,
              r.estado, r.created_at, u.full_name AS customer_name, p.name AS place_name
       FROM reservations r
       JOIN places p ON p.id = r.place_id
       JOIN users u ON u.id = r.user_id
       WHERE p.owner_id = $1
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT 250`,
      [req.ownerUserId]
    );
    res.json({ reservations: result.rows });
  } catch (error) {
    console.error('Error obteniendo reservas de espacios del propietario:', error);
    res.status(500).json({ error: 'No se pudieron cargar las reservas de tus espacios.' });
  }
});

router.get('/api/owner/dashboard-data', requireOwner, async (req, res) => {
  try {
    const [metrics, reviewSummary, reviews, upcomingReservations] = await Promise.all([
      pool.query(
        `WITH month_bounds AS (
           SELECT date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date AS month_start,
                  (date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota') + INTERVAL '1 month')::date AS month_end
         ),
         active_spaces AS (
           SELECT id FROM places
           WHERE owner_id = $1 AND COALESCE(owner_active, active) = TRUE
         ),
         monthly_reservations AS (
           SELECT r.total_amount
           FROM reservations r
           JOIN places p ON p.id = r.place_id
           CROSS JOIN month_bounds b
           WHERE p.owner_id = $1
             AND r.estado IN ('confirmada', 'completada')
             AND r.check_in >= b.month_start
             AND r.check_in < b.month_end
         ),
         monthly_totals AS (
           SELECT COUNT(*)::int AS reservation_count,
                  COUNT(*) FILTER (WHERE total_amount IS NOT NULL)::int AS priced_reservation_count,
                  COALESCE(SUM(total_amount), 0)::text AS reservation_value
           FROM monthly_reservations
         ),
         booked_hours AS (
           SELECT COALESCE(SUM(GREATEST(
             EXTRACT(EPOCH FROM (
               LEAST(r.check_out + COALESCE(r.check_out_time, TIME '00:00'), b.month_end::timestamp)
               - GREATEST(r.check_in + COALESCE(r.check_in_time, TIME '00:00'), b.month_start::timestamp)
             )) / 3600,
             0
           )), 0)::numeric AS hours
           FROM reservations r
           JOIN active_spaces p ON p.id = r.place_id
           CROSS JOIN month_bounds b
           WHERE r.estado IN ('confirmada', 'completada')
             AND r.check_out + COALESCE(r.check_out_time, TIME '00:00') > b.month_start::timestamp
             AND r.check_in + COALESCE(r.check_in_time, TIME '00:00') < b.month_end::timestamp
         ),
         capacity AS (
           SELECT COUNT(active_spaces.id)::int AS active_space_count,
                  EXTRACT(EPOCH FROM (b.month_end::timestamp - b.month_start::timestamp)) / 3600 AS month_hours
           FROM month_bounds b
           LEFT JOIN active_spaces ON TRUE
           GROUP BY b.month_start, b.month_end
         )
         SELECT totals.reservation_count AS monthly_reservations,
                totals.priced_reservation_count AS priced_reservations,
                totals.reservation_value AS monthly_value,
                capacity.active_space_count,
                CASE WHEN capacity.active_space_count = 0 THEN NULL
                     ELSE ROUND(LEAST(
                       100.0,
                       booked_hours.hours / (capacity.active_space_count * capacity.month_hours) * 100
                     ), 1)::text
                END AS occupancy_percentage
         FROM monthly_totals totals
         CROSS JOIN capacity
         CROSS JOIN booked_hours`,
        [req.ownerUserId]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS review_count,
                COALESCE(ROUND(AVG(review.rating)::numeric, 1)::text, '0') AS average_rating
         FROM place_reviews review
         JOIN places p ON p.id = review.place_id
         WHERE p.owner_id = $1`,
        [req.ownerUserId]
      ),
      pool.query(
        `SELECT review.id, review.rating, review.comment, review.created_at,
                p.name AS place_name,
                COALESCE(NULLIF(split_part(u.full_name, ' ', 1), ''), u.username) AS reviewer_name
         FROM place_reviews review
         JOIN places p ON p.id = review.place_id
         JOIN users u ON u.id = review.user_id
         WHERE p.owner_id = $1
         ORDER BY review.created_at DESC, review.id DESC
         LIMIT 5`,
        [req.ownerUserId]
      ),
      pool.query(
        `SELECT r.id, r.check_in, r.check_out,
                TO_CHAR(r.check_in_time, 'HH24:MI') AS check_in_time,
                TO_CHAR(r.check_out_time, 'HH24:MI') AS check_out_time,
                u.full_name AS customer_name, p.name AS place_name
         FROM reservations r
         JOIN places p ON p.id = r.place_id
         JOIN users u ON u.id = r.user_id
         WHERE p.owner_id = $1
           AND r.estado = 'confirmada'
           AND (
             r.check_out > (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date
             OR (
               r.check_out = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date
               AND (r.check_out_time IS NULL OR r.check_out_time >= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::time)
             )
           )
         ORDER BY r.check_in, r.check_in_time NULLS LAST, r.id
         LIMIT 5`,
        [req.ownerUserId]
      ),
    ]);

    res.json({
      metrics: metrics.rows[0],
      reviewSummary: reviewSummary.rows[0],
      reviews: reviews.rows,
      upcomingReservations: upcomingReservations.rows,
    });
  } catch (error) {
    console.error('Error obteniendo el resumen del propietario:', error);
    res.status(500).json({ error: 'No se pudo cargar el resumen de tu negocio.' });
  }
});

router.put('/api/owner/reservations/:id', requireOwner, async (req, res) => {
  let client;
  let inTransaction = false;
  try {
    const id = Number.parseInt(req.params.id, 10);
    const { estado, cancellationReason } = req.body || {};
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'ID de reserva inválido.' });
    if (!['confirmada', 'cancelada', 'completada'].includes(estado)) {
      return res.status(400).json({ error: 'El nuevo estado de la reserva no es válido.' });
    }

    client = await pool.connect();
    await client.query('BEGIN');
    inTransaction = true;
    const currentResult = await client.query(
      `SELECT r.id, r.user_id, r.estado, r.hotel, r.check_out, r.check_out_time, r.place_id,
              (
                r.check_out < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date
                OR (
                  r.check_out = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date
                  AND COALESCE(r.check_out_time, TIME '23:59:59') <= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::time
                )
              ) AS can_complete
       FROM reservations r JOIN places p ON p.id = r.place_id
       WHERE r.id = $1 AND p.owner_id = $2 FOR UPDATE OF r`,
      [id, req.ownerUserId]
    );
    const current = currentResult.rows[0];
    if (!current) {
      await client.query('ROLLBACK');
      inTransaction = false;
      return res.status(404).json({ error: 'No se encontró esa reserva en tus espacios.' });
    }
    const allowed = current.estado === 'pendiente'
      ? ['confirmada', 'cancelada'].includes(estado)
      : current.estado === 'confirmada'
        ? estado === 'cancelada' || estado === 'completada'
        : false;
    if (!allowed) {
      await client.query('ROLLBACK');
      inTransaction = false;
      return res.status(409).json({ error: 'No se puede cambiar una reserva desde su estado actual.' });
    }
    if (estado === 'completada' && !current.can_complete) {
      await client.query('ROLLBACK');
      inTransaction = false;
      return res.status(409).json({ error: 'Solo puedes marcar como completada una reserva cuya fecha de salida ya pasó.' });
    }
    const reason = typeof cancellationReason === 'string' ? cancellationReason.trim() : '';
    if (estado === 'cancelada' && reason.length > 500) {
      await client.query('ROLLBACK');
      inTransaction = false;
      return res.status(400).json({ error: 'El motivo no puede superar 500 caracteres.' });
    }

    const updated = await client.query(
      `UPDATE reservations SET estado = $1::varchar,
         cancellation_reason = CASE WHEN $1::varchar = 'cancelada' THEN $2::text ELSE NULL::text END,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, user_id, hotel, estado, check_in, check_out,
                 TO_CHAR(check_in_time, 'HH24:MI') AS check_in_time,
                 TO_CHAR(check_out_time, 'HH24:MI') AS check_out_time, huespedes, place_id`,
      [estado, reason || (estado === 'cancelada' ? 'Cancelada por el anfitrión.' : null), id]
    );
    const labels = {
      confirmada: 'confirmada por el anfitrión',
      cancelada: 'cancelada por el anfitrión',
      completada: 'completada',
    };
    await client.query(
      `INSERT INTO user_notifications (user_id, reservation_id, title, detail, tone)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        current.user_id,
        id,
        estado === 'confirmada' ? 'Reserva confirmada por el anfitrión' : estado === 'cancelada' ? 'Reserva cancelada por el anfitrión' : 'Reserva completada',
        estado === 'cancelada' && reason
          ? `Tu reserva para ${current.hotel} fue cancelada. Motivo: ${reason}`
          : `Tu reserva para ${current.hotel} quedó ${labels[estado]}.`,
        estado === 'confirmada' || estado === 'completada' ? 'success' : 'warning',
      ]
    );
    await client.query('COMMIT');
    inTransaction = false;
    await syncPlaceReservationState(current.place_id);
    res.json({ reservation: updated.rows[0] });
  } catch (error) {
    if (client && inTransaction) await client.query('ROLLBACK');
    console.error('Error actualizando reserva del propietario:', error);
    res.status(500).json({ error: 'No se pudo actualizar la reserva.' });
  } finally {
    client?.release();
  }
});

export default router;

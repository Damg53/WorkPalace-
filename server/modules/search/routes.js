import { Router } from 'express';
import { createRealtime, rawSql } from '@neon/realtime/server';
import pool from '../../db.js';

const router = Router();
const bogotaDate = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};
const placesAvailabilityQuery = `SELECT p.id, p.name, p.tipo, p.direccion, p.barrio, p.ciudad, p.capacidad, p.precio_hora, p.modalidad, p.caracteristicas, p.nivel_ruido, p.image_url,
              COALESCE(NULLIF(split_part(owner.full_name, ' ', 1), ''), owner.username) AS owner_name,
              COALESCE(review_stats.average_rating, 0) AS average_rating,
              COALESCE(review_stats.review_count, 0) AS review_count,
              p.owner_active AND block.id IS NULL AND reservation.id IS NULL AS active,
              COALESCE(block.reason, CASE WHEN reservation.id IS NOT NULL THEN 'Reserva confirmada' END) AS unavailable_reason,
              CASE
                WHEN block.id IS NOT NULL THEN TO_CHAR(block.ends_at + INTERVAL '1 day', 'YYYY-MM-DD')
                WHEN reservation.id IS NOT NULL AND reservation.check_out_time IS NOT NULL
                  THEN TO_CHAR(reservation.available_at, 'YYYY-MM-DD"T"HH24:MI')
                WHEN reservation.id IS NOT NULL THEN TO_CHAR(reservation.available_at::date, 'YYYY-MM-DD')
              END AS available_from
       FROM places p
       LEFT JOIN users owner ON owner.id = p.owner_id
       LEFT JOIN LATERAL (
         SELECT ROUND(AVG(rating)::numeric, 1) AS average_rating, COUNT(*)::int AS review_count
         FROM place_reviews
         WHERE place_id = p.id
       ) review_stats ON TRUE
       LEFT JOIN LATERAL (
         SELECT id, reason, ends_at
         FROM place_blocks
         WHERE place_id = p.id
           AND $1::date BETWEEN starts_at AND ends_at
         ORDER BY ends_at ASC, id ASC
         LIMIT 1
       ) block ON TRUE
       LEFT JOIN LATERAL (
         SELECT id, check_out, check_out_time,
                CASE
                  WHEN check_out_time IS NULL THEN check_out + INTERVAL '1 day'
                  ELSE check_out + check_out_time
                END AS available_at
         FROM reservations
         WHERE place_id = p.id
           AND active = TRUE
           AND estado IN ('pendiente', 'confirmada')
           AND check_out >= $1::date
           AND check_in <= $1::date
         ORDER BY available_at DESC, id DESC
         LIMIT 1
       ) reservation ON TRUE
       WHERE p.owner_active = TRUE OR reservation.id IS NOT NULL
      ORDER BY p.id ASC`;

router.get('/api/places', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];

    // Solo usuarios autenticados pueden ver los espacios publicados
    if (!userId) {
      return res.json({ places: [] });
    }

    const requestedDate = typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
      ? req.query.date
      : null;
    const result = await pool.query(
      placesAvailabilityQuery,
      [requestedDate || bogotaDate()]
    );
    res.json({ places: result.rows });
  } catch (error) {
    console.error('Error obteniendo places:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.get('/api/realtime/places', async (req, res) => {
  try {
    if (!req.headers['x-user-id']) {
      return res.status(401).json({ error: 'Debes iniciar sesión para ver los espacios.' });
    }

    const secret = process.env.NEON_REALTIME_SECRET;
    const url = process.env.NEON_REALTIME_URL;
    const databaseUrl = process.env.DATABASE_URL;
    if (!secret || !url || !databaseUrl) {
      return res.status(503).json({ error: 'Neon Realtime no está configurado.' });
    }

    const requestedDate = typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
      ? req.query.date
      : bogotaDate();
    const databaseName = decodeURIComponent(new URL(databaseUrl).pathname.slice(1));
    const realtime = createRealtime({ secret, db: databaseName });
    const query = rawSql(placesAvailabilityQuery, [requestedDate]);
    const sealedQuery = await realtime.seal({ query });

    res.json({ url, query: sealedQuery });
  } catch (error) {
    console.error('Error preparando la consulta Realtime de espacios:', error);
    res.status(500).json({ error: 'No se pudo preparar la disponibilidad en tiempo real.' });
  }
});

export default router;

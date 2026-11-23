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
              p.owner_active,
              COALESCE(NULLIF(split_part(owner.full_name, ' ', 1), ''), owner.username) AS owner_name,
              COALESCE(review_stats.average_rating, 0) AS average_rating,
              COALESCE(review_stats.review_count, 0) AS review_count,
              p.owner_active AND block.id IS NULL AND reservation.id IS NULL AS active,
              block.id IS NOT NULL AS has_block,
              COALESCE(block.partial_for_date, FALSE) AS has_partial_block,
              reservation.id IS NOT NULL AS has_reservation,
              COALESCE(block.reason, CASE WHEN reservation.id IS NOT NULL THEN 'Reserva confirmada' END) AS unavailable_reason,
              CASE
                WHEN block.id IS NOT NULL THEN TO_CHAR(block.block_ends_at, 'YYYY-MM-DD"T"HH24:MI')
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
         SELECT id, reason,
                CASE WHEN ends_at_time IS NULL THEN ends_at + INTERVAL '1 day' ELSE ends_at + ends_at_time END AS block_ends_at,
                (starts_at + COALESCE(starts_at_time, TIME '00:00')) > $1::date
                  OR (CASE WHEN ends_at_time IS NULL THEN ends_at + INTERVAL '1 day' ELSE ends_at + ends_at_time END) < ($1::date + INTERVAL '1 day') AS partial_for_date
         FROM place_blocks
         WHERE place_id = p.id
           AND (starts_at + COALESCE(starts_at_time, TIME '00:00')) < ($1::date + INTERVAL '1 day')
           AND (CASE WHEN ends_at_time IS NULL THEN ends_at + INTERVAL '1 day' ELSE ends_at + ends_at_time END) > $1::date
         ORDER BY block_ends_at ASC, id ASC
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

router.get('/api/public/places', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.name, p.tipo, p.barrio, p.ciudad, p.precio_hora,
              LEFT(p.caracteristicas, 300) AS caracteristicas,
              CASE
                WHEN length(p.image_url) <= 150000
                  AND (p.image_url LIKE 'data:image/%' OR p.image_url ~ '^https?://')
                  THEN p.image_url
              END AS image_url,
              COALESCE(review_stats.average_rating, 0) AS average_rating,
              COALESCE(review_stats.review_count, 0) AS review_count
       FROM places p
       LEFT JOIN LATERAL (
         SELECT ROUND(AVG(rating)::numeric, 1) AS average_rating, COUNT(*)::int AS review_count
         FROM place_reviews
         WHERE place_id = p.id
       ) review_stats ON TRUE
       WHERE p.owner_active = TRUE
       ORDER BY review_stats.average_rating DESC NULLS LAST, p.created_at DESC, p.id DESC
       LIMIT 8`
    );
    res.json({ places: result.rows });
  } catch (error) {
    console.error('Error obteniendo espacios públicos destacados:', error);
    res.status(500).json({ error: 'No se pudieron cargar los espacios destacados.' });
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

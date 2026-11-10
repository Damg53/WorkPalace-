import { Router } from 'express';
import pool from '../../db.js';

const router = Router();

router.get('/api/places/:id/reviews', async (req, res) => {
  try {
    const placeId = Number.parseInt(req.params.id, 10);
    if (!Number.isSafeInteger(placeId) || placeId < 1) {
      return res.status(400).json({ error: 'ID de espacio inválido.' });
    }

    const result = await pool.query(
      `SELECT review.id, review.rating, review.comment, review.created_at,
              split_part(u.full_name, ' ', 1) AS reviewer_name
       FROM place_reviews review
       JOIN users u ON u.id = review.user_id
       WHERE review.place_id = $1
       ORDER BY review.created_at DESC, review.id DESC
       LIMIT 50`,
      [placeId]
    );
    res.json({ reviews: result.rows });
  } catch (error) {
    console.error('Error obteniendo reseñas verificadas:', error);
    res.status(500).json({ error: 'No se pudieron cargar las reseñas.' });
  }
});

router.post('/api/places/:id/reviews', async (req, res) => {
  let client;
  let inTransaction = false;
  try {
    const userId = Number.parseInt(req.header('x-user-id') || '', 10);
    const placeId = Number.parseInt(req.params.id, 10);
    const reservationId = Number.parseInt(req.body?.reservationId, 10);
    const rating = Number(req.body?.rating);
    const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';

    if (!Number.isSafeInteger(userId) || userId < 1) {
      return res.status(401).json({ error: 'Debes iniciar sesión para dejar una reseña.' });
    }
    if (!Number.isSafeInteger(placeId) || placeId < 1 || !Number.isSafeInteger(reservationId) || reservationId < 1) {
      return res.status(400).json({ error: 'La reserva o el espacio no son válidos.' });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'La calificación debe estar entre 1 y 5 estrellas.' });
    }
    if (comment.length > 1000) {
      return res.status(400).json({ error: 'La reseña no puede superar 1000 caracteres.' });
    }

    client = await pool.connect();
    await client.query('BEGIN');
    inTransaction = true;
    const eligible = await client.query(
      `SELECT id FROM reservations
       WHERE id = $1 AND user_id = $2 AND place_id = $3 AND estado = 'completada'
       FOR UPDATE`,
      [reservationId, userId, placeId]
    );
    if (eligible.rows.length === 0) {
      await client.query('ROLLBACK');
      inTransaction = false;
      return res.status(403).json({ error: 'Solo puedes reseñar un espacio después de completar una reserva propia.' });
    }

    const result = await client.query(
      `INSERT INTO place_reviews (reservation_id, place_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, reservation_id, place_id, rating, comment, created_at`,
      [reservationId, placeId, userId, rating, comment || null]
    );
    await client.query('COMMIT');
    inTransaction = false;
    res.status(201).json({ review: result.rows[0] });
  } catch (error) {
    if (client && inTransaction) await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya dejaste una reseña para esta reserva.' });
    }
    console.error('Error creando reseña verificada:', error);
    res.status(500).json({ error: 'No se pudo guardar la reseña.' });
  } finally {
    client?.release();
  }
});

export default router;

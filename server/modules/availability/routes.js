import { Router } from 'express';
import pool from '../../db.js';
import { logAdminAction, requireAdmin } from '../../middleware/admin.js';
import { containsProfanity, normalizeText } from '../../shared/validation.js';

const router = Router();

router.get('/api/admin/blocks', requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id, b.place_id, p.name AS place_name, b.starts_at,
              TO_CHAR(b.starts_at_time, 'HH24:MI') AS starts_at_time,
              b.ends_at, TO_CHAR(b.ends_at_time, 'HH24:MI') AS ends_at_time, b.reason
       FROM place_blocks b JOIN places p ON p.id = b.place_id
        WHERE b.ends_at >= CURRENT_DATE
       ORDER BY b.starts_at ASC, b.id ASC`
    );
    res.json({ blocks: result.rows });
  } catch (error) {
    console.error('Error obteniendo bloqueos:', error);
    res.status(500).json({ error: 'No se pudieron cargar los bloqueos' });
  }
});

router.post('/api/admin/blocks', requireAdmin, async (req, res) => {
  try {
    const placeId = Number(req.body?.placeId);
    const startsAt = req.body?.startsAt;
    const startsAtTime = req.body?.startsAtTime;
    const endsAt = req.body?.endsAt;
    const endsAtTime = req.body?.endsAtTime;
    const reason = normalizeText(req.body?.reason || '');
    const isDate = (value) => typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
    const isTime = (value) => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
    if (!Number.isSafeInteger(placeId) || placeId < 1 || !isDate(startsAt) || !isDate(endsAt) || endsAt < startsAt) {
      return res.status(400).json({ error: 'Lugar y rango de fechas válido son requeridos' });
    }
    if (!isTime(startsAtTime) || !isTime(endsAtTime)) {
      return res.status(400).json({ error: 'Debes indicar horas válidas de inicio y fin, incluyendo minutos.' });
    }
    if (startsAt === endsAt && endsAtTime <= startsAtTime) {
      return res.status(400).json({ error: 'La hora de fin debe ser posterior a la hora de inicio.' });
    }
    if (!reason) return res.status(400).json({ error: 'El motivo del bloqueo es obligatorio.' });
    if (reason.length > 500) return res.status(400).json({ error: 'El motivo no puede superar 500 caracteres.' });
    if (containsProfanity(reason)) return res.status(400).json({ error: 'No se permiten palabras ofensivas en el motivo.' });
    const result = await pool.query(
      `INSERT INTO place_blocks (place_id, starts_at, starts_at_time, ends_at, ends_at_time, reason)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, place_id, starts_at, TO_CHAR(starts_at_time, 'HH24:MI') AS starts_at_time,
                 ends_at, TO_CHAR(ends_at_time, 'HH24:MI') AS ends_at_time, reason`,
      [placeId, startsAt, startsAtTime, endsAt, endsAtTime, reason]
    );
    await logAdminAction(req, 'create', 'place_block', result.rows[0].id, { placeId, startsAt, startsAtTime, endsAt, endsAtTime });
    res.status(201).json({ block: result.rows[0] });
  } catch (error) {
    console.error('Error creando bloqueo:', error);
    res.status(500).json({ error: 'No se pudo crear el bloqueo' });
  }
});

router.delete('/api/admin/blocks/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const result = await pool.query('DELETE FROM place_blocks WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Bloqueo no encontrado' });
    await logAdminAction(req, 'delete', 'place_block', id);
    res.status(204).send();
  } catch (error) {
    console.error('Error eliminando bloqueo:', error);
    res.status(500).json({ error: 'No se pudo eliminar el bloqueo' });
  }
});

router.get('/api/available-reservations', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, hotel, tipo_alojamiento, ubicacion, check_in, check_out,
              TO_CHAR(check_in_time, 'HH24:MI') AS check_in_time,
              TO_CHAR(check_out_time, 'HH24:MI') AS check_out_time, huespedes, estado
       FROM reservations
       WHERE estado IN ('pendiente', 'confirmada')
       ORDER BY check_in ASC, hotel ASC`
    );
    res.json({ reservations: result.rows });
  } catch (error) {
    console.error('Error obteniendo reservas disponibles:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

export default router;

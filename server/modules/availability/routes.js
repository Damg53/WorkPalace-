import { Router } from 'express';
import pool from '../../db.js';
import { logAdminAction, requireAdmin } from '../../middleware/admin.js';
import { normalizeText } from '../../shared/validation.js';

const router = Router();

router.get('/api/admin/blocks', requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id, b.place_id, p.name AS place_name, b.starts_at, b.ends_at, b.reason
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
    const placeId = Number.parseInt(req.body?.placeId, 10);
    const startsAt = req.body?.startsAt;
    const endsAt = req.body?.endsAt;
    if (!Number.isInteger(placeId) || !startsAt || !endsAt || endsAt < startsAt) {
      return res.status(400).json({ error: 'Lugar y rango de fechas válido son requeridos' });
    }
    const result = await pool.query(
      `INSERT INTO place_blocks (place_id, starts_at, ends_at, reason) VALUES ($1, $2, $3, $4)
       RETURNING id, place_id, starts_at, ends_at, reason`,
      [placeId, startsAt, endsAt, normalizeText(req.body?.reason || '') || null]
    );
    await logAdminAction(req, 'create', 'place_block', result.rows[0].id, { placeId, startsAt, endsAt });
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
      `SELECT id, hotel, tipo_alojamiento, ubicacion, check_in, check_out, huespedes, estado
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

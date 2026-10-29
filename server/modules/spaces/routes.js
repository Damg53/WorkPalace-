import { Router } from 'express';
import pool from '../../db.js';
import { requireAdmin } from '../../middleware/admin.js';

const router = Router();

router.get('/api/admin/places', requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, tipo, barrio, ciudad, capacidad, precio_hora, modalidad, caracteristicas, nivel_ruido, active
       FROM places
       ORDER BY id ASC`
    );
    res.json({ places: result.rows });
  } catch (error) {
    console.error('Error obteniendo places (admin):', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.post('/api/admin/places', requireAdmin, async (req, res) => {
  try {
    const { name, tipo, barrio, ciudad, capacidad, precio_hora, modalidad, caracteristicas, nivel_ruido, image_url } = req.body;

    if (!name || !tipo) {
      return res.status(400).json({ error: 'Nombre y tipo son requeridos' });
    }

    const result = await pool.query(
      `INSERT INTO places (name, tipo, barrio, ciudad, capacidad, precio_hora, modalidad, caracteristicas, nivel_ruido, image_url, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)
       RETURNING id, name, tipo, barrio, ciudad, capacidad, precio_hora, modalidad, caracteristicas, nivel_ruido, image_url, active`,
      [name, tipo, barrio || null, ciudad || null, capacidad || null, precio_hora || null, modalidad || null, caracteristicas || null, nivel_ruido || null, image_url || null]
    );

    res.status(201).json({ place: result.rows[0] });
  } catch (error) {
    console.error('Error creando lugar:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.put('/api/admin/places/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, tipo, barrio, ciudad, capacidad, precio_hora, modalidad, caracteristicas, image_url, active } = req.body || {};
    const pid = parseInt(id, 10);
    if (isNaN(pid)) {
      return res.status(400).json({ error: 'ID de lugar inválido' });
    }

    const result = await pool.query(
      `UPDATE places SET
         name = COALESCE($1, name),
         tipo = COALESCE($2, tipo),
         barrio = COALESCE($3, barrio),
         ciudad = COALESCE($4, ciudad),
         capacidad = COALESCE($5, capacidad),
         precio_hora = COALESCE($6, precio_hora),
         modalidad = COALESCE($7, modalidad),
         caracteristicas = COALESCE($8, caracteristicas),
         image_url = COALESCE($9, image_url),
         active = COALESCE($10, active)
       WHERE id = $11
       RETURNING id, name, tipo, barrio, ciudad, capacidad, precio_hora, modalidad, caracteristicas, nivel_ruido, image_url, active`,
      [
        name || null,
        tipo || null,
        barrio || null,
        ciudad || null,
        capacidad || null,
        typeof precio_hora === 'number' ? precio_hora : null,
        modalidad || null,
        caracteristicas || null,
        image_url || null,
        active === undefined ? null : !!active,
        pid,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lugar no encontrado' });
    }
    res.json({ place: result.rows[0] });
  } catch (error) {
    console.error('Error actualizando place (admin):', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.delete('/api/admin/places/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const pid = parseInt(id, 10);
    if (isNaN(pid)) {
      return res.status(400).json({ error: 'ID de lugar inválido' });
    }
    const result = await pool.query('DELETE FROM places WHERE id = $1 RETURNING id', [pid]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lugar no encontrado' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error eliminando place (admin):', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

export default router;

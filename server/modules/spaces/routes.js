import { Router } from 'express';
import pool from '../../db.js';
import { requireAdmin } from '../../middleware/admin.js';
import { hasProfanityInFields, isValidCapacity, parseNonNegativeInteger } from '../../shared/validation.js';

const router = Router();

router.get('/api/admin/places', requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, tipo, direccion, barrio, ciudad, capacidad, precio_hora, modalidad, caracteristicas, nivel_ruido, image_url, owner_active AS active, created_at
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
    const { name, tipo, direccion, barrio, ciudad, capacidad, precio_hora, modalidad, caracteristicas, nivel_ruido, image_url } = req.body || {};

    if (typeof name !== 'string' || !name.trim() || typeof tipo !== 'string' || !tipo.trim()) {
      return res.status(400).json({ error: 'Nombre y tipo son requeridos' });
    }
    if (!isValidCapacity(capacidad)) {
      return res.status(400).json({ error: 'La capacidad es obligatoria y debe ser un número entero mayor que cero.' });
    }
    const price = precio_hora == null || precio_hora === '' ? null : parseNonNegativeInteger(precio_hora);
    if (precio_hora != null && precio_hora !== '' && price === null) {
      return res.status(400).json({ error: 'El precio debe ser un valor entero válido.' });
    }
    if (hasProfanityInFields(req.body, ['name', 'tipo', 'direccion', 'barrio', 'ciudad', 'modalidad', 'caracteristicas', 'nivel_ruido'])) {
      return res.status(400).json({ error: 'No se permiten palabras ofensivas en los campos del espacio.' });
    }
    if (name.length > 255 || tipo.length > 100 || (typeof caracteristicas === 'string' && caracteristicas.length > 2000)) {
      return res.status(400).json({ error: 'Uno o más campos superan el límite de caracteres permitido.' });
    }

    const result = await pool.query(
      `INSERT INTO places (name, tipo, direccion, barrio, ciudad, capacidad, precio_hora, modalidad, caracteristicas, nivel_ruido, image_url, active, owner_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, TRUE)
       RETURNING id, name, tipo, direccion, barrio, ciudad, capacidad, precio_hora, modalidad, caracteristicas, nivel_ruido, image_url, owner_active AS active`,
      [name.trim(), tipo.trim(), direccion?.trim() || null, typeof barrio === 'string' ? barrio.trim() || null : null, ciudad || null, String(capacidad).trim(), price, modalidad || null, caracteristicas || null, nivel_ruido || null, image_url || null]
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
    const { name, tipo, direccion, barrio, ciudad, capacidad, precio_hora, modalidad, caracteristicas, image_url, active } = req.body || {};
    const pid = parseInt(id, 10);
    if (isNaN(pid)) {
      return res.status(400).json({ error: 'ID de lugar inválido' });
    }
    if (capacidad !== undefined && !isValidCapacity(capacidad)) {
      return res.status(400).json({ error: 'La capacidad debe ser un número entero mayor que cero.' });
    }
    if (precio_hora !== undefined && precio_hora !== null && parseNonNegativeInteger(precio_hora) === null) {
      return res.status(400).json({ error: 'El precio debe ser un valor entero válido.' });
    }
    if (hasProfanityInFields(req.body, ['name', 'tipo', 'direccion', 'barrio', 'ciudad', 'modalidad', 'caracteristicas', 'nivel_ruido'])) {
      return res.status(400).json({ error: 'No se permiten palabras ofensivas en los campos del espacio.' });
    }
    if ((typeof name === 'string' && name.length > 255) ||
        (typeof tipo === 'string' && tipo.length > 100) ||
        (typeof caracteristicas === 'string' && caracteristicas.length > 2000)) {
      return res.status(400).json({ error: 'Uno o más campos superan el límite de caracteres permitido.' });
    }
    const parsedPrice = precio_hora === undefined || precio_hora === null ? null : parseNonNegativeInteger(precio_hora);

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
         active = COALESCE($10, owner_active),
         owner_active = COALESCE($10, owner_active),
         direccion = CASE WHEN $12 THEN $11 ELSE direccion END
       WHERE id = $13
       RETURNING id, name, tipo, direccion, barrio, ciudad, capacidad, precio_hora, modalidad, caracteristicas, nivel_ruido, image_url, owner_active AS active`,
      [
        name || null,
        tipo || null,
        barrio || null,
        ciudad || null,
        capacidad === undefined || capacidad === null ? null : String(capacidad).trim(),
        parsedPrice,
        modalidad || null,
        caracteristicas || null,
        image_url || null,
        active === undefined ? null : !!active,
        typeof direccion === 'string' ? direccion.trim() || null : null,
        direccion !== undefined,
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

import { Router } from 'express';
import bcryptjs from 'bcryptjs';
import pool from '../../db.js';
import { normalizeColombianPhone, normalizeText, isSafeEmail, isSafeName, isSafePassword, isSafeUsername } from '../../shared/validation.js';
import { getProfileImageUrl, storeProfileImage } from '../../shared/neon-storage.js';
import { logAdminAction, requireAdmin } from '../../middleware/admin.js';

const router = Router();

router.post('/api/signup', async (req, res) => {
  try {
    const fullName = normalizeText(req.body.fullName || '');
    const email = normalizeText(req.body.email || '');
    const username = normalizeText(req.body.username || '');
    const password = String(req.body.password || '');
    const phone = req.body.phone ? normalizeColombianPhone(req.body.phone) : null;
    const role = req.body.accountType === 'owner' ? 'owner' : 'user';

    if (!fullName || !email || !username || !password) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (!isSafeName(fullName)) {
      return res.status(400).json({ error: 'El nombre completo contiene caracteres no válidos' });
    }

    if (!isSafeEmail(email)) {
      return res.status(400).json({ error: 'Ingresa un correo electrónico válido' });
    }

    if (!isSafeUsername(username)) {
      return res.status(400).json({ error: 'El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos' });
    }

    if (!isSafePassword(password)) {
      return res.status(400).json({ error: 'La contraseña debe tener entre 6 y 128 caracteres' });
    }

    if (req.body.phone && !phone) {
      return res.status(400).json({ error: 'Ingresa un celular colombiano válido de 10 dígitos' });
    }

    // Verificar si el email ya existe
    const emailExists = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (emailExists.rows.length > 0) {
      return res.status(400).json({ error: 'Este email ya está registrado. Por favor usa otro email.' });
    }

    // Verificar si el usuario ya existe
    const usernameExists = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (usernameExists.rows.length > 0) {
      return res.status(400).json({ error: 'Este usuario ya existe. Por favor elige otro nombre de usuario.' });
    }

    // Hashear la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcryptjs.hash(password, saltRounds);

    const result = await pool.query(
      'INSERT INTO users (full_name, email, username, password, phone, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, username, role',
      [fullName, email, username, hashedPassword, phone, role]
    );

    await pool.query(
      `INSERT INTO user_notifications (user_id, title, detail, tone)
       VALUES ($1, 'Bienvenido a WorkPalace', $2, 'success')`,
      [
        result.rows[0].id,
        role === 'owner'
          ? 'Tu panel de propietario está listo para publicar y administrar espacios.'
          : 'Tu cuenta quedó lista para empezar a reservar.',
      ]
    );

    res.status(201).json({
      message: '✅ Usuario registrado exitosamente',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);

    if (error.code === '23505') {
      if (error.constraint?.includes('email')) {
        return res.status(409).json({ error: 'No se pudo registrar: ese correo ya está registrado.' });
      }
      if (error.constraint?.includes('username')) {
        return res.status(409).json({ error: 'No se pudo registrar: ese nombre de usuario ya está ocupado.' });
      }
      return res.status(409).json({ error: 'No se pudo registrar: uno de los datos ya está registrado.' });
    }

    if (error.code === '23503') {
      return res.status(400).json({ error: 'No se pudo registrar porque faltan datos relacionados en la base de datos.' });
    }

    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, full_name, email, username, role, active, created_at FROM users ORDER BY id');
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.put('/api/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['admin', 'user', 'owner'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }
    const update = await pool.query(
      'UPDATE users SET role=$1 WHERE id=$2 RETURNING id, username, full_name, email, role',
      [role, id]
    );
    if (update.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ user: update.rows[0] });
  } catch (error) {
    console.error('Error al actualizar rol:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.put('/api/users/:id/active', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body || {};
    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'El campo active debe ser booleano' });
    }
    const result = await pool.query(
      'UPDATE users SET active = $1 WHERE id = $2 RETURNING id, full_name, email, username, role, active',
      [active, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const user = result.rows[0];
    user.profile_image_url = await getProfileImageUrl(user.profile_image_url);
    res.json({ user });
  } catch (error) {
    console.error('Error al actualizar estado de usuario:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.get('/api/admin/audit', requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.action, a.entity_type, a.entity_id, a.details, a.created_at, u.username AS admin_username
       FROM admin_audit_logs a LEFT JOIN users u ON u.id = a.admin_user_id
       ORDER BY a.created_at DESC, a.id DESC LIMIT 200`
    );
    res.json({ logs: result.rows });
  } catch (error) {
    console.error('Error obteniendo auditoría:', error);
    res.status(500).json({ error: 'No se pudo cargar la auditoría' });
  }
});

router.delete('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.get('/api/users/:id/profile', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }
    const result = await pool.query(
      'SELECT id, username, full_name, email, role, profile_image_url, phone, active, two_factor_enabled FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    if (result.rows[0].active === false) {
      return res.status(403).json({ error: 'Esta cuenta está desactivada.' });
    }
    const user = result.rows[0];
    user.profile_image_url = await getProfileImageUrl(user.profile_image_url);
    res.json({ user });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.put('/api/users/:id/profile', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, username, profile_image_url, phone } = req.body;

    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    const current = await pool.query(
      'SELECT id, full_name, email, username, profile_image_url, phone, two_factor_enabled FROM users WHERE id = $1',
      [userId]
    );
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const existing = current.rows[0];
    const newFullName = full_name !== undefined ? full_name.trim() : existing.full_name;
    const newEmail = email !== undefined ? email.trim() : existing.email;
    const newUsername = username !== undefined ? username.trim() : existing.username;
    let newProfileImage = existing.profile_image_url;
    let profileImageDataUrl = null;
    if (profile_image_url !== undefined) {
      const requestedImage = String(profile_image_url).trim();
      if (requestedImage.startsWith('data:')) {
        profileImageDataUrl = requestedImage;
      } else if (
        !(existing.profile_image_url?.startsWith('neon-object://assets/') && requestedImage.startsWith('https://'))
      ) {
        newProfileImage = requestedImage || null;
      }
    }
    const newPhone = phone !== undefined ? normalizeColombianPhone(phone) : existing.phone;
    if (phone !== undefined && phone !== '' && !newPhone) {
      return res.status(400).json({ error: 'Ingresa un celular colombiano válido de 10 dígitos' });
    }

    if (newEmail) {
      const emailTaken = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [newEmail, userId]
      );
      if (emailTaken.rows.length > 0) {
        return res.status(400).json({ error: 'Este correo ya está en uso por otra cuenta.' });
      }
    }
    if (newUsername) {
      const usernameTaken = await pool.query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [newUsername, userId]
      );
      if (usernameTaken.rows.length > 0) {
        return res.status(400).json({ error: 'Este nombre de usuario ya está en uso.' });
      }
    }

    if (profileImageDataUrl) {
      newProfileImage = await storeProfileImage(userId, profileImageDataUrl);
    }

    const update = await pool.query(
      `UPDATE users SET 
        full_name = COALESCE($1, full_name),
        email = COALESCE($2, email),
        username = COALESCE($3, username),
        profile_image_url = COALESCE($4, profile_image_url),
        phone = $5
      WHERE id = $6
       RETURNING id, username, full_name, email, role, profile_image_url, phone, two_factor_enabled`,
      [newFullName || null, newEmail || null, newUsername || null, newProfileImage, newPhone || null, userId]
    );

    const updatedUser = update.rows[0];
    updatedUser.profile_image_url = await getProfileImageUrl(updatedUser.profile_image_url);
    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.get('/api/users/:id/favorites', async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.id, 10);
    const sessionUserId = Number.parseInt(req.header('x-user-id') || '', 10);

    if (!Number.isInteger(userId) || !Number.isInteger(sessionUserId) || sessionUserId !== userId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const result = await pool.query(
      `SELECT id, place_id, place_name, place_city, created_at
       FROM user_favorites
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ favorites: result.rows });
  } catch (error) {
    console.error('Error obteniendo favoritos:', error);
    res.status(500).json({ error: 'No se pudieron cargar los favoritos' });
  }
});

router.post('/api/users/:id/favorites', async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.id, 10);
    const sessionUserId = Number.parseInt(req.header('x-user-id') || '', 10);
    const placeId = Number.parseInt(req.body?.placeId, 10);
    const placeName = normalizeText(req.body?.placeName || '');
    const placeCity = normalizeText(req.body?.placeCity || '');

    if (!Number.isInteger(userId) || !Number.isInteger(sessionUserId) || sessionUserId !== userId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    if (!Number.isInteger(placeId) || !placeName) {
      return res.status(400).json({ error: 'Falta información del espacio' });
    }

    const existing = await pool.query(
      'SELECT id FROM user_favorites WHERE user_id = $1 AND place_id = $2',
      [userId, placeId]
    );

    if (existing.rows.length > 0) {
      return res.status(200).json({ favorite: existing.rows[0], duplicated: true });
    }

    const result = await pool.query(
      `INSERT INTO user_favorites (user_id, place_id, place_name, place_city)
       VALUES ($1, $2, $3, $4)
       RETURNING id, place_id, place_name, place_city, created_at`,
      [userId, placeId, placeName, placeCity || null]
    );

    res.status(201).json({ favorite: result.rows[0] });
  } catch (error) {
    console.error('Error guardando favorito:', error);
    res.status(500).json({ error: 'No se pudo guardar el favorito' });
  }
});

router.delete('/api/users/:id/favorites/:placeId', async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.id, 10);
    const sessionUserId = Number.parseInt(req.header('x-user-id') || '', 10);
    const placeId = Number.parseInt(req.params.placeId, 10);

    if (!Number.isInteger(userId) || !Number.isInteger(sessionUserId) || sessionUserId !== userId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const result = await pool.query(
      'DELETE FROM user_favorites WHERE user_id = $1 AND place_id = $2 RETURNING id',
      [userId, placeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Favorito no encontrado' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error eliminando favorito:', error);
    res.status(500).json({ error: 'No se pudo eliminar el favorito' });
  }
});

router.get('/api/users/:id/notifications', async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.id, 10);
    const sessionUserId = Number.parseInt(req.header('x-user-id') || '', 10);

    if (!Number.isInteger(userId) || !Number.isInteger(sessionUserId) || sessionUserId !== userId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const result = await pool.query(
      `SELECT id, reservation_id, title, detail, tone, is_read, created_at
       FROM user_notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId]
    );

    const unreadResult = await pool.query(
      'SELECT COUNT(*)::int AS unread_count FROM user_notifications WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );

    res.json({ notifications: result.rows, unreadCount: unreadResult.rows[0].unread_count });
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    res.status(500).json({ error: 'No se pudieron cargar las notificaciones' });
  }
});

router.delete('/api/users/:id/notifications', async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.id, 10);
    const sessionUserId = Number.parseInt(req.header('x-user-id') || '', 10);

    if (!Number.isInteger(userId) || !Number.isInteger(sessionUserId) || sessionUserId !== userId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const result = await pool.query(
      'DELETE FROM user_notifications WHERE user_id = $1 RETURNING id',
      [userId]
    );

    res.json({ deletedCount: result.rowCount ?? result.rows.length });
  } catch (error) {
    console.error('Error limpiando notificaciones:', error);
    res.status(500).json({ error: 'No se pudieron limpiar las notificaciones' });
  }
});

router.put('/api/users/:id/notifications/:notificationId/read', async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.id, 10);
    const notificationId = Number.parseInt(req.params.notificationId, 10);
    const sessionUserId = Number.parseInt(req.header('x-user-id') || '', 10);

    if (!Number.isInteger(userId) || !Number.isInteger(sessionUserId) || sessionUserId !== userId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const result = await pool.query(
      `UPDATE user_notifications
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING id, title, detail, tone, is_read, created_at`,
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    res.json({ notification: result.rows[0] });
  } catch (error) {
    console.error('Error marcando notificación como leída:', error);
    res.status(500).json({ error: 'No se pudo actualizar la notificación' });
  }
});

export default router;

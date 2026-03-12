import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcryptjs from 'bcryptjs';
import pool from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  next();
});

// Ruta de debug
app.get('/api/debug', async (req, res) => {
  try {
    const users = await pool.query('SELECT id, username, email FROM users LIMIT 3');
    res.json({
      status: 'OK',
      database: 'Connected',
      userCount: users.rows.length,
      users: users.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ruta para registrar usuario
app.post('/api/signup', async (req, res) => {
  try {
    const { fullName, email, username, password } = req.body;

    // Validar que todos los campos estén presentes
    if (!fullName || !email || !username || !password) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
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

    // Insertar nuevo usuario (role por defecto user)
    const result = await pool.query(
      'INSERT INTO users (full_name, email, username, password) VALUES ($1, $2, $3, $4) RETURNING id, email, username, role',
      [fullName, email, username, hashedPassword]
    );

    res.status(201).json({
      message: '✅ Usuario registrado exitosamente',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Ruta para iniciar sesión
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validar que ambos campos estén presentes
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    // Buscar el usuario por username o email
    const user = await pool.query(
      'SELECT id, username, password, full_name, email, role FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // Comparar contraseña
    const userData = user.rows[0];
    const isPasswordValid = await bcryptjs.compare(password, userData.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // Login exitoso - retornar información del usuario, incluyendo rol
    res.json({
      message: '✅ Sesión iniciada exitosamente',
      user: {
        id: userData.id,
        username: userData.username,
        fullName: userData.full_name,
        email: userData.email,
        role: userData.role
      }
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Ruta para verificar si el servidor está funcionando
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// middleware simple para chequear admin (se asume rol enviado en request; en producción usar JWT)
function requireAdmin(req, res, next) {
  // para la demo leemos header x-user-role o body (solo si existe)
  const role = req.header('x-user-role') || (req.body && req.body.role);
  console.log(`🔐 Validando admin - Header role: ${req.header('x-user-role')}, Body role: ${req.body?.role || 'N/A'}, Final role: ${role}`);
  if (role === 'admin') {
    return next();
  }
  console.log(`❌ Acceso denegado - Role: ${role}`);
  return res.status(403).json({ error: 'Forbidden: admin only' });
}

// Obtener todos los usuarios (admin)
app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, full_name, email, username, role, active FROM users ORDER BY id');
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Cambiar rol de un usuario (admin)
app.put('/api/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['admin', 'user'].includes(role)) {
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

// Activar / desactivar usuario (admin)
app.put('/api/users/:id/active', requireAdmin, async (req, res) => {
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
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Error al actualizar estado de usuario:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Eliminar usuario (admin)
app.delete('/api/users/:id', requireAdmin, async (req, res) => {
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

// Obtener perfil de un usuario (para la página de datos personales)
app.get('/api/users/:id/profile', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }
    const result = await pool.query(
      'SELECT id, username, full_name, email, role FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Actualizar perfil del usuario (nombre, email, usuario)
app.put('/api/users/:id/profile', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, username } = req.body;

    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    const current = await pool.query(
      'SELECT id, full_name, email, username FROM users WHERE id = $1',
      [userId]
    );
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const existing = current.rows[0];
    const newFullName = full_name !== undefined ? full_name.trim() : existing.full_name;
    const newEmail = email !== undefined ? email.trim() : existing.email;
    const newUsername = username !== undefined ? username.trim() : existing.username;

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

    const update = await pool.query(
      `UPDATE users SET 
        full_name = COALESCE($1, full_name),
        email = COALESCE($2, email),
        username = COALESCE($3, username)
       WHERE id = $4
       RETURNING id, username, full_name, email, role`,
      [newFullName || null, newEmail || null, newUsername || null, userId]
    );

    res.json({ user: update.rows[0] });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Obtener reservas del usuario (header x-user-id)
app.get('/api/reservations', async (req, res) => {
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
      `SELECT id, user_id, hotel, tipo_alojamiento, ubicacion, check_in, check_out, huespedes, estado, created_at
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

// Crear una nueva reserva para un place
app.post('/api/reservations', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(400).json({ error: 'Se requiere el header x-user-id' });
    }
    const uid = parseInt(userId, 10);
    if (isNaN(uid)) {
      return res.status(400).json({ error: 'x-user-id inválido' });
    }

    const { placeId, checkIn, checkOut, huespedes } = req.body || {};
    if (!placeId || !checkIn || !checkOut) {
      return res.status(400).json({ error: 'placeId, checkIn y checkOut son requeridos' });
    }

    const pid = parseInt(placeId, 10);
    if (isNaN(pid)) {
      return res.status(400).json({ error: 'placeId inválido' });
    }

    const placeResult = await pool.query(
      `SELECT id, name, tipo, barrio, ciudad FROM places WHERE id = $1`,
      [pid]
    );
    if (placeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Espacio no encontrado' });
    }
    const place = placeResult.rows[0];

    const ubicacionParts = [];
    if (place.barrio) ubicacionParts.push(place.barrio);
    if (place.ciudad) ubicacionParts.push(place.ciudad);
    const ubicacion = ubicacionParts.join(', ');

    const insert = await pool.query(
      `INSERT INTO reservations (user_id, hotel, tipo_alojamiento, ubicacion, check_in, check_out, huespedes, estado)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 1), 'pendiente')
       RETURNING id, user_id, hotel, tipo_alojamiento, ubicacion, check_in, check_out, huespedes, estado, created_at`,
      [uid, place.name, place.tipo, ubicacion, checkIn, checkOut, huespedes || 1]
    );

    res.status(201).json({ reservation: insert.rows[0] });
  } catch (error) {
    console.error('Error creando reserva:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Listar todas las reservas (admin)
app.get('/api/admin/reservations', requireAdmin, async (_req, res) => {
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

// Actualizar una reserva (admin)
app.put('/api/admin/reservations/:id', requireAdmin, async (req, res) => {
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
       RETURNING id, user_id, hotel, tipo_alojamiento, ubicacion, check_in, check_out, huespedes, estado, active, created_at`,
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
    res.json({ reservation: result.rows[0] });
  } catch (error) {
    console.error('Error actualizando reserva (admin):', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Eliminar una reserva (admin)
app.delete('/api/admin/reservations/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const rid = parseInt(id, 10);
    if (isNaN(rid)) {
      return res.status(400).json({ error: 'ID de reserva inválido' });
    }
    const result = await pool.query('DELETE FROM reservations WHERE id = $1 RETURNING id', [rid]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error eliminando reserva (admin):', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Reservas disponibles públicas para el landing (todas las activas)
app.get('/api/available-reservations', async (_req, res) => {
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

// Lista de espacios (places) para el landing - Requiere autenticación
app.get('/api/places', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    
    // Solo usuarios autenticados pueden ver los espacios publicados
    if (!userId) {
      return res.json({ places: [] });
    }

    const result = await pool.query(
      `SELECT id, name, tipo, barrio, ciudad, capacidad, precio_hora, modalidad, caracteristicas, nivel_ruido
       FROM places
       WHERE active = TRUE
       ORDER BY id ASC`
    );
    res.json({ places: result.rows });
  } catch (error) {
    console.error('Error obteniendo places:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Admin - listar y administrar lugares (places)
app.get('/api/admin/places', requireAdmin, async (_req, res) => {
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

// Admin - crear novo lugar
app.post('/api/admin/places', requireAdmin, async (req, res) => {
  try {
    const { name, tipo, barrio, ciudad, capacidad, precio_hora, modalidad, caracteristicas, nivel_ruido } = req.body;

    if (!name || !tipo) {
      return res.status(400).json({ error: 'Nombre y tipo son requeridos' });
    }

    const result = await pool.query(
      `INSERT INTO places (name, tipo, barrio, ciudad, capacidad, precio_hora, modalidad, caracteristicas, nivel_ruido, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
       RETURNING id, name, tipo, barrio, ciudad, capacidad, precio_hora, modalidad, caracteristicas, nivel_ruido, active`,
      [name, tipo, barrio || null, ciudad || null, capacidad || null, precio_hora || null, modalidad || null, caracteristicas || null, nivel_ruido || null]
    );

    res.status(201).json({ place: result.rows[0] });
  } catch (error) {
    console.error('Error creando lugar:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.put('/api/admin/places/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, tipo, barrio, ciudad, capacidad, precio_hora, modalidad, caracteristicas, active } = req.body || {};
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
         active = COALESCE($9, active)
       WHERE id = $10
       RETURNING id, name, tipo, barrio, ciudad, capacidad, precio_hora, modalidad, caracteristicas, nivel_ruido, active`,
      [
        name || null,
        tipo || null,
        barrio || null,
        ciudad || null,
        capacidad || null,
        typeof precio_hora === 'number' ? precio_hora : null,
        modalidad || null,
        caracteristicas || null,
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

app.delete('/api/admin/places/:id', requireAdmin, async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
});

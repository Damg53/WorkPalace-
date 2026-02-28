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
    const result = await pool.query('SELECT id, full_name, email, username, role FROM users ORDER BY id');
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

app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
});

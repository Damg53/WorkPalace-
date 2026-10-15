import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcryptjs from 'bcryptjs';
import { randomInt, randomUUID } from 'node:crypto';
import pool, { initializationReady } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const normalizeText = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ');
};

const isSafeName = (value) => /^[\p{L}\p{N} .'-]{2,100}$/u.test(value);
const isSafeUsername = (value) => /^[\p{L}\p{N}._-]{3,50}$/u.test(value);
const isSafePassword = (value) => value.length >= 6 && value.length <= 128;
const isSafeEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isValidCardExpiry = (value) => {
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(String(value || ''));
  if (!match) return false;
  const expiry = new Date(2000 + Number(match[2]), Number(match[1]), 0);
  const now = new Date();
  return expiry >= new Date(now.getFullYear(), now.getMonth() + 1, 0);
};
const normalizeColombianPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('57') && digits.length === 12) return `+${digits}`;
  if (digits.length === 10 && digits.startsWith('3')) return `+57${digits}`;
  return '';
};
const maskPhone = (phone) => `${phone.slice(0, 7)}•••${phone.slice(-2)}`;
const maskEmail = (email) => {
  const [name, domain] = String(email).split('@');
  if (!name || !domain) return email;
  return `${name.slice(0, 2)}***@${domain}`;
};
const createOtpCode = () => String(randomInt(0, 1000000)).padStart(6, '0');
const COUPONS = new Set(['BACANO10', 'BIENVENIDO15', 'SEMANA10', 'MES20', 'WORKPALACE5', 'BOF']);
const COUPON_DISCOUNTS = { BACANO10: 10, BIENVENIDO15: 15, SEMANA10: 10, MES20: 20, WORKPALACE5: 5, BOF: 90 };
const otpChallenges = new Map();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
    const fullName = normalizeText(req.body.fullName || '');
    const email = normalizeText(req.body.email || '');
    const username = normalizeText(req.body.username || '');
    const password = String(req.body.password || '');
    const phone = req.body.phone ? normalizeColombianPhone(req.body.phone) : null;

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

    // Insertar nuevo usuario (role por defecto user)
    const result = await pool.query(
      'INSERT INTO users (full_name, email, username, password, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, username, role',
      [fullName, email, username, hashedPassword, phone]
    );

    await pool.query(
      `INSERT INTO user_notifications (user_id, title, detail, tone) VALUES
        ($1, 'Bienvenido a WorkPalace', 'Tu cuenta quedó lista para empezar a reservar.', 'success'),
        ($1, 'Recordatorio', 'Te avisaremos con fechas y cambios importantes de tus reservas.', 'info'),
        ($1, 'Política flexible', 'Puedes cancelar con reembolso hasta 48 horas antes del inicio.', 'warning')`,
      [result.rows[0].id]
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

// Ruta para iniciar sesión
app.post('/api/login', async (req, res) => {
  try {
    const username = normalizeText(req.body.username || '');
    const password = String(req.body.password || '');

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    if (username.length < 3 || username.length > 100) {
      return res.status(400).json({ error: 'Usuario o email inválido' });
    }

    // Buscar el usuario por username o email
    const user = await pool.query(
      'SELECT id, username, password, full_name, email, role, profile_image_url, phone, active, two_factor_enabled FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // Comparar contraseña
    const userData = user.rows[0];
    if (userData.active === false) {
      return res.status(403).json({ error: 'Esta cuenta está desactivada. Contacta al administrador.' });
    }
    const isPasswordValid = await bcryptjs.compare(password, userData.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    if (userData.two_factor_enabled) {
      const challengeId = randomUUID();
      const code = createOtpCode();
      otpChallenges.set(challengeId, {
        code,
        userId: userData.id,
        expiresAt: Date.now() + 10 * 60 * 1000,
        nextSendAt: Date.now() + 30 * 1000,
        attempts: 0,
      });

      try {
        console.log(`[OTP desarrollo] ${userData.email}: ${code}`);
      } catch (error) {
        otpChallenges.delete(challengeId);
        console.error('Error enviando OTP:', error);
        return res.status(502).json({ error: 'No se pudo enviar el código al celular' });
      }

      return res.json({ requiresOtp: true, challengeId, email: maskEmail(userData.email), devCode: code });
    }

    // Las cuentas sin celular conservan el login existente.
    res.json({
      message: '✅ Sesión iniciada exitosamente',
      user: {
        id: userData.id,
        username: userData.username,
        fullName: userData.full_name,
        email: userData.email,
        role: userData.role,
        profileImage: userData.profile_image_url || null
      }
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

async function sendOtpSms(phone, code) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, NODE_ENV } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    if (NODE_ENV === 'production') throw new Error('Faltan credenciales de Twilio');
    console.log(`[OTP desarrollo] ${phone}: ${code}`);
    return;
  }

  const body = new URLSearchParams({
    To: phone,
    From: TWILIO_FROM_NUMBER,
    Body: `Tu código de verificación de WorkPalace es: ${code}. Expira en 10 minutos.`,
  });
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) {
    let details = '';
    try {
      const payload = await response.json();
      details = payload.message || payload.code ? `: ${payload.message || `código ${payload.code}`}` : '';
    } catch {
      details = '';
    }
    throw new Error(`Twilio respondió ${response.status}${details}`);
  }
}

function publicUser(userData) {
  return {
    id: userData.id,
    username: userData.username,
    fullName: userData.full_name,
    email: userData.email,
    role: userData.role,
    profileImage: userData.profile_image_url || null,
  };
}

app.post('/api/login/otp/verify', async (req, res) => {
  try {
    const challengeId = String(req.body.challengeId || '');
    const challenge = otpChallenges.get(challengeId);
    const code = String(req.body.code || '');
    if (!challenge || challenge.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'El código expiró. Solicita uno nuevo.' });
    }
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Código inválido' });
    if (challenge.attempts >= 5) {
      otpChallenges.delete(challengeId);
      return res.status(429).json({ error: 'Demasiados intentos. Inicia sesión nuevamente.' });
    }
    challenge.attempts += 1;
    if (code !== challenge.code) return res.status(401).json({ error: 'Código incorrecto' });

    const result = await pool.query(
      'SELECT id, username, full_name, email, role, profile_image_url, phone, active, two_factor_enabled FROM users WHERE id = $1 AND active = TRUE',
      [challenge.userId]
    );
    otpChallenges.delete(challengeId);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ user: publicUser(result.rows[0]) });
  } catch (error) {
    console.error('Error verificando OTP:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.post('/api/login/otp/resend', async (req, res) => {
  try {
    const challengeId = String(req.body.challengeId || '');
    const challenge = otpChallenges.get(challengeId);
    if (!challenge || challenge.expiresAt < Date.now()) return res.status(400).json({ error: 'La verificación expiró' });
    if (challenge.nextSendAt > Date.now()) return res.status(429).json({ error: 'Espera unos segundos antes de reenviar' });

    const user = await pool.query('SELECT email FROM users WHERE id = $1', [challenge.userId]);
    if (!user.rows[0]?.email) return res.status(400).json({ error: 'La cuenta no tiene correo registrado' });
    challenge.code = createOtpCode();
    challenge.nextSendAt = Date.now() + 30 * 1000;
    challenge.expiresAt = Date.now() + 10 * 60 * 1000;
    console.log(`[OTP desarrollo] ${user.rows[0].email}: ${challenge.code}`);
    res.json({ message: 'Código reenviado', devCode: challenge.code });
  } catch (error) {
    console.error('Error reenviando OTP:', error);
    res.status(502).json({ error: 'No se pudo reenviar el código' });
  }
});

// Ruta para verificar si el servidor está funcionando
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// En producción el rol se resuelve desde la base, no desde un header controlado por el navegador.
async function requireAdmin(req, res, next) {
  try {
    const userId = Number.parseInt(req.header('x-user-id') || '', 10);
    if (!Number.isNaN(userId)) {
      const result = await pool.query('SELECT role, active FROM users WHERE id = $1', [userId]);
      if (result.rows[0]?.role === 'admin' && result.rows[0]?.active !== false) {
        req.adminUserId = userId;
        return next();
      }
    }

    if (process.env.NODE_ENV !== 'production' && (req.header('x-user-role') || req.body?.role) === 'admin') {
      req.adminUserId = null;
      return next();
    }
    return res.status(403).json({ error: 'Forbidden: admin only' });
  } catch (error) {
    console.error('Error validando permisos admin:', error);
    return res.status(500).json({ error: 'No se pudieron validar los permisos' });
  }
}

async function logAdminAction(req, action, entityType, entityId, details = {}) {
  try {
    await pool.query(
      `INSERT INTO admin_audit_logs (admin_user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [req.adminUserId || null, action, entityType, entityId || null, JSON.stringify(details)]
    );
  } catch (error) {
    console.error('Error guardando auditoría admin:', error);
  }
}

async function syncPlaceReservationState(placeId, queryable = pool) {
  if (!placeId) return;
  const activeReservation = await queryable.query(
      `SELECT 1 FROM reservations
       WHERE place_id = $1 AND active = TRUE AND estado IN ('pendiente', 'confirmada')
         AND check_out >= CURRENT_DATE
     LIMIT 1`,
    [placeId]
  );
  await queryable.query(
    'UPDATE places SET active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [activeReservation.rows.length === 0, placeId]
  );
}

async function findCoupon(code) {
  try {
    const result = await pool.query(
      `SELECT code, discount, max_uses, used_count, starts_at, ends_at, active
       FROM coupons
       WHERE code = $1
         AND active = TRUE
         AND (starts_at IS NULL OR starts_at <= CURRENT_DATE)
         AND (ends_at IS NULL OR ends_at >= CURRENT_DATE)
         AND (max_uses IS NULL OR used_count < max_uses)`,
      [code]
    );
    if (result.rows[0]) return result.rows[0];
    const configured = await pool.query('SELECT 1 FROM coupons WHERE code = $1 LIMIT 1', [code]);
    if (configured.rows.length > 0) return null;
    return COUPONS.has(code)
      ? { code, discount: COUPON_DISCOUNTS[code], max_uses: null, used_count: 0, active: true }
      : null;
  } catch (_error) {
    return COUPONS.has(code) ? { code, discount: COUPON_DISCOUNTS[code], max_uses: null, used_count: 0, active: true } : null;
  }
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

app.get('/api/admin/coupons', requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, code, label, discount, max_uses, used_count, starts_at, ends_at, active, created_at
       FROM coupons ORDER BY created_at DESC, id DESC`
    );
    res.json({ coupons: result.rows });
  } catch (error) {
    console.error('Error obteniendo cupones:', error);
    res.status(500).json({ error: 'No se pudieron cargar los cupones' });
  }
});

app.post('/api/admin/coupons', requireAdmin, async (req, res) => {
  try {
    const code = String(req.body?.code || '').trim().toUpperCase();
    const label = normalizeText(req.body?.label || '');
    const discount = Number(req.body?.discount);
    const maxUses = req.body?.maxUses === '' || req.body?.maxUses == null ? null : Number(req.body.maxUses);
    if (!/^[A-Z0-9_-]{3,50}$/.test(code) || !label || !Number.isInteger(discount) || discount < 1 || discount > 100) {
      return res.status(400).json({ error: 'Código, descripción y descuento válido son requeridos' });
    }
    const result = await pool.query(
      `INSERT INTO coupons (code, label, discount, max_uses, starts_at, ends_at, active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING id, code, label, discount, max_uses, used_count, starts_at, ends_at, active, created_at`,
      [code, label, discount, Number.isInteger(maxUses) && maxUses > 0 ? maxUses : null, req.body.startsAt || null, req.body.endsAt || null]
    );
    await logAdminAction(req, 'create', 'coupon', result.rows[0].id, { code });
    res.status(201).json({ coupon: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Ese código de cupón ya existe' });
    console.error('Error creando cupón:', error);
    res.status(500).json({ error: 'No se pudo crear el cupón' });
  }
});

app.put('/api/admin/coupons/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const result = await pool.query(
      `UPDATE coupons SET label = COALESCE($1, label), discount = COALESCE($2, discount),
       max_uses = $3, starts_at = $4, ends_at = $5, active = COALESCE($6, active), updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
       RETURNING id, code, label, discount, max_uses, used_count, starts_at, ends_at, active, created_at`,
      [req.body?.label || null, Number.isInteger(req.body?.discount) ? req.body.discount : null,
        req.body?.maxUses === '' ? null : (req.body?.maxUses ?? null), req.body?.startsAt || null, req.body?.endsAt || null,
        typeof req.body?.active === 'boolean' ? req.body.active : null, id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Cupón no encontrado' });
    await logAdminAction(req, 'update', 'coupon', id, req.body);
    res.json({ coupon: result.rows[0] });
  } catch (error) {
    console.error('Error actualizando cupón:', error);
    res.status(500).json({ error: 'No se pudo actualizar el cupón' });
  }
});

app.delete('/api/admin/coupons/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const result = await pool.query('DELETE FROM coupons WHERE id = $1 RETURNING id, code', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Cupón no encontrado' });
    await logAdminAction(req, 'delete', 'coupon', id, result.rows[0]);
    res.status(204).send();
  } catch (error) {
    console.error('Error eliminando cupón:', error);
    res.status(500).json({ error: 'No se pudo eliminar el cupón' });
  }
});

app.get('/api/admin/audit', requireAdmin, async (_req, res) => {
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

app.get('/api/admin/blocks', requireAdmin, async (_req, res) => {
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

app.post('/api/admin/blocks', requireAdmin, async (req, res) => {
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

app.delete('/api/admin/blocks/:id', requireAdmin, async (req, res) => {
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
      'SELECT id, username, full_name, email, role, profile_image_url, phone, active, two_factor_enabled FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    if (result.rows[0].active === false) {
      return res.status(403).json({ error: 'Esta cuenta está desactivada.' });
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
    const { full_name, email, username, profile_image_url, phone, two_factor_enabled } = req.body;

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
    const newProfileImage = profile_image_url !== undefined ? String(profile_image_url).trim() || null : existing.profile_image_url;
    const newPhone = phone !== undefined ? normalizeColombianPhone(phone) : existing.phone;
    const newTwoFactor = typeof two_factor_enabled === 'boolean'
      ? two_factor_enabled
      : existing.two_factor_enabled;
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

    const update = await pool.query(
      `UPDATE users SET 
        full_name = COALESCE($1, full_name),
        email = COALESCE($2, email),
        username = COALESCE($3, username),
        profile_image_url = COALESCE($4, profile_image_url),
        phone = $5,
        two_factor_enabled = $6
      WHERE id = $7
       RETURNING id, username, full_name, email, role, profile_image_url, phone, two_factor_enabled`,
      [newFullName || null, newEmail || null, newUsername || null, newProfileImage, newPhone || null, newTwoFactor, userId]
    );

    res.json({ user: update.rows[0] });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.get('/api/users/:id/favorites', async (req, res) => {
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

app.post('/api/users/:id/favorites', async (req, res) => {
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

app.delete('/api/users/:id/favorites/:placeId', async (req, res) => {
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

app.get('/api/users/:id/notifications', async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.id, 10);
    const sessionUserId = Number.parseInt(req.header('x-user-id') || '', 10);

    if (!Number.isInteger(userId) || !Number.isInteger(sessionUserId) || sessionUserId !== userId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const result = await pool.query(
      `SELECT id, title, detail, tone, is_read, created_at
       FROM user_notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId]
    );

    res.json({ notifications: result.rows });
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    res.status(500).json({ error: 'No se pudieron cargar las notificaciones' });
  }
});

app.put('/api/users/:id/notifications/:notificationId/read', async (req, res) => {
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

app.post('/api/coupons/validate', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    const uid = Number.parseInt(userId || '', 10);
    const couponCode = typeof req.body?.couponCode === 'string'
      ? req.body.couponCode.trim().toUpperCase()
      : '';

    if (!userId || Number.isNaN(uid)) {
      return res.status(400).json({ error: 'Usuario no identificado.' });
    }
    const coupon = await findCoupon(couponCode);
    if (!coupon) {
      return res.status(400).json({ error: 'El cupón no es válido.' });
    }

    const previousUse = await pool.query(
      'SELECT 1 FROM reservations WHERE user_id = $1 AND coupon_code = $2 LIMIT 1',
      [uid, couponCode]
    );
    if (previousUse.rows.length > 0) {
      return res.status(409).json({ error: 'Ya utilizaste este cupón en otra compra.' });
    }

    return res.json({ valid: true, coupon: { code: coupon.code, discount: coupon.discount, label: coupon.label || '' } });
  } catch (error) {
    console.error('Error validando cupón:', error);
    return res.status(500).json({ error: 'No se pudo validar el cupón.' });
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
      `SELECT id, user_id, hotel, tipo_alojamiento, ubicacion, check_in, check_out, huespedes, estado, coupon_code, created_at
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
  let client;
  let inTransaction = false;
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(400).json({ error: 'Se requiere el header x-user-id' });
    }
    const uid = parseInt(userId, 10);
    if (isNaN(uid)) {
      return res.status(400).json({ error: 'x-user-id inválido' });
    }

    const { placeId, checkIn, checkOut, huespedes, payment } = req.body || {};
    const couponCode = typeof req.body?.couponCode === 'string'
      ? req.body.couponCode.trim().toUpperCase()
      : null;
    if (!placeId || !checkIn || !checkOut) {
      return res.status(400).json({ error: 'placeId, checkIn y checkOut son requeridos' });
    }
    if (payment?.method === 'card' && !isValidCardExpiry(payment.exp)) {
      return res.status(400).json({ error: 'La tarjeta está vencida o la fecha no es válida.' });
    }

    if (couponCode) {
      const coupon = await findCoupon(couponCode);
      if (!coupon) {
        return res.status(400).json({ error: 'El cupón no es válido.' });
      }
    }

    if (couponCode) {
      const previousUse = await pool.query('SELECT 1 FROM reservations WHERE user_id = $1 AND coupon_code = $2 LIMIT 1', [uid, couponCode]);
      if (previousUse.rows.length > 0) return res.status(409).json({ error: 'Ya utilizaste este cupón en otra compra.' });
    }

    const pid = parseInt(placeId, 10);
    if (isNaN(pid)) return res.status(400).json({ error: 'placeId inválido' });

    client = await pool.connect();
    await client.query('BEGIN');
    inTransaction = true;

    const placeResult = await client.query(
      `SELECT id, name, tipo, barrio, ciudad, active FROM places WHERE id = $1 FOR UPDATE`,
      [pid]
    );
    if (placeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      inTransaction = false;
      return res.status(404).json({ error: 'Espacio no encontrado' });
    }
    if (placeResult.rows[0].active === false) {
      await client.query('ROLLBACK');
      inTransaction = false;
      return res.status(409).json({ error: 'El espacio no está disponible para las fechas seleccionadas.' });
    }
    const place = placeResult.rows[0];

    const existingReservation = await client.query(
      `SELECT id FROM reservations
       WHERE place_id = $1 AND active = TRUE AND estado IN ('pendiente', 'confirmada')
         AND check_out >= $2::date AND check_in <= $3::date
       LIMIT 1`,
      [pid, checkIn, checkOut]
    );
    if (existingReservation.rows.length > 0) {
      await client.query('ROLLBACK');
      inTransaction = false;
      return res.status(409).json({ error: 'El espacio no está disponible para las fechas seleccionadas.' });
    }

    const blocked = await client.query(
      `SELECT id FROM place_blocks WHERE place_id = $1 AND starts_at <= $3::date AND ends_at >= $2::date LIMIT 1`,
      [pid, checkIn, checkOut]
    );
    if (blocked.rows.length > 0) {
      await client.query('ROLLBACK');
      inTransaction = false;
      return res.status(409).json({ error: 'El espacio no está disponible para las fechas seleccionadas.' });
    }

    const ubicacionParts = [];
    if (place.barrio) ubicacionParts.push(place.barrio);
    if (place.ciudad) ubicacionParts.push(place.ciudad);
    const ubicacion = ubicacionParts.join(', ');

    const insert = await client.query(
      `INSERT INTO reservations (user_id, hotel, tipo_alojamiento, ubicacion, check_in, check_out, huespedes, estado, place_id, coupon_code)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 1), 'pendiente', $8, $9)
       RETURNING id, user_id, hotel, tipo_alojamiento, ubicacion, check_in, check_out, huespedes, estado, place_id, coupon_code, created_at`,
      [uid, place.name, place.tipo, ubicacion, checkIn, checkOut, huespedes || 1, pid, couponCode]
    );

    if (couponCode) await client.query('UPDATE coupons SET used_count = used_count + 1, updated_at = CURRENT_TIMESTAMP WHERE code = $1', [couponCode]);
    await client.query('COMMIT');
    inTransaction = false;

    res.status(201).json({ reservation: insert.rows[0] });
  } catch (error) {
    if (client && inTransaction) await client.query('ROLLBACK');
    if (error.code === '23505' && error.constraint === 'idx_reservations_user_coupon') {
      return res.status(409).json({ error: 'Ya utilizaste este cupón en otra compra.' });
    }
    console.error('Error creando reserva:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  } finally {
    if (client) client.release();
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
      RETURNING id, user_id, hotel, tipo_alojamiento, ubicacion, check_in, check_out, huespedes, estado, active, place_id, created_at`,
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
    if (['completada', 'cancelada'].includes(result.rows[0].estado)) {
      await pool.query(
        'UPDATE places SET active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [result.rows[0].place_id]
      );
    } else {
      await syncPlaceReservationState(result.rows[0].place_id);
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
    const result = await pool.query('DELETE FROM reservations WHERE id = $1 RETURNING id, place_id', [rid]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }
    await syncPlaceReservationState(result.rows[0].place_id);
    res.status(204).send();
  } catch (error) {
    console.error('Error eliminando reserva (admin):', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Cancelar una reserva (usuario propietario)
app.delete('/api/reservations/:id', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(400).json({ error: 'Se requiere el header x-user-id' });
    }
    const uid = parseInt(userId, 10);
    if (isNaN(uid)) {
      return res.status(400).json({ error: 'x-user-id inválido' });
    }

    const { id } = req.params;
    const rid = parseInt(id, 10);
    if (isNaN(rid)) {
      return res.status(400).json({ error: 'ID de reserva inválido' });
    }

    // Verificar que la reservación pertenece al usuario
    const reserva = await pool.query(
      'SELECT id, user_id, place_id FROM reservations WHERE id = $1',
      [rid]
    );
    if (reserva.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    const reservationData = reserva.rows[0];
    if (reservationData.user_id !== uid) {
      return res.status(403).json({ error: 'No tienes permiso para cancelar esta reserva' });
    }

    // Actualizar estado a cancelada
    const updated = await pool.query(
      'UPDATE reservations SET estado = $1 WHERE id = $2 RETURNING id, user_id, hotel, tipo_alojamiento, ubicacion, check_in, check_out, huespedes, estado, created_at',
      ['cancelada', rid]
    );

    // Reactivar el lugar si existe
    await syncPlaceReservationState(reservationData.place_id);

    res.json({ reservation: updated.rows[0], message: '✅ Reserva cancelada exitosamente' });
  } catch (error) {
    console.error('Error cancelando reserva:', error);
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

    const requestedDate = typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
      ? req.query.date
      : null;
    const result = await pool.query(
            `SELECT p.id, p.name, p.tipo, p.barrio, p.ciudad, p.capacidad, p.precio_hora, p.modalidad, p.caracteristicas, p.nivel_ruido, p.image_url,
              p.active AND block.id IS NULL AND reservation.id IS NULL AS active,
              COALESCE(block.reason, CASE WHEN reservation.id IS NOT NULL THEN 'Reserva confirmada' END) AS unavailable_reason,
              COALESCE(block.ends_at + INTERVAL '1 day', reservation.check_out + INTERVAL '1 day') AS available_from
       FROM places p
       LEFT JOIN LATERAL (
         SELECT id, reason, ends_at
         FROM place_blocks
         WHERE place_id = p.id
           AND $1::date BETWEEN starts_at AND ends_at
         ORDER BY ends_at ASC, id ASC
         LIMIT 1
       ) block ON TRUE
       LEFT JOIN LATERAL (
         SELECT id, check_out
         FROM reservations
         WHERE place_id = p.id
           AND active = TRUE
           AND estado IN ('pendiente', 'confirmada')
           AND check_out >= $1::date
         ORDER BY check_out DESC, id DESC
         LIMIT 1
       ) reservation ON TRUE
       WHERE p.active = TRUE OR reservation.id IS NOT NULL
      ORDER BY p.id ASC`
      , [requestedDate || new Date().toISOString().slice(0, 10)]
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

// Admin - crear nuevo lugar
app.post('/api/admin/places', requireAdmin, async (req, res) => {
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

app.put('/api/admin/places/:id', requireAdmin, async (req, res) => {
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

initializationReady.then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  });
});

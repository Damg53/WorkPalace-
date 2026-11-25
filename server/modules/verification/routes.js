import { Router } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import bcryptjs from 'bcryptjs';
import pool from '../../db.js';
import { normalizeText } from '../../shared/validation.js';
import { getProfileImageUrl } from '../../shared/neon-storage.js';
import {
  createTotpUri,
  decryptTotpSecret,
  encryptTotpSecret,
  findTotpStep,
  generateTotpSecret,
} from './totp.js';
import {
  getLoginFailureState,
  getNextLoginLockout,
  normalizeLoginAttemptState,
} from './login-lockout-policy.js';

const router = Router();
const otpChallenges = new Map();
const authenticatorRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => {
    const challengeId = String(req.body?.challengeId || '');
    const userId = parseUserId(req.params.id) ?? otpChallenges.get(challengeId)?.userId;
    return userId ? `account:${userId}` : `ip:${ipKeyGenerator(req.ip || '127.0.0.1')}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos para esta cuenta. Espera antes de volver a intentarlo.' },
});

function parseUserId(value) {
  const userId = Number(value);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

function verifyPassword(password, hash) {
  return bcryptjs.compare(String(password || ''), hash);
}

async function publicUser(userData) {
  return {
    id: userData.id,
    username: userData.username,
    fullName: userData.full_name,
    email: userData.email,
    role: userData.role,
    profileImage: await getProfileImageUrl(userData.profile_image_url),
  };
}

async function getLoginAttemptState(userId, ipHash) {
  const client = await pool.connect();
  let inTransaction = false;
  try {
    await client.query('BEGIN');
    inTransaction = true;
    await client.query(
      `INSERT INTO login_attempts (user_id, ip_hash)
       VALUES ($1, $2)
       ON CONFLICT (user_id, ip_hash) DO NOTHING`,
      [userId, ipHash]
    );
    let result = await client.query(
      `SELECT failed_attempts, attempt_limit, lockout_minutes, locked_until,
              locked_until > CURRENT_TIMESTAMP AS is_locked
       FROM login_attempts
       WHERE user_id = $1 AND ip_hash = $2
       FOR UPDATE`,
      [userId, ipHash]
    );
    let state = normalizeLoginAttemptState(result.rows[0]);
    if (state.lockedUntil && !state.isLocked) {
      const next = getNextLoginLockout(state.attemptLimit, state.lockoutMinutes);
      result = await client.query(
        `UPDATE login_attempts
         SET failed_attempts = 0, attempt_limit = $3, lockout_minutes = $4,
             locked_until = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND ip_hash = $2
         RETURNING failed_attempts, attempt_limit, lockout_minutes, locked_until,
                   FALSE AS is_locked`,
        [userId, ipHash, next.attemptLimit, next.lockoutMinutes]
      );
      state = normalizeLoginAttemptState(result.rows[0]);
    }
    await client.query('COMMIT');
    inTransaction = false;
    return state;
  } catch (error) {
    if (inTransaction) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function recordLoginFailure(userId, ipHash) {
  const client = await pool.connect();
  let inTransaction = false;
  try {
    await client.query('BEGIN');
    inTransaction = true;
    await client.query(
      `INSERT INTO login_attempts (user_id, ip_hash)
       VALUES ($1, $2)
       ON CONFLICT (user_id, ip_hash) DO NOTHING`,
      [userId, ipHash]
    );
    let result = await client.query(
      `SELECT failed_attempts, attempt_limit, lockout_minutes, locked_until,
              locked_until > CURRENT_TIMESTAMP AS is_locked
       FROM login_attempts
       WHERE user_id = $1 AND ip_hash = $2
       FOR UPDATE`,
      [userId, ipHash]
    );
    let state = normalizeLoginAttemptState(result.rows[0]);
    if (state.isLocked) {
      await client.query('COMMIT');
      inTransaction = false;
      return state;
    }
    if (state.lockedUntil) {
      const next = getNextLoginLockout(state.attemptLimit, state.lockoutMinutes);
      result = await client.query(
        `UPDATE login_attempts
         SET failed_attempts = 0, attempt_limit = $3, lockout_minutes = $4,
             locked_until = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND ip_hash = $2
         RETURNING failed_attempts, attempt_limit, lockout_minutes, locked_until,
                   FALSE AS is_locked`,
        [userId, ipHash, next.attemptLimit, next.lockoutMinutes]
      );
      state = normalizeLoginAttemptState(result.rows[0]);
    }
    const failure = getLoginFailureState(state);
    result = await client.query(
      `UPDATE login_attempts
       SET failed_attempts = $3,
           locked_until = CASE
             WHEN $4::smallint IS NULL THEN NULL
             ELSE CURRENT_TIMESTAMP + ($4::smallint * INTERVAL '1 minute')
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND ip_hash = $2
       RETURNING failed_attempts, attempt_limit, lockout_minutes, locked_until,
                 locked_until > CURRENT_TIMESTAMP AS is_locked`,
      [userId, ipHash, failure.failedAttempts, failure.lockedForMinutes]
    );
    await client.query('COMMIT');
    inTransaction = false;
    return normalizeLoginAttemptState(result.rows[0]);
  } catch (error) {
    if (inTransaction) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function respondLoginLocked(res, lockedUntil) {
  const retryAfterSeconds = Math.max(1, Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 1000));
  const retryAfterMinutes = Math.ceil(retryAfterSeconds / 60);
  const waitHours = Math.ceil(retryAfterMinutes / 60);
  const waitText = retryAfterMinutes >= 60
    ? `${waitHours} ${waitHours === 1 ? 'hora' : 'horas'}`
    : `${retryAfterMinutes} ${retryAfterMinutes === 1 ? 'minuto' : 'minutos'}`;
  res.set('Retry-After', String(retryAfterSeconds));
  return res.status(429).json({
    error: `Demasiados intentos. Espera ${waitText} antes de volver a iniciar sesión.`,
  });
}

router.post('/api/login', async (req, res) => {
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

    const userData = user.rows[0];
    if (userData.active === false) {
      return res.status(403).json({ error: 'Esta cuenta está desactivada. Contacta al administrador.' });
    }
    const ipHash = createHash('sha256')
      .update(String(req.ip || req.socket.remoteAddress || 'unknown'))
      .digest('hex');
    let attemptState = await getLoginAttemptState(userData.id, ipHash);
    if (attemptState.isLocked) return respondLoginLocked(res, attemptState.lockedUntil);

    const isPasswordValid = await bcryptjs.compare(password, userData.password);

    if (!isPasswordValid) {
      attemptState = await recordLoginFailure(userData.id, ipHash);
      if (attemptState.isLocked) return respondLoginLocked(res, attemptState.lockedUntil);
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    await pool.query(
      'DELETE FROM login_attempts WHERE user_id = $1',
      [userData.id]
    );

    if (userData.two_factor_enabled) {
      const challengeId = randomUUID();
      otpChallenges.set(challengeId, {
        userId: userData.id,
        expiresAt: Date.now() + 10 * 60 * 1000,
        attempts: 0,
      });

      return res.json({ requiresOtp: true, challengeId, method: 'authenticator' });
    }

    res.json({
      message: '✅ Sesión iniciada exitosamente',
      user: {
        id: userData.id,
        username: userData.username,
        fullName: userData.full_name,
        email: userData.email,
        role: userData.role,
        profileImage: await getProfileImageUrl(userData.profile_image_url)
      }
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.post('/api/login/otp/verify', authenticatorRateLimit, async (req, res) => {
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

    const result = await pool.query(
      'SELECT id, username, full_name, email, role, profile_image_url, phone, totp_secret_encrypted FROM users WHERE id = $1 AND active = TRUE AND two_factor_enabled = TRUE',
      [challenge.userId]
    );
    if (result.rows.length === 0 || !result.rows[0].totp_secret_encrypted) {
      otpChallenges.delete(challengeId);
      return res.status(401).json({ error: 'No se pudo completar la verificación. Inicia sesión nuevamente.' });
    }

    const user = result.rows[0];
    const secret = decryptTotpSecret(user.totp_secret_encrypted);
    const step = findTotpStep(secret, code);
    if (step === null) return res.status(401).json({ error: 'Código incorrecto o vencido.' });

    const consumed = await pool.query(
      `UPDATE users SET totp_last_step = $1
       WHERE id = $2 AND active = TRUE AND two_factor_enabled = TRUE
         AND (totp_last_step IS NULL OR totp_last_step < $1)
       RETURNING id`,
      [step, user.id]
    );
    if (consumed.rows.length === 0) return res.status(401).json({ error: 'Este código ya fue utilizado. Espera uno nuevo.' });

    otpChallenges.delete(challengeId);
    res.json({ user: await publicUser(user) });
  } catch (error) {
    console.error('Error verificando OTP:', error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Error en el servidor' });
  }
});

router.post('/api/users/:id/totp/setup', authenticatorRateLimit, async (req, res) => {
  try {
    const userId = parseUserId(req.params.id);
    const password = String(req.body.password || '');
    if (!userId || !password) return res.status(400).json({ error: 'ID de usuario y contraseña son requeridos.' });

    const result = await pool.query(
      'SELECT id, email, password, active, two_factor_enabled FROM users WHERE id = $1',
      [userId]
    );
    const user = result.rows[0];
    if (!user || user.active === false) return res.status(404).json({ error: 'Usuario no encontrado.' });
    if (!await verifyPassword(password, user.password)) return res.status(401).json({ error: 'La contraseña es incorrecta.' });
    if (user.two_factor_enabled) return res.status(409).json({ error: 'La autenticación de dos pasos ya está activada.' });

    const secret = generateTotpSecret();
    const pendingSecret = encryptTotpSecret(secret);
    const updated = await pool.query(
      `UPDATE users SET totp_pending_secret_encrypted = $1,
         totp_pending_expires_at = NOW() + INTERVAL '10 minutes'
       WHERE id = $2 AND two_factor_enabled = FALSE`,
      [pendingSecret, userId]
    );
    if (!updated.rowCount) return res.status(409).json({ error: 'La configuración cambió. Vuelve a intentarlo.' });
    res.json({
      secret: secret.match(/.{1,4}/g).join(' '),
      otpauthUrl: createTotpUri(secret, user.email),
      expiresInSeconds: 600,
    });
  } catch (error) {
    console.error('Error iniciando configuración TOTP:', error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'No se pudo iniciar la configuración.' });
  }
});

router.post('/api/users/:id/totp/verify-setup', authenticatorRateLimit, async (req, res) => {
  try {
    const userId = parseUserId(req.params.id);
    const code = String(req.body.code || '');
    if (!userId || !/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Ingresa un código válido de seis dígitos.' });

    const result = await pool.query(
      `SELECT totp_pending_secret_encrypted FROM users
       WHERE id = $1 AND active = TRUE AND two_factor_enabled = FALSE
         AND totp_pending_secret_encrypted IS NOT NULL AND totp_pending_expires_at > NOW()`,
      [userId]
    );
    const encryptedSecret = result.rows[0]?.totp_pending_secret_encrypted;
    if (!encryptedSecret) return res.status(400).json({ error: 'La configuración expiró. Vuelve a generar el código QR.' });

    const secret = decryptTotpSecret(encryptedSecret);
    const step = findTotpStep(secret, code);
    if (step === null) return res.status(401).json({ error: 'Código incorrecto o vencido.' });

    const enabled = await pool.query(
      `UPDATE users SET
         two_factor_enabled = TRUE,
         totp_secret_encrypted = totp_pending_secret_encrypted,
         totp_pending_secret_encrypted = NULL,
         totp_pending_expires_at = NULL,
         totp_last_step = $1
       WHERE id = $2 AND active = TRUE AND two_factor_enabled = FALSE
         AND totp_pending_secret_encrypted = $3 AND totp_pending_expires_at > NOW()
       RETURNING two_factor_enabled`,
      [step, userId, encryptedSecret]
    );
    if (!enabled.rows.length) return res.status(409).json({ error: 'La configuración expiró o cambió. Vuelve a intentarlo.' });
    res.json({ two_factor_enabled: true });
  } catch (error) {
    console.error('Error verificando configuración TOTP:', error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'No se pudo confirmar la configuración.' });
  }
});

router.post('/api/users/:id/totp/disable', authenticatorRateLimit, async (req, res) => {
  try {
    const userId = parseUserId(req.params.id);
    const password = String(req.body.password || '');
    const code = String(req.body.code || '');
    if (!userId || !password || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'ID, contraseña y código de seis dígitos son requeridos.' });
    }

    const result = await pool.query(
      `SELECT id, password, totp_secret_encrypted FROM users
       WHERE id = $1 AND active = TRUE AND two_factor_enabled = TRUE`,
      [userId]
    );
    const user = result.rows[0];
    if (!user || !user.totp_secret_encrypted) return res.status(409).json({ error: 'La autenticación de dos pasos no está activada.' });
    if (!await verifyPassword(password, user.password)) return res.status(401).json({ error: 'La contraseña es incorrecta.' });
    const secret = decryptTotpSecret(user.totp_secret_encrypted);
    const step = findTotpStep(secret, code);
    if (step === null) return res.status(401).json({ error: 'Código incorrecto o vencido.' });

    const disabled = await pool.query(
      `UPDATE users SET two_factor_enabled = FALSE,
         totp_secret_encrypted = NULL,
         totp_pending_secret_encrypted = NULL,
         totp_pending_expires_at = NULL,
         totp_last_step = NULL
       WHERE id = $1 AND two_factor_enabled = TRUE
         AND totp_secret_encrypted = $2 AND (totp_last_step IS NULL OR totp_last_step < $3)
       RETURNING two_factor_enabled`,
      [userId, user.totp_secret_encrypted, step]
    );
    if (!disabled.rows.length) return res.status(401).json({ error: 'Este código ya fue utilizado. Espera uno nuevo.' });
    res.json({ two_factor_enabled: false });
  } catch (error) {
    console.error('Error desactivando TOTP:', error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'No se pudo desactivar la verificación.' });
  }
});

export default router;

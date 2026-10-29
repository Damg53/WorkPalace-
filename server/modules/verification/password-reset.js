import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import bcryptjs from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import pool from '../../db.js';
import { isSafeEmail } from '../../shared/validation.js';

const router = Router();
const RESET_TOKEN_LIFETIME_MINUTES = 15;
const RESET_EMAIL_COOLDOWN_SECONDS = 60;
const PASSWORD_RESET_TEST_RECIPIENT = 'diego.moralesg@comunidad.iush.edu.co';
const genericRequestMessage = 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.';
const passwordResetTestModeSetting = process.env.PASSWORD_RESET_TEST_MODE?.trim().toLowerCase();

if (passwordResetTestModeSetting && !['true', 'false'].includes(passwordResetTestModeSetting)) {
  throw new Error('PASSWORD_RESET_TEST_MODE debe ser true o false.');
}

if (
  passwordResetTestModeSetting === 'true'
  && process.env.NODE_ENV?.trim().toLowerCase() === 'production'
) {
  throw new Error('PASSWORD_RESET_TEST_MODE no puede activarse en producción.');
}

const passwordResetTestMode = passwordResetTestModeSetting === 'true';
const forgotPasswordRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' },
});

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

async function sendPasswordResetEmail(email, token) {
  const { RESEND_API_KEY, RESEND_FROM_EMAIL, FRONTEND_URL } = process.env;
  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL || !FRONTEND_URL) {
    throw new Error('Faltan RESEND_API_KEY, RESEND_FROM_EMAIL o FRONTEND_URL en la configuración del servidor.');
  }

  const frontendUrl = new URL(FRONTEND_URL);
  if (!['http:', 'https:'].includes(frontendUrl.protocol)) {
    throw new Error('FRONTEND_URL debe usar HTTP o HTTPS.');
  }
  const resetUrl = new URL('/reset-password', frontendUrl);
  resetUrl.searchParams.set('token', token);
  const safeResetUrl = escapeHtml(resetUrl.toString());

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [passwordResetTestMode ? PASSWORD_RESET_TEST_RECIPIENT : email],
      subject: 'Restablece tu contraseña de WorkPalace',
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172554"><h1>Restablece tu contraseña</h1><p>Recibimos una solicitud para cambiar la contraseña de tu cuenta de WorkPalace.</p><p><a href="${safeResetUrl}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#5b63df;color:#fff;text-decoration:none">Crear nueva contraseña</a></p><p>El enlace vence en ${RESET_TOKEN_LIFETIME_MINUTES} minutos y solo puede usarse una vez.</p><p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p></div>`,
      text: `Para restablecer tu contraseña de WorkPalace, abre este enlace: ${resetUrl}\n\nEl enlace vence en ${RESET_TOKEN_LIFETIME_MINUTES} minutos y solo puede usarse una vez. Si no solicitaste este cambio, ignora este mensaje.`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend respondió ${response.status}.`);
  }
}

router.post('/api/forgot-password', forgotPasswordRateLimit, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  if (!isSafeEmail(email)) {
    return res.status(400).json({ error: 'Ingresa un correo electrónico válido.' });
  }

  try {
    const userResult = await pool.query(
      'SELECT id, email FROM users WHERE LOWER(email) = LOWER($1) AND active = TRUE',
      [email]
    );
    if (userResult.rows.length === 0) {
      return res.json({ message: genericRequestMessage });
    }

    const user = userResult.rows[0];
    const recentToken = await pool.query(
      `SELECT 1 FROM password_reset_tokens
       WHERE user_id = $1 AND created_at > CURRENT_TIMESTAMP - ($2 * INTERVAL '1 second')
       LIMIT 1`,
      [user.id, RESET_EMAIL_COOLDOWN_SECONDS]
    );
    if (recentToken.rows.length > 0) {
      return res.json({ message: genericRequestMessage });
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP + ($3 * INTERVAL '1 minute'))`,
      [user.id, tokenHash, RESET_TOKEN_LIFETIME_MINUTES]
    );

    try {
      await sendPasswordResetEmail(user.email, token);
    } catch (error) {
      await pool.query('DELETE FROM password_reset_tokens WHERE token_hash = $1', [tokenHash]);
      console.error('Error enviando el correo de restablecimiento con Resend:', error.message);
      return res.json({ message: genericRequestMessage });
    }

    await pool.query(
      `DELETE FROM password_reset_tokens
       WHERE user_id = $1 AND token_hash <> $2 AND used_at IS NULL`,
      [user.id, tokenHash]
    );
    return res.json({ message: genericRequestMessage });
  } catch (error) {
    console.error('Error creando la solicitud de restablecimiento de contraseña:', error);
    return res.status(500).json({ error: 'No se pudo procesar la solicitud. Intenta de nuevo más tarde.' });
  }
});

router.post('/api/reset-password/validate', async (req, res) => {
  const token = typeof req.body?.token === 'string' ? req.body.token : '';

  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return res.status(400).json({ error: 'El enlace de recuperación no es válido o ya venció.' });
  }

  try {
    const tokenResult = await pool.query(
      `SELECT 1 FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
       LIMIT 1`,
      [hashToken(token)]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'El enlace de recuperación no es válido o ya venció.' });
    }

    return res.json({ valid: true });
  } catch (error) {
    console.error('Error validando el enlace de restablecimiento de contraseña:', error);
    return res.status(500).json({ error: 'No se pudo validar el enlace. Intenta de nuevo más tarde.' });
  }
});

router.post('/api/reset-password', async (req, res) => {
  const token = typeof req.body?.token === 'string' ? req.body.token : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return res.status(400).json({ error: 'El enlace de recuperación no es válido o ya venció.' });
  }
  if (password.length < 6 || password.length > 128) {
    return res.status(400).json({ error: 'La contraseña debe tener entre 6 y 128 caracteres.' });
  }

  let client;
  let transactionStarted = false;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    transactionStarted = true;
    const tokenResult = await client.query(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
       FOR UPDATE`,
      [hashToken(token)]
    );
    if (tokenResult.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(400).json({ error: 'El enlace de recuperación no es válido o ya venció.' });
    }

    const resetToken = tokenResult.rows[0];
    const hashedPassword = await bcryptjs.hash(password, 10);
    await client.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, resetToken.user_id]
    );
    await client.query(
      'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [resetToken.id]
    );
    await client.query(
      `UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND id <> $2 AND used_at IS NULL`,
      [resetToken.user_id, resetToken.id]
    );
    await client.query('COMMIT');
    transactionStarted = false;
    return res.json({ message: 'Tu contraseña fue actualizada. Ya puedes iniciar sesión.' });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error revirtiendo el restablecimiento de contraseña:', rollbackError);
      }
    }
    console.error('Error restableciendo contraseña:', error);
    return res.status(500).json({ error: 'No se pudo actualizar la contraseña.' });
  } finally {
    client?.release();
  }
});

export default router;

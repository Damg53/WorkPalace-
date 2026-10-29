import { Router } from 'express';
import bcryptjs from 'bcryptjs';
import { randomInt, randomUUID } from 'node:crypto';
import pool from '../../db.js';
import { normalizeText } from '../../shared/validation.js';

const router = Router();
const otpChallenges = new Map();

const createOtpCode = () => String(randomInt(0, 1000000)).padStart(6, '0');

const maskEmail = (email) => {
  const [name, domain] = String(email).split('@');
  if (!name || !domain) return email;
  return `${name.slice(0, 2)}***@${domain}`;
};

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

router.post('/api/login/otp/verify', async (req, res) => {
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

router.post('/api/login/otp/resend', async (req, res) => {
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

export default router;

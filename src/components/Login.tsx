import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import OtpInput from './OtpInput';
import { API_BASE_URL } from '../services/api';

import { useNavigate } from 'react-router-dom';
import { AuthMessage, AuthShell, PasswordField } from './AuthUI';

type LoginUser = { id?: number; username: string; role?: string; fullName?: string; email?: string; profileImage?: string };
const REMEMBERED_USERNAME_KEY = 'workpalace-remembered-username';

interface LoginProps {
  onLogin: (user: LoginUser) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState(() => localStorage.getItem(REMEMBERED_USERNAME_KEY) || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem(REMEMBERED_USERNAME_KEY) !== null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverConnected, setServerConnected] = useState<boolean | null>(null);
  const [otpChallenge, setOtpChallenge] = useState<{ id: string } | null>(null);
  const otpUserRef = useRef<LoginUser | null>(null);

  function updateRememberedUsername(value: string, enabled: boolean) {
    setRememberMe(enabled);
    if (enabled && value.trim()) {
      localStorage.setItem(REMEMBERED_USERNAME_KEY, value.trim());
    } else if (!enabled) {
      localStorage.removeItem(REMEMBERED_USERNAME_KEY);
    }
  }

  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/health`, {
          method: 'GET',
        });
        setServerConnected(response.ok);
      } catch {
        setServerConnected(false);
      }
    };

    checkServer();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUsername = username.trim();
    const cleanPassword = password;

    if (!cleanUsername || !cleanPassword) {
      setError('Por favor completa ambos campos');
      return;
    }

    if (!serverConnected) {
      setError('El servidor no está disponible. Asegúrate de ejecutar: npm run server');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: cleanUsername,
          password: cleanPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Credenciales incorrectas');
        return;
      }

      if (data.requiresOtp) {
        setOtpChallenge({ id: data.challengeId });
        return;
      }

      const u = data.user;
      updateRememberedUsername(cleanUsername, rememberMe);
      onLogin({
        id: u.id,
        username: u.username,
        role: u.role,
        fullName: u.fullName || u.full_name,
        email: u.email,
        profileImage: u.profileImage || u.profile_image_url || '',
      });
      setUsername('');
      setPassword('');
      const params = new URLSearchParams(location.search);
      const redirect = params.get('redirect') || '/';
      navigate(redirect);
    } catch {
      setError('Error de conexión. Asegúrate de que el servidor esté ejecutándose: npm run server');
    } finally {
      setLoading(false);
    }
  };

  async function verifyOtp(code: string) {
    const response = await fetch(`${API_BASE_URL}/api/login/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId: otpChallenge?.id, code }),
    });
    const data = await response.json();
    if (!response.ok) return false;
    const verifiedUser: LoginUser = {
      id: data.user.id,
      username: data.user.username,
      role: data.user.role,
      fullName: data.user.fullName,
      email: data.user.email,
      profileImage: data.user.profileImage || '',
    };
    otpUserRef.current = verifiedUser;
    updateRememberedUsername(username, rememberMe);
    return true;
  }

  function finishOtpLogin() {
    const verifiedUser = otpUserRef.current;
    if (!verifiedUser) return;
    onLogin(verifiedUser);
    const params = new URLSearchParams(location.search);
    navigate(params.get('redirect') || '/');
  }

  return (
    <AuthShell wide={Boolean(otpChallenge)}>
        {otpChallenge ? (
          <OtpInput
            description="Abre Microsoft Authenticator e escribe el código temporal de WorkPalace."
            verify={verifyOtp}
            onSuccess={() => window.setTimeout(finishOtpLogin, 1100)}
            onCancel={() => setOtpChallenge(null)}
          />
        ) : <form onSubmit={handleSubmit} className="wp-auth__form" autoComplete="on">
          <Link to="/" className="wp-auth__back">← Volver al inicio</Link>
          <h2 className="wp-auth__heading">Qué bueno verte de nuevo</h2>
          <p className="wp-auth__subtitle">Inicia sesión para continuar en WorkPalace.</p>
          {typeof location.state?.message === 'string' && (
            <AuthMessage tone="success">{location.state.message}</AuthMessage>
          )}

          {serverConnected === false && (
            <AuthMessage tone="error">El servidor no está disponible. Ejecuta: npm run server</AuthMessage>
          )}

          <div className="wp-auth__field">
            <label htmlFor="username">Correo o nombre de usuario</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="tu@correo.com o tu usuario"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (rememberMe) updateRememberedUsername(e.target.value, true);
              }}
              disabled={loading}
              required
            />
          </div>
          <PasswordField
            id="password"
            name="password"
            label="Contraseña"
            autoComplete="current-password"
            placeholder="Ingresa tu contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
          <div className="wp-auth__row">
            <label className="wp-auth__checkbox">
              <input
                type="checkbox"
                name="remember"
                checked={rememberMe}
                onChange={(event) => updateRememberedUsername(username, event.target.checked)}
                disabled={loading}
              />{' '}
              Recuérdame
            </label>
            <Link to="/forgot-password" className="wp-auth__text-link">¿Olvidaste tu contraseña?</Link>
          </div>
          {error && <AuthMessage tone="error">{error}</AuthMessage>}
          <button
            type="submit"
            className="wp-auth__submit"
            disabled={loading || serverConnected !== true}
            aria-busy={loading}
          >
            {loading ? 'Iniciando sesión...' : serverConnected === null ? 'Conectando...' : 'Iniciar sesión'}
          </button>
          <p className="wp-auth__footer">
            ¿Aún no tienes cuenta? <Link to="/signup" className="wp-auth__text-link">Crear una cuenta</Link>
          </p>
        </form>}
    </AuthShell>
  );
}
    

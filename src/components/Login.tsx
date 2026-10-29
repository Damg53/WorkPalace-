import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Auth.css';
import OtpInput from './OtpInput';

import { useNavigate } from 'react-router-dom';

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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem(REMEMBERED_USERNAME_KEY) !== null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverConnected, setServerConnected] = useState<boolean | null>(null);
  const [otpChallenge, setOtpChallenge] = useState<{ id: string; email: string; devCode: string } | null>(null);
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
        const response = await fetch('http://localhost:3001/api/health', {
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
      const response = await fetch('http://localhost:3001/api/login', {
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
        setOtpChallenge({ id: data.challengeId, email: data.email, devCode: data.devCode });
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
    const response = await fetch('http://localhost:3001/api/login/otp/verify', {
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

  async function resendOtp() {
    if (!otpChallenge) return;
    const response = await fetch('http://localhost:3001/api/login/otp/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId: otpChallenge.id }),
    });
    if (response.ok) {
      const data = await response.json();
      setOtpChallenge((current) => current ? { ...current, devCode: data.devCode } : current);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <img src="/workpalace-logo-dark.png" alt="WorkPalace" className="auth-visual-logo brand-logo-dark" />
        <img src="/workpalace-logo-light.png" alt="WorkPalace" className="auth-visual-logo brand-logo-light" />
        <p>Espacios especializados<br />para trabajar de forma flexible</p>
      </div>
      <div className="auth-panel">
        {otpChallenge ? (
          <OtpInput
            email={otpChallenge.email}
            devCode={otpChallenge.devCode}
            verify={verifyOtp}
            onSuccess={() => window.setTimeout(finishOtpLogin, 1100)}
            onResend={resendOtp}
            onCancel={() => setOtpChallenge(null)}
          />
        ) : <form onSubmit={handleSubmit} className="auth-form" autoComplete="on">
          <Link to="/" className="auth-back-link">← Volver al Inicio</Link>
          <h2 className="auth-title">Iniciar sesión</h2>
          {typeof location.state?.message === 'string' && (
            <p className="auth-message auth-success" role="status">{location.state.message}</p>
          )}

          {serverConnected === false && (
            <div className="auth-status-alert">
              ⚠️ Servidor no disponible. Ejecuta: <code>npm run server</code>
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="username">Usuario o Email</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="Escribe tu usuario o email"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (rememberMe) updateRememberedUsername(e.target.value, true);
              }}
              disabled={loading}
            />
          </div>
          <div className="auth-field">
            <label htmlFor="password">Contraseña</label>
            <div className="auth-password-control">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                className="auth-password-toggle"
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
                aria-controls="password"
                disabled={loading}
              >
                {showPassword ? (
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                    <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
                    <path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.2 9.5 7-.4 1.1-1.3 2.4-2.5 3.5M6.2 6.2C4.2 7.5 3 9.4 2.5 12c1 2.8 4.5 7 9.5 7 1.2 0 2.3-.2 3.3-.7" />
                  </svg>
                ) : (
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                    <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="auth-field auth-remember">
            <label>
              <input
                type="checkbox"
                name="remember"
                checked={rememberMe}
                onChange={(event) => updateRememberedUsername(username, event.target.checked)}
                disabled={loading}
              />{' '}
              Recuérdame
            </label>
          </div>
          {error && <p className="auth-message auth-error" role="alert">{error}</p>}
          <button
            type="submit"
            className="auth-button"
            disabled={loading || serverConnected === false}
            aria-busy={loading}
          >
            {loading ? 'Iniciando sesión...' : 'Entrar'}
          </button>
          <p className="auth-footer">
            <Link to="/forgot-password">¿Olvidaste tu contraseña?</Link>
          </p>
          <p className="auth-footer">
            ¿No tienes cuenta? <Link to="/signup">Regístrate</Link>
          </p>
        </form>}
      </div>
    </div>
  );
}
    
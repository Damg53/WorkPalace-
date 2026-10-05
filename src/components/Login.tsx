import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Auth.css';
import OtpInput from './OtpInput';

import { useNavigate } from 'react-router-dom';

interface LoginProps {
  onLogin: (user: { id?: number; username: string; role?: string; fullName?: string; email?: string; profileImage?: string }) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverConnected, setServerConnected] = useState<boolean | null>(null);
  const [otpChallenge, setOtpChallenge] = useState<{ id: string; email: string; devCode: string } | null>(null);
  const [otpUser, setOtpUser] = useState<{
    id?: number;
    username: string;
    role?: string;
    fullName?: string;
    email?: string;
    profileImage?: string;
  } | null>(null);
  const otpUserRef = useRef<typeof otpUser>(null);

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
    const verifiedUser = {
      id: data.user.id,
      username: data.user.username,
      role: data.user.role,
      fullName: data.user.fullName,
      email: data.user.email,
      profileImage: data.user.profileImage || '',
    };
    otpUserRef.current = verifiedUser;
    setOtpUser(verifiedUser);
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
      <div className="auth-visual" />
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
        ) : <form onSubmit={handleSubmit} className="auth-form">
          <Link to="/" className="auth-back-link">← Volver al Inicio</Link>
          <h2 className="auth-title">Iniciar sesión</h2>

          {serverConnected === false && (
            <div className="auth-status-alert">
              ⚠️ Servidor no disponible. Ejecuta: <code>npm run server</code>
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="username">Usuario o Email</label>
            <input
              id="username"
              type="text"
              placeholder="Escribe tu usuario o email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="auth-field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="auth-field auth-remember">
            <label>
              <input
                type="checkbox"
                name="remember"
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
    
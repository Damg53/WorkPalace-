import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../services/api';
import './Auth.css';

function closeWindowOrFallback(fallback: () => void) {
  window.close();
  window.setTimeout(() => {
    if (!window.closed) fallback();
  }, 250);
}

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') || '');
  const [tokenStatus, setTokenStatus] = useState<'checking' | 'valid' | 'invalid'>(
    /^[a-f0-9]{64}$/i.test(token) ? 'checking' : 'invalid'
  );
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!resetComplete) return;

    if (countdown > 0) {
      const timer = window.setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => window.clearTimeout(timer);
    }

    closeWindowOrFallback(() => {
      navigate('/', { replace: true });
    });
  }, [countdown, navigate, resetComplete]);

  useEffect(() => {
    if (tokenStatus === 'invalid') {
      navigate('/forgot-password', { replace: true });
      return;
    }

    if (tokenStatus !== 'checking') return;

    let cancelled = false;
    fetch(`${API_BASE_URL}/api/reset-password/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('invalid-token');
        if (!cancelled) setTokenStatus('valid');
      })
      .catch(() => {
        if (!cancelled) {
          setTokenStatus('invalid');
          navigate('/forgot-password', { replace: true });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [navigate, token, tokenStatus]);

  useEffect(() => {
    if (tokenStatus === 'valid' && location.search) {
      navigate(location.pathname, { replace: true, state: location.state });
    }
  }, [location.pathname, location.search, location.state, navigate, tokenStatus]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (tokenStatus !== 'valid') {
      return;
    }
    if (password.length < 6 || password.length > 128) {
      setError('La contraseña debe tener entre 6 y 128 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'No se pudo actualizar la contraseña.');
        return;
      }

      setSuccessMessage(data.message || 'Tu contraseña se actualizó correctamente.');
      setResetComplete(true);
    } catch {
      setError('No se pudo conectar con el servidor. Intenta de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  if (tokenStatus !== 'valid') {
    return null;
  }

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <img src="/workpalace-logo-dark.png" alt="WorkPalace" className="auth-visual-logo brand-logo-dark" />
        <img src="/workpalace-logo-light.png" alt="WorkPalace" className="auth-visual-logo brand-logo-light" />
        <p>Espacios especializados<br />para trabajar de forma flexible</p>
      </div>
      <div className="auth-panel">
        {resetComplete ? (
          <div className="auth-form" role="status">
            <h2 className="auth-title">Contraseña actualizada</h2>
            <p className="auth-subtitle">{successMessage}</p>
            <p className="auth-subtitle">
              Esta pestaña se cerrará automáticamente en {countdown} segundo{countdown === 1 ? '' : 's'}.
            </p>
            <button
              type="button"
              className="auth-button"
              onClick={() =>
                closeWindowOrFallback(() => {
                  navigate('/', { replace: true });
                })
              }
            >
              Cerrar y abrir la página principal
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <h2 className="auth-title">Crear nueva contraseña</h2>
            <p className="auth-subtitle">Elige una contraseña de entre 6 y 128 caracteres.</p>

            <div className="auth-field">
              <label htmlFor="new-password">Nueva contraseña</label>
              <div className="auth-password-control">
                <input
                  id="new-password"
                  name="new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={loading}
                  required
                />
                <button
                  className="auth-password-toggle"
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPassword}
                  aria-controls="new-password"
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

            <div className="auth-field">
              <label htmlFor="confirm-password">Confirmar contraseña</label>
              <div className="auth-password-control">
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={loading}
                  required
                />
                <button
                  className="auth-password-toggle"
                  type="button"
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                  aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showConfirmPassword}
                  aria-controls="confirm-password"
                  disabled={loading}
                >
                  {showConfirmPassword ? (
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

            {error && <p className="auth-message auth-error" role="alert">{error}</p>}

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Actualizando...' : 'Guardar nueva contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../services/api';
import './Auth.css';

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(token ? '' : 'El enlace no es válido o no contiene un token.');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token && location.search) {
      navigate(location.pathname, { replace: true, state: location.state });
    }
  }, [location.pathname, location.search, location.state, navigate, token]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

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

      navigate('/login', { replace: true, state: { message: data.message } });
    } catch {
      setError('No se pudo conectar con el servidor. Intenta de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <img src="/workpalace-logo-dark.png" alt="WorkPalace" className="auth-visual-logo brand-logo-dark" />
        <img src="/workpalace-logo-light.png" alt="WorkPalace" className="auth-visual-logo brand-logo-light" />
        <p>Espacios especializados<br />para trabajar de forma flexible</p>
      </div>
      <div className="auth-panel">
        <form onSubmit={handleSubmit} className="auth-form">
          <Link to="/login" className="auth-back-link">← Volver a iniciar sesión</Link>
          <h2 className="auth-title">Crear nueva contraseña</h2>
          <p className="auth-subtitle">Elige una contraseña de entre 6 y 128 caracteres.</p>

          <div className="auth-field">
            <label htmlFor="new-password">Nueva contraseña</label>
            <div className="auth-password-control auth-password-control--text-toggle">
              <input
                id="new-password"
                name="new-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading || !token}
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
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="confirm-password">Confirmar contraseña</label>
            <div className="auth-password-control auth-password-control--text-toggle">
              <input
                id="confirm-password"
                name="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={loading || !token}
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
                {showConfirmPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          {error && <p className="auth-message auth-error" role="alert">{error}</p>}

          <button type="submit" className="auth-button" disabled={loading || !token}>
            {loading ? 'Actualizando...' : 'Guardar nueva contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}

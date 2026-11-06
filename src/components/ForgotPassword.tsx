import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../services/api';
import './Auth.css';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestAccepted, setRequestAccepted] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!requestAccepted) return;

    if (countdown > 0) {
      const timer = window.setTimeout(() => setCountdown((seconds) => seconds - 1), 1000);
      return () => window.clearTimeout(timer);
    }

    navigate('/login', { replace: true });
  }, [countdown, navigate, requestAccepted]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'No se pudo procesar la solicitud.');
        return;
      }

      setRequestAccepted(true);
    } catch {
      setError('No se pudo conectar con el servidor para enviar el correo. Intenta de nuevo más tarde.');
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
        {requestAccepted ? (
          <div className="auth-form" role="status">
            <h2 className="auth-title">Solicitud recibida</h2>
            <p className="auth-subtitle">
              Si el correo está asociado a una cuenta, recibirás un enlace para restablecer la contraseña.
              Revisa también la carpeta de correo no deseado.
            </p>
            <p className="auth-subtitle">
              Volverás al inicio de sesión en {countdown} segundo{countdown === 1 ? '' : 's'}.
            </p>
            <button
              type="button"
              className="auth-button"
              onClick={() => navigate('/login', { replace: true })}
            >
              Volver al inicio de sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <Link to="/" className="auth-back-link">← Volver al Inicio</Link>
            <h2 className="auth-title">Recuperar contraseña</h2>
            <p className="auth-subtitle">Ingresa el correo de tu cuenta y te enviaremos un enlace para restablecerla.</p>

            <div className="auth-field">
              <label htmlFor="recovery-email">Correo electrónico</label>
              <input
                id="recovery-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="tu@ejemplo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
                required
              />
            </div>

            {error && <p className="auth-message auth-error" role="alert">{error}</p>}

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </button>

            <p className="auth-footer">
              ¿Recuerdas tu contraseña? <Link to="/login">Inicia sesión</Link>
            </p>
            <p className="auth-footer">
              ¿No tienes cuenta? <Link to="/signup">Regístrate</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

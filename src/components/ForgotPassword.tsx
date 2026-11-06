import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { API_BASE_URL } from '../services/api';
import { AuthMessage, AuthShell } from './AuthUI';

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
      setError('No se pudo conectar con el servidor. Intenta de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      {requestAccepted ? (
        <>
          <h2 className="wp-auth__heading">Revisa tu correo</h2>
          <p className="wp-auth__subtitle">
            Si el correo está asociado a una cuenta, recibirás instrucciones para restablecer tu contraseña.
            Revisa también la carpeta de correo no deseado.
          </p>
          <AuthMessage tone="success">Solicitud recibida correctamente.</AuthMessage>
          <p className="wp-auth__footer">
            Volverás al inicio de sesión en {countdown} segundo{countdown === 1 ? '' : 's'}.
          </p>
          <p className="wp-auth__footer">
            <Link to="/login" className="wp-auth__text-link">Volver al inicio de sesión</Link>
          </p>
        </>
      ) : (
        <>
          <Link to="/login" className="wp-auth__back">← Volver al inicio de sesión</Link>
          <h2 className="wp-auth__heading">Recupera tu contraseña</h2>
          <p className="wp-auth__subtitle">
            Escribe el correo asociado a tu cuenta y te enviaremos un enlace para crear una nueva contraseña.
          </p>
          <form onSubmit={handleSubmit} className="wp-auth__form">
            <div className="wp-auth__field">
              <label htmlFor="recovery-email">Correo electrónico</label>
              <input
                id="recovery-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
                required
              />
            </div>
            {error && <AuthMessage tone="error">{error}</AuthMessage>}
            <button type="submit" className="wp-auth__submit" disabled={loading} aria-busy={loading}>
              {loading ? 'Enviando enlace...' : 'Enviar enlace de recuperación'}
            </button>
          </form>
          <p className="wp-auth__footer">
            ¿No tienes cuenta? <Link to="/signup" className="wp-auth__text-link">Regístrate</Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}

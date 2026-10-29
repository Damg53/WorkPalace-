import { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../services/api';
import './Auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

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

      setSuccess(data.message);
      setEmail('');
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
          {success && <p className="auth-message auth-success" role="status">{success}</p>}

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
      </div>
    </div>
  );
}

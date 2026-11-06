import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { API_BASE_URL } from '../services/api';
import { AuthMessage, AuthShell, PasswordField } from './AuthUI';

type TokenStatus = 'checking' | 'valid' | 'invalid' | 'unavailable';

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') || '');
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>(
    /^[a-f0-9]{64}$/i.test(token) ? 'checking' : 'invalid'
  );
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (tokenStatus !== 'checking') return;

    let cancelled = false;
    fetch(`${API_BASE_URL}/api/reset-password/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((response) => {
        if (!response.ok) {
          if (!cancelled) setTokenStatus('invalid');
          return;
        }
        if (!cancelled) setTokenStatus('valid');
      })
      .catch(() => {
        if (!cancelled) setTokenStatus('unavailable');
      });

    return () => {
      cancelled = true;
    };
  }, [token, tokenStatus]);

  useEffect(() => {
    if (tokenStatus === 'valid' && location.search) {
      navigate(location.pathname, { replace: true, state: location.state });
    }
  }, [location.pathname, location.search, location.state, navigate, tokenStatus]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (tokenStatus !== 'valid') return;
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

  return (
    <AuthShell>
      {tokenStatus === 'checking' ? (
        <>
          <h2 className="wp-auth__heading">Validando enlace</h2>
          <p className="wp-auth__subtitle">Estamos comprobando que el enlace siga vigente...</p>
        </>
      ) : tokenStatus === 'invalid' ? (
        <>
          <h2 className="wp-auth__heading">Enlace no válido</h2>
          <p className="wp-auth__subtitle">
            Este enlace expiró o ya fue utilizado. Solicita uno nuevo para continuar.
          </p>
          <Link to="/forgot-password" className="wp-auth__submit">Solicitar otro enlace</Link>
        </>
      ) : tokenStatus === 'unavailable' ? (
        <>
          <h2 className="wp-auth__heading">No pudimos validar el enlace</h2>
          <p className="wp-auth__subtitle">Revisa tu conexión e inténtalo de nuevo más tarde.</p>
          <AuthMessage tone="error">No se pudo conectar con el servidor.</AuthMessage>
          <p className="wp-auth__footer">
            <Link to="/forgot-password" className="wp-auth__text-link">Solicitar otro enlace</Link>
          </p>
        </>
      ) : resetComplete ? (
        <>
          <h2 className="wp-auth__heading">Contraseña actualizada</h2>
          <p className="wp-auth__subtitle">{successMessage}</p>
          <AuthMessage tone="success">Ya puedes iniciar sesión con tu nueva contraseña.</AuthMessage>
          <Link to="/login" className="wp-auth__submit">Ir a iniciar sesión</Link>
        </>
      ) : (
        <>
          <Link to="/login" className="wp-auth__back">← Volver al inicio de sesión</Link>
          <h2 className="wp-auth__heading">Crea una nueva contraseña</h2>
          <p className="wp-auth__subtitle">Elige una contraseña segura de entre 6 y 128 caracteres.</p>
          <form onSubmit={handleSubmit} className="wp-auth__form">
            <PasswordField
              id="new-password"
              name="new-password"
              label="Nueva contraseña"
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              minLength={6}
              maxLength={128}
              required
            />
            <PasswordField
              id="confirm-password"
              name="confirm-password"
              label="Confirmar contraseña"
              autoComplete="new-password"
              placeholder="Escribe de nuevo tu contraseña"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={loading}
              required
            />
            {error && <AuthMessage tone="error">{error}</AuthMessage>}
            <button type="submit" className="wp-auth__submit" disabled={loading} aria-busy={loading}>
              {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}

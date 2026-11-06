import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { API_BASE_URL } from '../services/api';
import { AuthMessage, AuthShell, PasswordField } from './AuthUI';

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => navigate('/login', { replace: true }), 2000);
    return () => window.clearTimeout(timer);
  }, [navigate, success]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const cleanFullName = fullName.trim();
    const cleanEmail = email.trim();
    const cleanUsername = username.trim();

    if (!cleanFullName || !cleanEmail || !cleanUsername || !password || !confirm) {
      setError('Completa todos los campos obligatorios.');
      return;
    }
    if (cleanFullName.length < 2 || cleanFullName.length > 100) {
      setError('El nombre completo debe tener entre 2 y 100 caracteres.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    if (cleanUsername.length < 3 || cleanUsername.length > 50) {
      setError('El nombre de usuario debe tener entre 3 y 50 caracteres.');
      return;
    }
    if (password.length < 6 || password.length > 128) {
      setError('La contraseña debe tener entre 6 y 128 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (!accepted) {
      setError('Debes aceptar los términos y condiciones.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: cleanFullName,
          email: cleanEmail,
          username: cleanUsername,
          password,
          phone: phone.trim(),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'No se pudo crear la cuenta.');
        return;
      }

      setSuccess(true);
    } catch {
      setError('No se pudo conectar con el servidor. Intenta de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <Link to="/" className="wp-auth__back">← Volver al inicio</Link>
      <h2 className="wp-auth__heading">Crea tu cuenta</h2>
      <p className="wp-auth__subtitle">Regístrate y encuentra el espacio ideal para trabajar.</p>

      {success ? (
        <>
          <AuthMessage tone="success">Tu cuenta se creó correctamente. Te llevamos al inicio de sesión...</AuthMessage>
          <p className="wp-auth__footer">
            <Link to="/login" className="wp-auth__text-link">Iniciar sesión ahora</Link>
          </p>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="wp-auth__form" autoComplete="on">
          <div className="wp-auth__field">
            <label htmlFor="signup-fullname">Nombre completo</label>
            <input
              id="signup-fullname"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Tu nombre y apellido"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="wp-auth__field">
            <label htmlFor="signup-email">Correo electrónico</label>
            <input
              id="signup-email"
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
          <div className="wp-auth__field">
            <label htmlFor="signup-username">Nombre de usuario</label>
            <input
              id="signup-username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="Elige un nombre de usuario"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={loading}
              minLength={3}
              maxLength={50}
              required
            />
          </div>
          <div className="wp-auth__field">
            <label htmlFor="signup-phone">Celular <span>(opcional)</span></label>
            <input
              id="signup-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="300 123 4567"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={loading}
            />
          </div>
          <PasswordField
            id="signup-password"
            name="password"
            label="Contraseña"
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
            id="signup-confirm"
            name="confirm-password"
            label="Confirmar contraseña"
            autoComplete="new-password"
            placeholder="Escribe de nuevo tu contraseña"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            disabled={loading}
            required
          />
          <label className="wp-auth__checkbox">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              disabled={loading}
            />
            Acepto los términos y condiciones.
          </label>
          {error && <AuthMessage tone="error">{error}</AuthMessage>}
          <button type="submit" className="wp-auth__submit" disabled={loading} aria-busy={loading}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
          <p className="wp-auth__footer">
            ¿Ya tienes cuenta? <Link to="/login" className="wp-auth__text-link">Inicia sesión</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}

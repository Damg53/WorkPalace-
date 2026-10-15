import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverConnected, setServerConnected] = useState<boolean | null>(null);

  // Verificar si el servidor está disponible
  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/health', {
          method: 'GET',
        });
        setServerConnected(response.ok);
      } catch (error) {
        setServerConnected(false);
        console.error('❌ No se puede conectar al servidor:', error);
      }
    };

    checkServer();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validar campo
    if (!email.trim()) {
      setError('Por favor ingresa tu correo electrónico');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Por favor ingresa un correo electrónico válido');
      return;
    }

    if (!serverConnected) {
      setError('El servidor no está disponible. Asegúrate de ejecutar: npm run server');
      return;
    }

    setLoading(true);
    try {
      console.log('📤 Enviando solicitud de recuperación a:', 'http://localhost:3001/api/forgot-password');

      const response = await fetch('http://localhost:3001/api/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      console.log('📊 Response status:', response.status);

      const data = await response.json();
      console.log('📄 Response data:', data);

      if (!response.ok) {
        setError(data.error || 'Error al procesar la solicitud');
        return;
      }

      // Éxito
      console.log('✅ Solicitud enviada');
      setSuccess(data.message);
      setEmail('');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      console.error('❌ Error:', errorMsg);
      setError('Error de conexión. Asegúrate de que el servidor esté ejecutándose: npm run server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-visual" />
      <div className="auth-panel">
        <form onSubmit={handleSubmit} className="auth-form">
          <Link to="/" className="auth-back-link">← Volver al Inicio</Link>
          <h2 className="auth-title">Recuperar Contraseña</h2>
          <p className="auth-subtitle">Ingresa tu correo electrónico y te enviaremos un enlace para resetear tu contraseña.</p>

          {serverConnected === false && (
            <div className="auth-status-alert">
              ⚠️ Servidor no disponible. Ejecuta: <code>npm run server</code>
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="email">Correo Electrónico</label>
            <input
              id="email"
              type="email"
              placeholder="tu@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && <p className="auth-message auth-error">{error}</p>}
          {success && <p className="auth-message auth-success">{success}</p>}

          <button
            type="submit"
            className="auth-button"
            disabled={loading || serverConnected === false}
          >
            {loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
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

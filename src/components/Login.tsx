import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Login.css';

import { useNavigate } from 'react-router-dom';

interface LoginProps {
  onLogin: (user: { username: string; role?: string }) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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
        console.error(' No se puede conectar al servidor:', error);
      }
    };

    checkServer();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validar campos
    if (!username.trim() || !password.trim()) {
      setError('Por favor completa ambos campos');
      return;
    }

    if (!serverConnected) {
      setError('El servidor no está disponible. Asegúrate de ejecutar: npm run server');
      return;
    }

    setLoading(true);
    try {
      console.log(' Enviando login a:', 'http://localhost:3001/api/login');
      
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      console.log(' Response status:', response.status);

      const data = await response.json();
      console.log(' Response data:', data);

      if (!response.ok) {
        setError(data.error || 'Error al iniciar sesión');
        return;
      }

      // Login exitoso
      console.log('Login exitoso');
      const returnedUser = data.user.username;
      const returnedRole = data.user.role;
      onLogin({ username: returnedUser, role: returnedRole });
      setUsername('');
      setPassword('');
      // redirect depending on role
      if (returnedRole === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error:', errorMsg);
      setError('Error de conexión. Asegúrate de que el servidor esté ejecutándose: npm run server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="left-panel" />
      <div className="right-panel">
        <form onSubmit={handleSubmit} className="login-form">
          <Link to="/" className="back-button">← Volver al Inicio</Link>
          <h2 className="form-title">Iniciar sesión</h2>
          
          {/* Server status indicator */}
          {serverConnected === false && (
            <div style={{
              background: 'rgba(255, 0, 0, 0.2)',
              border: '1px solid #ff6b6b',
              color: '#ff6b6b',
              padding: '0.75rem',
              borderRadius: '4px',
              marginBottom: '1rem',
              fontSize: '0.9rem',
              width: '100%',
              maxWidth: '420px'
            }}>
              ⚠️ Servidor no disponible. Ejecuta: <code>npm run server</code>
            </div>
          )}

          <div className="input-group">
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
          <div className="input-group">
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
          <div className="input-group remember-group">
            <label>
              <input
                type="checkbox"
                name="remember"
                disabled={loading}
              />{' '}
              Recuérdame
            </label>
          </div>
          {error && <p className="error-message">{error}</p>}
          <button 
            type="submit" 
            className="submit-button" 
            disabled={loading || serverConnected === false}
          >
            {loading ? 'Iniciando sesión...' : 'Entrar'}
          </button>
          <p className="footer-text">
            <Link to="/forgot-password">¿Olvidaste tu contraseña?</Link>
          </p>
          <p className="footer-text">
            ¿No tienes cuenta? <Link to="/signup">Regístrate</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
    
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Login.css';

interface LoginProps {
  onLogin: (username: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // This example just checks for non-empty fields. In a real app you
    // would contact a server here and handle authentication securely.
    if (!username.trim() || !password.trim()) {
      setError('Por favor completa ambos campos');
      return;
    }

    // simulate successful login by passing username back upstream
    onLogin(username.trim());
    setUsername('');
    setPassword('');
  };

  return (
    <div className="login-container">
      <div className="left-panel" />
      <div className="right-panel">
        <form onSubmit={handleSubmit} className="login-form">
          <h2 className="form-title">Iniciar sesión</h2>
          <div className="input-group">
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              type="text"
              placeholder="Escribe tu usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
            />
          </div>
          <div className="input-group remember-group">
            <label>
              <input
                type="checkbox"
                name="remember"
              />{' '}
              Recuérdame
            </label>
          </div>
        {error && <p className="error-message">{error}</p>}
        <button type="submit" className="submit-button">Entrar</button>
        <p className="footer-text">
          <a href="#">¿Olvidaste tu contraseña?</a>
        </p>
        <p className="footer-text">
          ¿No tienes cuenta? <Link to="/signup">Regístrate</Link>
        </p>
      </form>
      </div>
    </div>
  );
}
    
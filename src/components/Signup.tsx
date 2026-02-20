import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Signup.css'

export default function Signup() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [accepted, setAccepted] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (
      !fullName.trim() ||
      !email.trim() ||
      !username.trim() ||
      !password.trim() ||
      !confirm.trim()
    ) {
      setError('Por favor completa todos los campos requeridos')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (!accepted) {
      setError('Debes aceptar los términos y condiciones')
      return
    }
    // simulate signup success -> redirect to login
    navigate('/login')
  }

  return (
    <div className="login-container">
      <div className="left-panel" />
      <div className="right-panel">
        <form onSubmit={handleSubmit} className="login-form">
          <h2 className="form-title">Crear cuenta</h2>

          <div className="input-group">
            <label htmlFor="fullname">Nombre completo</label>
            <input
              id="fullname"
              type="text"
              placeholder="Tu nombre"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              placeholder="tu@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              type="text"
              placeholder="Nombre de usuario"
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

          <div className="input-group">
            <label htmlFor="confirm">Confirmar contraseña</label>
            <input
              id="confirm"
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <div className="input-group remember-group">
            <label>
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
              />{' '}
              Acepto los términos y condiciones
            </label>
          </div>

          <button type="submit" className="submit-button">Crear usuario</button>

          <p className="footer-text">
            ¿Ya tienes cuenta? <Link to="/">Inicia sesión</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

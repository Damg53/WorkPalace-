import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Auth.css'

export default function Signup() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const cleanFullName = fullName.trim()
    const cleanEmail = email.trim()
    const cleanUsername = username.trim()
    const cleanPassword = password.trim()
    const cleanConfirm = confirm.trim()

    if (
      !cleanFullName ||
      !cleanEmail ||
      !cleanUsername ||
      !cleanPassword ||
      !cleanConfirm
    ) {
      setError('Por favor completa todos los campos requeridos')
      return
    }

    if (cleanFullName.length < 2 || cleanFullName.length > 100) {
      setError('El nombre completo debe tener entre 2 y 100 caracteres')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      setError('Ingresa un correo electrónico válido')
      return
    }

    if (cleanUsername.length < 3 || cleanUsername.length > 50) {
      setError('El nombre de usuario debe tener entre 3 y 50 caracteres')
      return
    }

    if (cleanPassword.length < 6 || cleanPassword.length > 128) {
      setError('La contraseña debe tener entre 6 y 128 caracteres')
      return
    }

    if (cleanPassword !== cleanConfirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (!accepted) {
      setError('Debes aceptar los términos y condiciones')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('http://localhost:3001/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName,
          email,
          username,
          password,
          phone,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Error al registrar el usuario')
        return
      }

      setSuccess('¡Usuario registrado exitosamente! Redirigiendo al login...')
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (error) {
      setError('Error de conexión. Asegúrate de que el servidor esté ejecutándose.')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-visual" />
      <div className="auth-panel">
        <form onSubmit={handleSubmit} className="auth-form">
          <Link to="/" className="auth-back-link">← Volver al Inicio</Link>
          <h2 className="auth-title">Crear cuenta</h2>

          <div className="auth-field">
            <label htmlFor="fullname">Nombre completo</label>
            <input
              id="fullname"
              type="text"
              placeholder="Tu nombre"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              placeholder="tu@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              type="text"
              placeholder="Nombre de usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="phone">Celular colombiano (opcional)</label>
            <input
              id="phone"
              type="tel"
              placeholder="300 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="confirm">Confirmar contraseña</label>
            <input
              id="confirm"
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          {error && <p className="auth-message auth-error" role="alert">{error}</p>}
          {success && <p className="auth-message auth-success">{success}</p>}

          <div className="auth-field auth-remember">
            <label>
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
              />{' '}
              Acepto los términos y condiciones
            </label>
          </div>

          <button type="submit" className="auth-button" disabled={loading} aria-busy={loading}>
            {loading ? 'Registrando...' : 'Crear usuario'}
          </button>

          <p className="auth-footer">
            ¿Ya tienes cuenta? <Link to="/Login">Inicia sesión</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

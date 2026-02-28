import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from './Navbar'
import './Settings.css'

export interface UserProfile {
  id: number
  username: string
  fullName?: string
  email?: string
  role?: string
}

interface SettingsProps {
  user: UserProfile
  onLogout: () => void
  onProfileUpdate: (updated: UserProfile) => void
  isDark: boolean
  setIsDark: (value: boolean) => void
}

const API = 'http://localhost:3001'

export default function Settings({ user, onLogout, onProfileUpdate, isDark, setIsDark }: SettingsProps) {
  // Mostrar desde el primer momento los datos que tengamos (props/localStorage)
  const [fullName, setFullName] = useState(() => user.fullName ?? '')
  const [email, setEmail] = useState(() => user.email ?? '')
  const [username, setUsername] = useState(() => user.username ?? '')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Sincronizar con props cuando cambien (ej. al restaurar sesión)
  useEffect(() => {
    setFullName(user.fullName ?? '')
    setEmail(user.email ?? '')
    setUsername(user.username ?? '')
  }, [user.fullName, user.email, user.username])

  // Refrescar desde el servidor al abrir la página (para tener datos actuales)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    async function loadProfile() {
      try {
        const res = await fetch(`${API}/api/users/${user.id}/profile`)
        const data = await res.json()
        if (cancelled) return
        if (res.ok) {
          const u = data.user
          setFullName(u.full_name ?? '')
          setEmail(u.email ?? '')
          setUsername(u.username ?? '')
        }
      } catch {
        // Si falla, ya tenemos los valores de props
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadProfile()
    return () => { cancelled = true }
  }, [user.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/users/${user.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim() || undefined,
          email: email.trim() || undefined,
          username: username.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Error al guardar' })
        return
      }
      const updated = data.user
      onProfileUpdate({
        id: updated.id,
        username: updated.username,
        fullName: updated.full_name,
        email: updated.email,
        role: updated.role,
      })
      setMessage({ type: 'success', text: 'Datos guardados correctamente' })
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de conexión. ¿Está el servidor en marcha?' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Navbar isDark={isDark} setIsDark={setIsDark} user={user} onLogout={onLogout} />
      <div className="settings-page">
        <div className="settings-container">
          <h1 className="settings-title">Configuración</h1>
          <p className="settings-subtitle">Datos personales. Puedes modificar correo y usuario.</p>

          {loading ? (
            <p className="settings-loading">Actualizando datos...</p>
          ) : null}
          <form onSubmit={handleSubmit} className="settings-form">
            <div className="settings-field">
              <label htmlFor="settings-fullName">Nombre completo</label>
              <input
                id="settings-fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre completo"
              />
            </div>
            <div className="settings-field">
              <label htmlFor="settings-email">Correo electrónico</label>
              <input
                id="settings-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div className="settings-field">
              <label htmlFor="settings-username">Usuario</label>
              <input
                id="settings-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="nombre_de_usuario"
              />
            </div>

            {message && (
              <div className={`settings-message settings-message--${message.type}`}>
                {message.text}
              </div>
            )}

            <div className="settings-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <Link to={user.role === 'admin' ? '/admin' : '/dashboard'} className="btn btn-secondary">
                Volver
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from './Sidebar'
import './Settings.css'

export interface UserProfile {
  id: number
  username: string
  fullName?: string
  email?: string
  role?: string
  phone?: string
  city?: string
  preferences?: string
  notificationsEnabled?: boolean
  twoFactorEnabled?: boolean
  profileImage?: string
}

interface SettingsProps {
  user: UserProfile
  onLogout: () => void
  onProfileUpdate: (updated: UserProfile) => void
  isDark: boolean
  setIsDark: (value: boolean) => void
}

const API = 'http://localhost:3001'
const PREFERENCES_KEY = 'workpalace-user-preferences'

function loadPreferencesFromStorage() {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY)
    if (!raw) return { phone: '', city: 'Medellín', preferences: 'Trabajo remoto, reuniones y sesiones creativas', notificationsEnabled: true }
    const parsed = JSON.parse(raw)
    return {
      phone: typeof parsed.phone === 'string' ? parsed.phone : '',
      city: typeof parsed.city === 'string' ? parsed.city : 'Medellín',
      preferences: typeof parsed.preferences === 'string' ? parsed.preferences : 'Trabajo remoto, reuniones y sesiones creativas',
      notificationsEnabled: typeof parsed.notificationsEnabled === 'boolean' ? parsed.notificationsEnabled : true,
    }
  } catch {
    return { phone: '', city: 'Medellín', preferences: 'Trabajo remoto, reuniones y sesiones creativas', notificationsEnabled: true }
  }
}

export default function Settings({ user, onLogout, onProfileUpdate, isDark, setIsDark }: SettingsProps) {
  // Mostrar desde el primer momento los datos que tengamos (props/localStorage)
  const [fullName, setFullName] = useState(() => user.fullName ?? '')
  const [email, setEmail] = useState(() => user.email ?? '')
  const [username, setUsername] = useState(() => user.username ?? '')
  const [profileImage, setProfileImage] = useState(() => user.profileImage ?? '')
  const [profileImageName, setProfileImageName] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [phone, setPhone] = useState(() => loadPreferencesFromStorage().phone)
  const [city, setCity] = useState(() => loadPreferencesFromStorage().city)
  const [preferences, setPreferences] = useState(() => loadPreferencesFromStorage().preferences)
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => loadPreferencesFromStorage().notificationsEnabled)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Sincronizar con props cuando cambien (ej. al restaurar sesión)
  useEffect(() => {
    setFullName(user.fullName ?? '')
    setEmail(user.email ?? '')
    setUsername(user.username ?? '')
    setProfileImage(user.profileImage ?? '')
    const stored = loadPreferencesFromStorage()
    setPhone(stored.phone)
    setCity(stored.city)
    setPreferences(stored.preferences)
    setNotificationsEnabled(stored.notificationsEnabled)
    setTwoFactorEnabled(Boolean(user.twoFactorEnabled))
  }, [user.fullName, user.email, user.username, user.profileImage, user.twoFactorEnabled])

  useEffect(() => {
    const next = { phone, city, preferences, notificationsEnabled }
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next))
  }, [phone, city, preferences, notificationsEnabled])

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
          setProfileImage(u.profile_image_url ?? '')
          setPhone(u.phone ?? '')
          setTwoFactorEnabled(Boolean(u.two_factor_enabled))
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

  const handleProfileImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Selecciona una imagen válida.' })
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      setProfileImage(result)
      setProfileImageName(file.name)
      setMessage({ type: 'success', text: 'Foto de perfil lista para guardar.' })
    }
    reader.readAsDataURL(file)
  }

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
          profile_image_url: profileImage || undefined,
          phone,
          two_factor_enabled: twoFactorEnabled,
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
        phone,
        city,
        preferences,
        notificationsEnabled,
        twoFactorEnabled: Boolean(updated.two_factor_enabled),
        profileImage: updated.profile_image_url || profileImage,
      })
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ phone, city, preferences, notificationsEnabled }))
      setMessage({ type: 'success', text: 'Datos guardados correctamente' })
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión. ¿Está el servidor en marcha?' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="with-sidebar">
      <Sidebar user={user} isDark={isDark} setIsDark={setIsDark} onLogout={onLogout} />
      <div className="settings-page">
        <div className="settings-container">
          <div className="profile-cover" />
          <div className="profile-heading">
            <div className="profile-avatar">
              {profileImage ? (
                <img src={profileImage} alt="Foto de perfil" className="profile-avatar-image" />
              ) : (
                (fullName || username).charAt(0).toUpperCase()
              )}
            </div>
            <div className="profile-heading-copy">
              <span className="profile-eyebrow">Cuenta WorkPalace</span>
              <h1 className="settings-title">Mi perfil</h1>
              <p className="settings-subtitle">Administra tus datos personales y la información de tu cuenta.</p>
            </div>
          </div>

          <div className="profile-summary">
            <div><span className="profile-summary-label">Nombre visible</span><strong>{fullName || username}</strong></div>
            <div><span className="profile-summary-label">Usuario</span><span>@{username}</span></div>
            <div><span className="profile-summary-label">Acceso</span><span className="profile-role">{user.role === 'admin' ? 'Administrador' : 'Usuario'}</span></div>
          </div>

          <h2 className="profile-form-title">Información personal</h2>

          <div className="settings-field settings-file-field">
            <label htmlFor="settings-profile-image">Foto de perfil</label>
            <div className="settings-image-picker">
              <span className="settings-image-preview">
                {profileImage ? <img src={profileImage} alt="Previsualización" /> : <i className="fa fa-user" aria-hidden="true" />}
              </span>

              <label className="settings-upload-box" htmlFor="settings-profile-image">
                <span className="settings-upload-button">Seleccionar archivo</span>
                <span className="settings-upload-name">{profileImageName || 'Ningún archivo seleccionado'}</span>
              </label>

              <input
                id="settings-profile-image"
                type="file"
                accept="image/*"
                onChange={handleProfileImageChange}
                className="settings-upload-input"
              />
            </div>
          </div>

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

            <div className="settings-row">
              <div className="settings-field settings-field--half">
                <label htmlFor="settings-phone">Teléfono</label>
                <input
                  id="settings-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="300 123 4567"
                />
              </div>
              <div className="settings-field settings-field--half">
                <label htmlFor="settings-city">Ciudad</label>
                <input
                  id="settings-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Medellín"
                />
              </div>
            </div>

            <div className="settings-field">
              <label htmlFor="settings-preferences">Preferencias de uso</label>
              <textarea
                id="settings-preferences"
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                placeholder="Trabajo remoto, reuniones, sesiones creativas..."
                rows={3}
              />
            </div>

            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
              />
              <span>Recibir notificaciones y recordatorios por correo</span>
            </label>

            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={twoFactorEnabled}
                onChange={(e) => setTwoFactorEnabled(e.target.checked)}
              />
              <span>Activar autenticación de dos pasos al iniciar sesión</span>
            </label>

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
    </div>
  )
}

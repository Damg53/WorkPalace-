import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from './Sidebar'
import './Settings.css'
import { cacheProfileImageFromUrl, loadCachedProfileImage, saveCachedProfileImage } from '../services/profileImageCache'
import { API_BASE_URL } from '../services/api'
import { containsProfanity } from '../utils/contentValidation'

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

const API = API_BASE_URL
const PREFERENCES_KEY = 'workpalace-user-preferences'

function loadPreferencesFromStorage() {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY)
    if (!raw) return { phone: '', city: '', preferences: 'Trabajo remoto, reuniones y sesiones creativas', notificationsEnabled: true }
    const parsed = JSON.parse(raw)
    return {
      phone: typeof parsed.phone === 'string' ? parsed.phone : '',
      city: typeof parsed.city === 'string' ? parsed.city : '',
      preferences: typeof parsed.preferences === 'string' ? parsed.preferences : 'Trabajo remoto, reuniones y sesiones creativas',
      notificationsEnabled: typeof parsed.notificationsEnabled === 'boolean' ? parsed.notificationsEnabled : true,
    }
  } catch {
    return { phone: '', city: '', preferences: 'Trabajo remoto, reuniones y sesiones creativas', notificationsEnabled: true }
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
  const [totpSetup, setTotpSetup] = useState<{ secret: string; qrCode: string } | null>(null)
  const [totpPassword, setTotpPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [totpSetupCode, setTotpSetupCode] = useState('')
  const [totpBusy, setTotpBusy] = useState(false)
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
    if (containsProfanity(city) || containsProfanity(preferences)) return
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
          const cachedImage = await loadCachedProfileImage(user.id)
          const image = cachedImage || (u.profile_image_url
            ? await cacheProfileImageFromUrl(user.id, u.profile_image_url)
            : '')
          setProfileImage(image || u.profile_image_url || '')
          if (u.phone) setPhone(u.phone)
          setTwoFactorEnabled(Boolean(u.two_factor_enabled))
          onProfileUpdate({
            id: u.id,
            username: u.username,
            fullName: u.full_name ?? '',
            email: u.email ?? '',
            role: u.role,
            profileImage: image || u.profile_image_url || '',
            twoFactorEnabled: Boolean(u.two_factor_enabled),
          })
        } else {
          setMessage({ type: 'error', text: data.error || 'No se pudo cargar el perfil.' })
        }
      } catch {
        if (!cancelled) setMessage({ type: 'error', text: 'Error de conexión al cargar el perfil.' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadProfile()
    return () => { cancelled = true }
  }, [user.id, onProfileUpdate])

  const handleProfileImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage({ type: 'error', text: 'Selecciona una imagen JPEG, PNG o WebP.' })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'La imagen no puede superar los 5 MB.' })
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      setProfileImage(result)
      setProfileImageName(file.name)
      setMessage({ type: 'success', text: 'Foto de perfil lista para guardar.' })
      void saveCachedProfileImage(user.id, file).catch((error: unknown) => {
        console.error('No se pudo guardar la copia local de la foto de perfil:', error)
        setMessage({ type: 'error', text: 'La foto se cargó, pero no se pudo guardar una copia local para usarla sin conexión.' })
      })
    }
    reader.readAsDataURL(file)
  }

  const startTotpSetup = async () => {
    setMessage(null)
    setTotpBusy(true)
    try {
      const response = await fetch(`${API}/api/users/${user.id}/totp/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: totpPassword }),
      })
      const data = await response.json()
      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'No se pudo iniciar la configuración.' })
        return
      }
      const QRCode = await import('qrcode')
      const qrCode = await QRCode.toDataURL(data.otpauthUrl, { width: 220, margin: 1 })
      setTotpSetup({ secret: data.secret, qrCode })
      setTotpSetupCode('')
    } catch {
      setMessage({ type: 'error', text: 'No se pudo generar el código QR. Inténtalo de nuevo.' })
    } finally {
      setTotpBusy(false)
    }
  }

  const confirmTotpSetup = async () => {
    setMessage(null)
    setTotpBusy(true)
    try {
      const response = await fetch(`${API}/api/users/${user.id}/totp/verify-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: totpSetupCode }),
      })
      const data = await response.json()
      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'No se pudo confirmar la configuración.' })
        return
      }
      setTwoFactorEnabled(true)
      setTotpSetup(null)
      setTotpPassword('')
      setTotpSetupCode('')
      onProfileUpdate({ ...user, twoFactorEnabled: true })
      setMessage({ type: 'success', text: 'Microsoft Authenticator quedó configurado correctamente.' })
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al confirmar la configuración.' })
    } finally {
      setTotpBusy(false)
    }
  }

  const disableTotp = async () => {
    setMessage(null)
    setTotpBusy(true)
    try {
      const response = await fetch(`${API}/api/users/${user.id}/totp/disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: totpPassword, code: totpCode }),
      })
      const data = await response.json()
      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'No se pudo desactivar la verificación.' })
        return
      }
      setTwoFactorEnabled(false)
      setTotpPassword('')
      setTotpCode('')
      onProfileUpdate({ ...user, twoFactorEnabled: false })
      setMessage({ type: 'success', text: 'La autenticación de dos pasos fue desactivada.' })
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al desactivar la verificación.' })
    } finally {
      setTotpBusy(false)
    }
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
        profileImage: profileImage.startsWith('data:image/')
          ? profileImage
          : updated.profile_image_url || profileImage,
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
            <div><span className="profile-summary-label">Usuario</span><span>{username}</span></div>
            <div><span className="profile-summary-label">Acceso</span><span className="profile-role">{user.role === 'admin' ? 'Administrador' : user.role === 'owner' ? 'Propietario' : 'Usuario'}</span></div>
          </div>

          <h2 className="profile-form-title">Información personal</h2>

          <div className="settings-field settings-file-field">
            <label htmlFor="settings-profile-image">Foto de perfil</label>
            <div className="settings-image-picker">
              <span className="settings-image-preview">
                {profileImage ? <img src={profileImage} alt="Previsualización" /> : <i className="fa fa-user" aria-hidden="true" />}
              </span>

              <label className="settings-upload-box" htmlFor="settings-profile-image">
                <span className="settings-upload-copy">
                  <strong>Cambia tu foto de perfil</strong>
                  <span>JPG, PNG o WebP · Máximo 5 MB</span>
                </span>
                <span className="settings-upload-actions">
                  <span className="settings-upload-button"><i className="fa fa-upload" aria-hidden="true" /> Elegir imagen</span>
                  <span className="settings-upload-name">{profileImageName || 'Ningún archivo seleccionado'}</span>
                </span>
              </label>

              <input
                id="settings-profile-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
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
                  placeholder="Tu ciudad"
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

            <section className="settings-two-factor" aria-labelledby="settings-two-factor-title">
              <h2 id="settings-two-factor-title" className="profile-form-title">Autenticación de dos pasos</h2>
              <p>
                Estado: <strong>{twoFactorEnabled ? 'Activada' : 'Desactivada'}</strong>
              </p>
              {!twoFactorEnabled && !totpSetup && (
                <>
                  <p>Configúrala con Microsoft Authenticator u otra aplicación compatible con códigos TOTP.</p>
                  <p>Conserva acceso a tu aplicación: actualmente no hay códigos de recuperación automáticos.</p>
                  <div className="settings-field">
                    <label htmlFor="settings-totp-password">Confirma tu contraseña</label>
                    <input
                      id="settings-totp-password"
                      type="password"
                      autoComplete="current-password"
                      value={totpPassword}
                      onChange={(event) => setTotpPassword(event.target.value)}
                    />
                  </div>
                  <button type="button" className="btn btn-primary" disabled={totpBusy || !totpPassword} onClick={() => void startTotpSetup()}>
                    {totpBusy ? 'Preparando...' : 'Configurar Microsoft Authenticator'}
                  </button>
                </>
              )}
              {totpSetup && (
                <div className="settings-totp-setup">
                  <p>Escanea este código QR con Microsoft Authenticator y luego introduce el código que aparece en la aplicación.</p>
                  <img className="settings-totp-qr" src={totpSetup.qrCode} alt="Código QR de configuración de Microsoft Authenticator" />
                  <p className="settings-totp-manual">
                    Si no puedes escanearlo, agrega una cuenta manualmente con esta clave:
                    <code>{totpSetup.secret}</code>
                  </p>
                  <div className="settings-field">
                    <label htmlFor="settings-totp-setup-code">Código de verificación</label>
                    <input
                      id="settings-totp-setup-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={totpSetupCode}
                      onChange={(event) => setTotpSetupCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                  </div>
                  <div className="settings-actions">
                    <button type="button" className="btn btn-primary" disabled={totpBusy || totpSetupCode.length !== 6} onClick={() => void confirmTotpSetup()}>
                      {totpBusy ? 'Verificando...' : 'Verificar y activar'}
                    </button>
                    <button type="button" className="btn btn-secondary" disabled={totpBusy} onClick={() => { setTotpSetup(null); setTotpPassword('') }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
              {twoFactorEnabled && (
                <>
                  <p>Al iniciar sesión necesitarás tu contraseña y el código temporal de la aplicación.</p>
                  <div className="settings-field">
                    <label htmlFor="settings-totp-disable-password">Confirma tu contraseña para desactivar</label>
                    <input
                      id="settings-totp-disable-password"
                      type="password"
                      autoComplete="current-password"
                      value={totpPassword}
                      onChange={(event) => setTotpPassword(event.target.value)}
                    />
                  </div>
                  <div className="settings-field">
                    <label htmlFor="settings-totp-disable-code">Código actual de Authenticator</label>
                    <input
                      id="settings-totp-disable-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={totpCode}
                      onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                  </div>
                  <button type="button" className="btn btn-secondary" disabled={totpBusy || !totpPassword || totpCode.length !== 6} onClick={() => void disableTotp()}>
                    {totpBusy ? 'Desactivando...' : 'Desactivar autenticación de dos pasos'}
                  </button>
                </>
              )}
            </section>

            {message && (
              <div className={`settings-message settings-message--${message.type}`}>
                {message.text}
              </div>
            )}

            <div className="settings-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <Link to={user.role === 'admin' ? '/admin' : user.role === 'owner' ? '/owner' : '/dashboard'} className="btn btn-secondary">
                Volver
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import './Settings.css'
import { cacheProfileImageFromUrl, loadCachedProfileImage, removeCachedProfileImage, saveCachedProfileImage } from '../services/profileImageCache'
import { API_BASE_URL, API_UNAVAILABLE_MESSAGE } from '../services/api'
import { containsProfanity } from '../utils/contentValidation'
import PhoneNumberInput from './PhoneNumberInput'
import { isValidColombianMobile, normalizeColombianPhone } from '../utils/phoneValidation'
import { preventDigitKey, preventDigitPaste, removeDigits } from '../utils/textInput'

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
type ProfileTab = 'personal' | 'security' | 'notifications'
type ProfileIconName = 'camera' | 'user' | 'shield' | 'bell'

const profileTabs: { id: ProfileTab; label: string; icon: ProfileIconName }[] = [
  { id: 'personal', label: 'Personal', icon: 'user' },
  { id: 'security', label: 'Seguridad', icon: 'shield' },
  { id: 'notifications', label: 'Notificaciones', icon: 'bell' },
]

function ProfileIcon({ name, size = 20 }: { name: ProfileIconName; size?: number }) {
  const paths = {
    camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    bell: <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />,
  }[name]

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths}
    </svg>
  )
}

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

export default function Settings({ user, onProfileUpdate }: SettingsProps) {
  // Mostrar desde el primer momento los datos que tengamos (props/localStorage)
  const [fullName, setFullName] = useState(() => removeDigits(user.fullName ?? ''))
  const [email, setEmail] = useState(() => user.email ?? '')
  const [username, setUsername] = useState(() => user.username ?? '')
  const [profileImage, setProfileImage] = useState(() => user.profileImage ?? '')
  const [profileImageName, setProfileImageName] = useState('')
  const [removingProfileImage, setRemovingProfileImage] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [phone, setPhone] = useState(() => loadPreferencesFromStorage().phone)
  const [city, setCity] = useState(() => removeDigits(loadPreferencesFromStorage().city))
  const [preferences, setPreferences] = useState(() => loadPreferencesFromStorage().preferences)
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => loadPreferencesFromStorage().notificationsEnabled)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [totpSetup, setTotpSetup] = useState<{ secret: string; qrCode: string } | null>(null)
  const [totpPassword, setTotpPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [totpSetupCode, setTotpSetupCode] = useState('')
  const [totpBusy, setTotpBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<ProfileTab>('personal')
  const profileImageInput = useRef<HTMLInputElement>(null)
  const roleLabel = user.role === 'admin' ? 'Administrador' : user.role === 'owner' ? 'Propietario' : 'Cliente'
  const progressValues = [fullName, email, username, phone, city, profileImage]
  const completionPercent = Math.round((progressValues.filter((value) => value.trim()).length / progressValues.length) * 100)
  const circumference = 2 * Math.PI * 62
  const displayName = fullName || username || 'Tu nombre'
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'WP'

  // Sincronizar con props cuando cambien (ej. al restaurar sesión)
  useEffect(() => {
    setFullName(removeDigits(user.fullName ?? ''))
    setEmail(user.email ?? '')
    setUsername(user.username ?? '')
    setProfileImage(user.profileImage ?? '')
    const stored = loadPreferencesFromStorage()
    setPhone(stored.phone)
    setCity(removeDigits(stored.city))
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
          const image = u.profile_image_url
            ? await loadCachedProfileImage(user.id) || await cacheProfileImageFromUrl(user.id, u.profile_image_url)
            : ''
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
        if (!cancelled) setMessage({ type: 'error', text: API_UNAVAILABLE_MESSAGE })
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

  const handleRemoveProfileImage = async () => {
    setRemovingProfileImage(true)
    try {
      await removeCachedProfileImage(user.id)
      setProfileImage('')
      setProfileImageName('')
      setMessage({ type: 'success', text: 'Foto quitada. Guarda los cambios para aplicar.' })
    } catch (error) {
      console.error('No se pudo quitar la copia local de la foto de perfil:', error)
      setMessage({ type: 'error', text: 'No se pudo quitar la foto de perfil. Inténtalo de nuevo.' })
    } finally {
      setRemovingProfileImage(false)
    }
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
      setMessage({ type: 'error', text: API_UNAVAILABLE_MESSAGE })
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
      setMessage({ type: 'error', text: API_UNAVAILABLE_MESSAGE })
    } finally {
      setTotpBusy(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    if (phone && !isValidColombianMobile(phone)) {
      setMessage({ type: 'error', text: 'Si ingresas un teléfono, debe tener 10 dígitos y comenzar por 3.' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/users/${user.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim() || undefined,
          email: email.trim() || undefined,
          username: username.trim() || undefined,
          profile_image_url: profileImage,
          phone: normalizeColombianPhone(phone),
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
        phone: normalizeColombianPhone(phone),
        city,
        preferences,
        notificationsEnabled,
        twoFactorEnabled: Boolean(updated.two_factor_enabled),
        profileImage: profileImage.startsWith('data:image/')
          ? profileImage
          : updated.profile_image_url || profileImage,
      })
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ phone: normalizeColombianPhone(phone), city, preferences, notificationsEnabled }))
      setMessage({ type: 'success', text: 'Datos guardados correctamente' })
    } catch {
      setMessage({ type: 'error', text: API_UNAVAILABLE_MESSAGE })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="with-sidebar">
      <div className="settings-page profile-page">
        <main className="profile-design">
          <header className="profile-top">
            <span className="profile-top-kicker">Cuenta WorkPalace</span>
            <h1>Mi perfil</h1>
            <p>Administra tus datos, tu seguridad y cómo te avisamos.</p>
          </header>

          <div className="profile-grid">
            <aside className="profile-identity">
              <div className="profile-avatar-ring">
                <svg className="profile-avatar-progress" viewBox="0 0 140 140" aria-hidden="true">
                  <circle cx="70" cy="70" r="62" className="profile-avatar-track" />
                  <circle
                    cx="70"
                    cy="70"
                    r="62"
                    className="profile-avatar-meter"
                    style={{
                      strokeDasharray: circumference,
                      strokeDashoffset: circumference * (1 - completionPercent / 100),
                    }}
                  />
                </svg>
                <button
                  type="button"
                  className="profile-avatar-button"
                  onClick={() => profileImageInput.current?.click()}
                  aria-label="Cambiar foto de perfil"
                >
                  {profileImage ? <img src={profileImage} alt="Foto de perfil" /> : <span>{initials}</span>}
                  <span className="profile-avatar-overlay">
                    <ProfileIcon name="camera" size={24} />
                    <small>Cambiar</small>
                  </span>
                </button>
                <input
                  ref={profileImageInput}
                  id="settings-profile-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleProfileImageChange}
                  className="profile-file-input"
                  tabIndex={-1}
                />
              </div>
              <p className="profile-completion"><strong>{completionPercent}%</strong> del perfil completo</p>
              {profileImageName && <p className="profile-image-name">{profileImageName}</p>}
                {profileImage && (
                  <button
                    type="button"
                    className="profile-image-remove"
                    onClick={() => void handleRemoveProfileImage()}
                    disabled={saving || removingProfileImage}
                  >
                    {removingProfileImage ? 'Quitando...' : 'Quitar foto'}
                  </button>
                )}

              <h2 className="profile-display-name">{displayName}</h2>
              <p className="profile-username">@{username || 'usuario'}</p>
              <span className="profile-role-chip">{roleLabel}</span>

              <div className="profile-security-card">
                <span className="profile-security-icon"><ProfileIcon name="shield" /></span>
                <div>
                  <strong>{twoFactorEnabled ? 'Cuenta protegida' : 'Protege tu cuenta'}</strong>
                  <small>
                    {twoFactorEnabled
                      ? 'La autenticación de dos pasos está activa.'
                      : 'Activa la autenticación de dos pasos para más seguridad.'}
                  </small>
                </div>
                <button type="button" onClick={() => setActiveTab('security')}>
                  {twoFactorEnabled ? 'Ver' : 'Configurar'}
                </button>
              </div>
            </aside>

            <section className="profile-content" aria-label="Configuración del perfil">
              <div className="profile-tabs" role="tablist" aria-label="Secciones del perfil" data-tab={activeTab}>
                <span className="profile-tabs-indicator" aria-hidden="true" />
                {profileTabs.map((tab) => (
                  <button
                    key={tab.id}
                    id={`settings-tab-${tab.id}`}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    aria-controls={`settings-panel-${tab.id}`}
                    className={activeTab === tab.id ? 'is-active' : ''}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <ProfileIcon name={tab.icon} size={18} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="profile-view">
                {activeTab === 'personal' && (
                  <section className="profile-panel" id="settings-panel-personal" role="tabpanel" aria-labelledby="settings-tab-personal">
                    <header className="profile-panel-heading">
                      <div>
                        <h2>Información personal</h2>
                        <p>Mantén actualizados los datos de tu cuenta.</p>
                      </div>
                    </header>
                    {loading && <p className="settings-loading">Actualizando datos...</p>}
                    <form onSubmit={handleSubmit} className="settings-form profile-form">
                      <div className="settings-field">
                        <label htmlFor="settings-fullName">Nombre completo</label>
                        <input
                          id="settings-fullName"
                          type="text"
                          value={fullName}
                          onKeyDown={preventDigitKey}
                          onPaste={preventDigitPaste}
                          onChange={(event) => setFullName(removeDigits(event.target.value))}
                          placeholder="Tu nombre completo"
                          autoComplete="name"
                        />
                      </div>
                      <div className="settings-field">
                        <label htmlFor="settings-email">Correo electrónico</label>
                        <input
                          id="settings-email"
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="correo@ejemplo.com"
                          autoComplete="email"
                        />
                      </div>
                      <div className="settings-field">
                        <label htmlFor="settings-username">Usuario</label>
                        <input
                          id="settings-username"
                          type="text"
                          value={username}
                          onChange={(event) => setUsername(event.target.value)}
                          placeholder="nombre_de_usuario"
                          autoComplete="username"
                        />
                      </div>
                      <div className="settings-row">
                        <div className="settings-field settings-field--half">
                          <label htmlFor="settings-phone">Teléfono</label>
                          <PhoneNumberInput
                            id="settings-phone"
                            value={phone}
                            onChange={setPhone}
                          />
                        </div>
                        <div className="settings-field settings-field--half">
                          <label htmlFor="settings-city">Ciudad</label>
                          <input
                            id="settings-city"
                            type="text"
                            value={city}
                            onKeyDown={preventDigitKey}
                            onPaste={preventDigitPaste}
                            onChange={(event) => setCity(removeDigits(event.target.value))}
                            placeholder="Tu ciudad"
                            autoComplete="address-level2"
                          />
                        </div>
                      </div>
                      <div className="settings-field">
                        <label htmlFor="settings-preferences">Preferencias de uso</label>
                        <textarea
                          id="settings-preferences"
                          value={preferences}
                          onChange={(event) => setPreferences(event.target.value)}
                          placeholder="Trabajo remoto, reuniones, sesiones creativas..."
                          rows={3}
                        />
                      </div>
                      <div className="settings-actions profile-actions">
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                          {saving ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                        <Link to={user.role === 'admin' ? '/admin' : user.role === 'owner' ? '/owner' : '/dashboard'} className="btn btn-secondary">
                          Volver
                        </Link>
                      </div>
                    </form>
                  </section>
                )}

                {activeTab === 'security' && (
                  <section className="profile-panel" id="settings-panel-security" role="tabpanel" aria-labelledby="settings-tab-security">
                    <header className="profile-panel-heading">
                      <div>
                        <h2>Seguridad de la cuenta</h2>
                        <p>Protege el acceso a tu cuenta de WorkPalace.</p>
                      </div>
                      <span className={`profile-status${twoFactorEnabled ? ' is-on' : ''}`}>
                        {twoFactorEnabled ? 'Activada' : 'Desactivada'}
                      </span>
                    </header>
                    <section className="settings-two-factor" aria-labelledby="settings-two-factor-title">
                      <h3 id="settings-two-factor-title" className="profile-panel-subtitle">Autenticación de dos pasos</h3>
                      <p>
                        {twoFactorEnabled
                          ? 'Al iniciar sesión necesitarás tu contraseña y el código temporal de tu aplicación.'
                          : 'Configúrala con Microsoft Authenticator u otra aplicación compatible con códigos TOTP.'}
                      </p>
                      {!twoFactorEnabled && !totpSetup && (
                        <>
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
                  </section>
                )}

                {activeTab === 'notifications' && (
                  <section className="profile-panel" id="settings-panel-notifications" role="tabpanel" aria-labelledby="settings-tab-notifications">
                    <header className="profile-panel-heading">
                      <div>
                        <h2>Notificaciones</h2>
                        <p>Elige cómo quieres recibir novedades de tu cuenta.</p>
                      </div>
                    </header>
                    <label className="settings-toggle profile-notification-option">
                      <span>
                        <strong>Notificaciones y recordatorios por correo</strong>
                        <small>Recibe actualizaciones sobre tus reservas y actividad.</small>
                      </span>
                      <input
                        type="checkbox"
                        checked={notificationsEnabled}
                        onChange={(event) => setNotificationsEnabled(event.target.checked)}
                      />
                    </label>
                  </section>
                )}
              </div>

              {message && (
                <div className={`settings-message settings-message--${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>
                  {message.text}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

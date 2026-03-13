import { useState, useEffect } from 'react'
import './App.css'

import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom'
import Login from './components/Login.tsx'
import Signup from './components/Signup.tsx'
import ForgotPassword from './components/ForgotPassword.tsx'
import Navbar from './components/Navbar'
import Dashboard from './components/Dashboard'
import AdminDashboard from './components/AdminDashboard'
import Settings from './components/Settings'
import Checkout from './components/Checkout'

const API = 'http://localhost:3001'

interface Place {
  id: number
  name: string
  tipo: string
  barrio: string | null
  ciudad: string | null
  capacidad: string | null
  precio_hora: number | null
  modalidad: string | null
  caracteristicas: string | null
  nivel_ruido: string | null
}

function Landing({
  isDark,
  setIsDark,
  user,
}: {
  isDark: boolean
  setIsDark: (value: boolean) => void
  user?: { id?: number; username: string; role?: string; fullName?: string; email?: string } | null
}) {
  const navigate = useNavigate()
  const [places, setPlaces] = useState<Place[]>([])
  const [loadingSpaces, setLoadingSpaces] = useState(true)
  const [spacesError, setSpacesError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchPlaces() {
      try {
        const res = await fetch(`${API}/api/places`)
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setSpacesError(data.error || 'Error al cargar espacios disponibles')
          return
        }
        setPlaces(data.places || [])
      } catch (_e) {
        if (!cancelled) setSpacesError('No se pudieron cargar los espacios disponibles.')
      } finally {
        if (!cancelled) setLoadingSpaces(false)
      }
    }
    fetchPlaces()
    return () => { cancelled = true }
  }, [])

  function handleReserve(placeId: number) {
    if (user && user.id != null) {
      navigate(`/checkout/${placeId}`)
    } else {
      const redirect = encodeURIComponent(`/checkout/${placeId}`)
      navigate(`/login?redirect=${redirect}`)
    }
  }

  return (
    <>
      {/* shared header/navigation */}
      <Navbar isDark={isDark} setIsDark={setIsDark} user={user || undefined} />

      {/* Hero Section */}
      <section className="hero">
        <h1>Bienvenido a WorkPalace</h1>
        <p>Encuentra espacios productivos en Medellín y resérvalos solo por el tiempo que necesitas.</p>
        {!user && (
          <div className="hero-buttons">
            <Link to="/signup" className="btn btn-primary">Crear cuenta gratis</Link>
            <Link to="/login" className="btn btn-secondary">Iniciar sesión</Link>
          </div>
        )}
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="features-container">
          <h2 className="section-title">Cómo funciona WorkPalace</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>Búsqueda filtrada de espacios</h3>
              <p>Encuentra el espacio ideal filtrando por tipo de lugar, ubicación en Medellín y equipamiento disponible. Estudios, cocinas, talleres y más, al alcance de tu mano.</p>
            </div>

            <div className="feature-card">
              <h3>Reservas flexibles</h3>
              <p>Reserva por horas, media jornada o jornada completa según lo que necesites. Sin contratos largos ni grandes inversiones, solo el tiempo que realmente usas.</p>
            </div>

            <div className="feature-card">
              <h3>Disponibilidad en tiempo real</h3>
              <p>Consulta la disponibilidad de cualquier espacio en tiempo real y confirma tu reserva al instante o solicita aprobación del propietario según el tipo de espacio.</p>
            </div>

            <div className="feature-card">
              <h3>Pagos y seguridad integrados</h3>
              <p>Sistema de pago integrado y verificación de identidad para arrendadores y arrendatarios. Confianza y trazabilidad en cada transacción.</p>
            </div>

            <div className="feature-card">
              <h3>Comunicación directa</h3>
              <p>Chat interno para coordinar todos los detalles con el dueño del espacio antes y durante tu reserva. Sin intermediarios innecesarios.</p>
            </div>

            <div className="feature-card">
              <h3>Reseñas y calificaciones</h3>
              <p>Sistema de reseñas bidireccional entre arrendadores y arrendatarios para construir una comunidad confiable y transparente en Medellín.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo spaces grid (containers by characteristics) */}
      <section className="features" id="explore-spaces">
        <div className="features-container">
          <h2 className="section-title">Explora espacios disponibles</h2>
          <p style={{ marginBottom: '1.5rem', maxWidth: 720 }}>
            Estos son los espacios publicados en la plataforma.
            {!user && (
              <>
                {' '}Para crear una reserva nueva debes
                <Link to="/login" style={{ marginLeft: 4 }}>iniciar sesión</Link>.
              </>
            )}
          </p>

          {spacesError && <p className="reservations-error">{spacesError}</p>}
          {loadingSpaces ? (
            <p className="settings-loading">Cargando espacios disponibles...</p>
          ) : (
            <div className="features-grid">
              {places.length === 0 ? (
                <p style={{ padding: '1.5rem 0', color: '#666' }}>
                  No hay espacios registrados aún en la base de datos.
                </p>
              ) : (
                places.map(place => (
                  <div key={place.id} className="feature-card">
                    <h3>{place.tipo}</h3>
                    <p style={{ fontWeight: 600, marginBottom: '0.35rem' }}>{place.name}</p>
                    <p style={{ marginBottom: '0.35rem' }}>
                      {[place.barrio, place.ciudad].filter(Boolean).join(', ')}
                    </p>
                    <p style={{ marginBottom: '0.35rem' }}>
                      <strong>Capacidad:</strong> {place.capacidad ?? 'Sin especificar'}
                    </p>
                    <p style={{ marginBottom: '0.35rem' }}>
                      <strong>Modalidad:</strong> {place.modalidad ?? 'Consultar disponibilidad'}
                    </p>
                    <p style={{ marginBottom: '0.75rem' }}>
                      <strong>Precio de referencia:</strong>{' '}
                      {place.precio_hora != null
                        ? `$${place.precio_hora.toLocaleString('es-CO')} / hora`
                        : 'A convenir'}
                    </p>
                    {place.caracteristicas && (
                      <p style={{ marginBottom: '0.75rem' }}>
                        <strong>Características:</strong> {place.caracteristicas}
                      </p>
                    )}
                    {place.nivel_ruido && (
                      <p style={{ marginBottom: '0.75rem', fontSize: '0.85rem', opacity: 0.85 }}>
                        Nivel de ruido: {place.nivel_ruido}
                      </p>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.85rem' }}>
                        {user ? 'Confirma los datos y simula tu pago para reservar.' : 'Inicia sesión para reservar este tipo de espacio.'}
                      </span>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleReserve(place.id)}
                      >
                        {user ? 'Reserva ya' : 'Iniciar sesión para reservar'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </section>

      {/* Content Section */}
      <section className="content-section" id="about">
        <div className="content-container">
          <h2>Acerca de WorkPalace</h2>
          <p>
            WorkPalace nació para resolver un problema real en Medellín: muchos profesionales independientes, emprendedores y creativos 
            necesitan espacios especializados para trabajar, como estudios de grabación, cocinas industriales o talleres de carpintería, 
            pero acceder a ellos de forma permanente es costoso e inviable para la mayoría.
          </p>
          <p>
            Al mismo tiempo, estos espacios permanecen vacíos durante horas o días enteros, representando una pérdida de oportunidades 
            para sus propietarios. WorkPalace conecta ambas partes: los dueños de espacios infrautilizados con quienes los necesitan 
            temporalmente, generando ingresos para unos y acceso a infraestructura productiva para otros.
          </p>
          <p>
            Nuestra misión es ser la plataforma de referencia en Medellín para el alquiler temporal de espacios productivos, 
            impulsando el talento local y el emprendimiento bajo un modelo flexible, seguro y pensado para las dinámicas del trabajo independiente de hoy.
          </p>
        </div>
      </section>
      {/* Contact Section (debajo de "Acerca de") */}
      <section className="contact-section" id="contact">
        <div className="content-container">
          <h2>Contacto</h2>
          
          <div className="contact-card">
            <h3>Daniel Antonio Sarmiento Amador</h3>
            <p>Télefono: <a href="tel:+573225761257">+57 322 5761257</a></p>
            <p>Correo electrónico: <a href="mailto:daniel.antonio1409@gmail.com">daniel.antonio1409@gmail.com</a></p>
          </div>

          <div className="contact-card">
            <h3>Diego Alejandro Morales Gómez</h3>
            <p>Télefono: <a href="tel:+573146449803">+57 314 6449803</a></p>
            <p>Correo electrónico: <a href="mailto:diealemorgom@gmail.com">diealemorgom@gmail.com</a></p>
          </div>

          <div className="contact-card">
            <h3>Erik Anthony Soto Castaño</h3>
            <p>Télefono: <a href="tel:+573022944700">+57 3022944700</a></p>
            <p>Correo electrónico: <a href="mailto:erikluna71easc@gmail.com">erikluna71easc@gmail.com</a></p>
          </div>
          <div className="contact-card">
            <h3>Juan José Pulido Bustamante</h3>
            <p>Télefono: <a href="tel:+573006618262">+57 3006618262</a></p>
            <p>Correo electrónico: <a href="mailto:Juanjpulido.57@gmail.com">Juanjpulido.57@gmail.com</a></p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="site-footer">
        <p>&copy; 2026 WorkPalace. Todos los derechos reservados.</p>
        <p>Conectando talento con espacios en Medellín</p>
      </footer>
    </>
  )
}

// Dashboard component moved to its own file
// (see src/components/Dashboard.tsx)

const STORAGE_KEY = 'workpalace-user'

function loadStoredUser(): { id: number; username: string; role?: string; fullName?: string; email?: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const u = JSON.parse(raw)
    if (!u || typeof u.username !== 'string' || typeof u.id !== 'number') return null
    return {
      id: u.id,
      username: u.username,
      role: u.role,
      fullName: u.fullName,
      email: u.email,
    }
  } catch {
    return null
  }
}

function saveUser(user: { id?: number; username: string; role?: string; fullName?: string; email?: string } | null) {
  if (!user) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    id: user.id,
    username: user.username,
    role: user.role,
    fullName: user.fullName,
    email: user.email,
  }))
}

function App() {
  const [user, setUser] = useState<{ id?: number; username: string; role?: string; fullName?: string; email?: string } | null>(() => loadStoredUser())
  const [isAdmin, setIsAdmin] = useState(() => {
    const u = loadStoredUser()
    return u?.role === 'admin'
  })
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme-mode')
    return saved ? saved === 'dark' : false
  })

  // Aplicar tema al documento
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    localStorage.setItem('theme-mode', isDark ? 'dark' : 'light')
  }, [isDark])

  // now receive object with id, username, role, fullName, and email
  function handleLogin(userInfo: { id?: number; username: string; role?: string; fullName?: string; email?: string }) {
    setUser(userInfo)
    setIsAdmin(userInfo.role === 'admin')
    saveUser(userInfo)
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
    setIsAdmin(false)
  }

  function handleProfileUpdate(updated: { id: number; username: string; role?: string; fullName?: string; email?: string }) {
    setUser(prev => {
      const next = prev ? { ...prev, ...updated } : null
      if (next) saveUser(next)
      return next
    })
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* public routes */}
        <Route
          path="/"
          element={
            <Landing isDark={isDark} setIsDark={setIsDark} user={user} />
          }
        />
        <Route
          path="/login"
          element={
            user ? (
              isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />
            ) : (
              <div className="auth-layout">
                <Login onLogin={handleLogin} />
              </div>
            )
          }
        />
        <Route
          path="/signup"
          element={
            <div className="auth-layout">
              <Signup />
            </div>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <div className="auth-layout">
              <ForgotPassword />
            </div>
          }
        />

        {/* protected route for regular users */}
        <Route
          path="/dashboard"
          element={
            user && !isAdmin ? (
              <Dashboard user={user!} onLogout={handleLogout} isDark={isDark} setIsDark={setIsDark} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* checkout / simulación de pago */}
        <Route
          path="/checkout/:placeId"
          element={
            user && !isAdmin && user.id != null ? (
              <Checkout user={user} isDark={isDark} setIsDark={setIsDark} />
            ) : user ? (
              <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* admin panel */}
        <Route
          path="/admin"
          element={
            user && isAdmin ? (
              <AdminDashboard user={user!} onLogout={handleLogout} isDark={isDark} setIsDark={setIsDark} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* settings / profile */}
        <Route
          path="/settings"
          element={
            user && user.id != null ? (
              <Settings
                user={{
                  id: user.id,
                  username: user.username,
                  fullName: user.fullName,
                  email: user.email,
                  role: user.role,
                }}
                onLogout={handleLogout}
                onProfileUpdate={handleProfileUpdate}
                isDark={isDark}
                setIsDark={setIsDark}
              />
            ) : user ? (
              <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

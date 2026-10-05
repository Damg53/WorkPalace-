import { useState, useEffect } from 'react'
import './App.css'


import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import Login from './components/Login.tsx'
import Signup from './components/Signup.tsx'
import ForgotPassword from './components/ForgotPassword.tsx'
import Navbar from './components/Navbar'
import Dashboard from './components/Dashboard'
import AdminDashboard from './components/AdminDashboard'
import Settings from './components/Settings'
import Checkout from './components/Checkout'
import PlacesPage from './components/PlacesPage'
import ContactDock from './components/ContactDock'

function Landing({
  isDark,
  setIsDark,
  user,
  onLogout,
}: {
  isDark: boolean
  setIsDark: (value: boolean) => void
  user?: { id?: number; username: string; role?: string; fullName?: string; email?: string; profileImage?: string; twoFactorEnabled?: boolean } | null
  onLogout?: () => void
}) {
  return (
    <>
      {/* shared header/navigation */}
      <Navbar isDark={isDark} setIsDark={setIsDark} user={user || undefined} onLogout={onLogout} />

      {/* Si el usuario es admin, redirigir al panel de administrador */}
      {user && user.role === 'admin' ? (
        <Navigate to="/admin" replace />
      ) : user && user.role !== 'admin' ? (
        <Navigate to="/places" replace />
      ) : (
        <>
          {/* Hero Section */}
          <section className="hero">
            <h1>Bienvenido a WorkPalace</h1>
            <p>Encuentra espacios productivos en Colombia y resérvalos solo por el tiempo que necesitas.</p>
            <div className="hero-buttons">
              <Link to="/signup" className="btn btn-primary">Crear cuenta gratis</Link>
              <Link to="/login" className="btn btn-secondary">Iniciar sesión</Link>
            </div>
          </section>

          {/* Features Section */}
          <section className="features" id="features">
        <div className="features-container">
          <h2 className="section-title">Cómo funciona WorkPalace</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>Búsqueda filtrada de espacios</h3>
              <p>Encuentra el espacio ideal filtrando por tipo de lugar, ubicación en Colombia y equipamiento disponible. Estudios, cocinas, talleres y más, al alcance de tu mano.</p>
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
              <p>Sistema de reseñas bidireccional entre arrendadores y arrendatarios para construir una comunidad confiable y transparente en Colombia.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="content-section" id="about">
        <div className="content-container">
          <h2>Acerca de WorkPalace</h2>
          <p>
            WorkPalace nació para resolver un problema real en Colombia: muchos profesionales independientes, emprendedores y creativos 
            necesitan espacios especializados para trabajar, como estudios de grabación, cocinas industriales o talleres de carpintería, 
            pero acceder a ellos de forma permanente es costoso e inviable para la mayoría.
          </p>
          <p>
            Al mismo tiempo, estos espacios permanecen vacíos durante horas o días enteros, representando una pérdida de oportunidades 
            para sus propietarios. WorkPalace conecta ambas partes: los dueños de espacios infrautilizados con quienes los necesitan 
            temporalmente, generando ingresos para unos y acceso a infraestructura productiva para otros.
          </p>
          <p>
            Nuestra misión es ser la plataforma de referencia en Colombia para el alquiler temporal de espacios productivos, 
            impulsando el talento local y el emprendimiento bajo un modelo flexible, seguro y pensado para las dinámicas del trabajo independiente de hoy.
          </p>
        </div>
      </section>
      <ContactDock />

          {/* Footer */}
          <footer id="site-footer">
            <p>&copy; 2026 WorkPalace. Todos los derechos reservados.</p>
            <p>Conectando talento con espacios en Colombia</p>
          </footer>
        </>
      )}
    </>
  )
}

// Dashboard component moved a su propio archivo
// (ver src/components/Dashboard.tsx)

const STORAGE_KEY = 'workpalace-user'

function loadStoredUser(): { id: number; username: string; role?: string; fullName?: string; email?: string; profileImage?: string; twoFactorEnabled?: boolean } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const u = JSON.parse(raw)
    if (!u || typeof u.username !== 'string' || typeof u.id !== 'number') return null
    return {
      id: u.id,
      username: u.username,
      role: u.role,
      fullName: u.fullName,
      email: u.email,
      profileImage: u.profileImage,
      twoFactorEnabled: u.twoFactorEnabled,
    }
  } catch {
    return null
  }
}

function saveUser(user: { id?: number; username: string; role?: string; fullName?: string; email?: string; profileImage?: string; twoFactorEnabled?: boolean } | null) {
  if (!user) {
    sessionStorage.removeItem(STORAGE_KEY)
    return
  }

  const safeUser = {
    id: user.id,
    username: user.username,
    role: user.role,
    fullName: user.fullName,
    email: user.email,
    profileImage: user.profileImage || '',
    twoFactorEnabled: user.twoFactorEnabled || false,
  }

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(safeUser))
}

function App() {
  const [user, setUser] = useState<{ id?: number; username: string; role?: string; fullName?: string; email?: string; profileImage?: string; twoFactorEnabled?: boolean } | null>(() => loadStoredUser())
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

  useEffect(() => {
    if (!user?.id) return
    fetch(`http://localhost:3001/api/users/${user.id}/profile`)
      .then((response) => {
        if (response.status === 403 || response.status === 404) {
          setUser(null)
          setIsAdmin(false)
          sessionStorage.removeItem(STORAGE_KEY)
        }
      })
      .catch(() => {})
  }, [user?.id])

  // now receive object with id, username, role, fullName, and email
  function handleLogin(userInfo: { id?: number; username: string; role?: string; fullName?: string; email?: string; profileImage?: string; twoFactorEnabled?: boolean }) {
    setUser(userInfo)
    setIsAdmin(userInfo.role === 'admin')
    saveUser(userInfo)
  }

  function handleLogout() {
    sessionStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('workpalace-user-preferences')
    setUser(null)
    setIsAdmin(false)
  }

  function handleProfileUpdate(updated: { id: number; username: string; role?: string; fullName?: string; email?: string; profileImage?: string; twoFactorEnabled?: boolean }) {
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
            <Landing isDark={isDark} setIsDark={setIsDark} user={user} onLogout={handleLogout} />
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
        <Route
          path="/places"
          element={
            user && !isAdmin ? (
              <PlacesPage user={user!} isDark={isDark} setIsDark={setIsDark} onLogout={handleLogout} />
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
                  profileImage: user.profileImage,
                  twoFactorEnabled: user.twoFactorEnabled,
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

import { useState, useEffect } from 'react'
import './App.css'

import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import Login from './components/Login.tsx'
import Signup from './components/Signup.tsx'
import ForgotPassword from './components/ForgotPassword.tsx'

function Landing({ isDark, setIsDark }: { isDark: boolean; setIsDark: (value: boolean) => void }) {
  return (
    <>
      {/* Header Navigation */}
      <header className="landing-header">
        <nav>
          <div className="logo"> WorkPalace</div>
          <ul className="nav-links">
            <li><a href="#features">Características</a></li>
            <li><a href="#about">Acerca de</a></li>
            <li><a href="#contact">Contacto</a></li>
          </ul>
          <div className="auth-buttons">
            <div className="theme-toggle">
              <input 
                type="checkbox" 
                id="theme-switch" 
                checked={isDark}
                onChange={() => setIsDark(!isDark)}
              />
              <label htmlFor="theme-switch" className="toggle-label">
                <span className="toggle-inner"></span>
                <span className="toggle-icon sun">☀️</span>
                <span className="toggle-icon moon">🌙</span>
              </label>
            </div>
            <Link to="/signup" className="btn btn-secondary">Registrarse</Link>
            <Link to="/login" className="btn btn-primary">Iniciar Sesión</Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <h1>Bienvenido a WorkPalace</h1>
        <p>Tu plataforma colaborativa moderna para maximizar la productividad en equipo</p>
        <div className="hero-buttons">
          <Link to="/signup" className="btn btn-primary">Comenzar Ahora</Link>
          <a href="#about" className="btn btn-secondary">Conocer Más</a>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="features-container">
          <h2 className="section-title">Características Principales</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>Búsqueda Filtrada de Espacios</h3>
              <p>Encuentra el espacio ideal filtrando por tipo de lugar, ubicación en Medellín y equipamiento disponible. Estudios, cocinas, talleres y más, al alcance de tu mano.</p>
            </div>

            <div className="feature-card">
              <h3>Reservas Flexibles</h3>
              <p>Reserva por horas, media jornada o jornada completa según lo que necesites. Sin contratos largos ni grandes inversiones, solo el tiempo que realmente usas.</p>
            </div>

            <div className="feature-card">
              <h3>Disponibilidad en Tiempo Real</h3>
              <p>Consulta la disponibilidad de cualquier espacio en tiempo real y confirma tu reserva al instante o solicita aprobación del propietario según el tipo de espacio.</p>
            </div>

            <div className="feature-card">
              <h3>Pagos y Seguridad Integrados</h3>
              <p>Sistema de pago integrado y verificación de identidad para arrendadores y arrendatarios. Confianza y trazabilidad en cada transacción.</p>
            </div>

            <div className="feature-card">
              <h3>Comunicación Directa</h3>
              <p>Chat interno para coordinar todos los detalles con el dueño del espacio antes y durante tu reserva. Sin intermediarios innecesarios.</p>
            </div>

            <div className="feature-card">
              <h3>Reseñas y Calificaciones</h3>
              <p>Sistema de reseñas bidireccional entre arrendadores y arrendatarios para construir una comunidad confiable y transparente en Medellín.</p>
            </div>
          </div>
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

function Dashboard({ user, onLogout }: { user: string; onLogout: () => void }) {
  return (
    <div className="dashboard-container">
      {/* Header Dashboard */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1 className="dashboard-logo"> WorkPalace</h1>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="user-avatar">{user.charAt(0).toUpperCase()}</span>
            <span className="user-name">{user}</span>
          </div>
          <button className="btn-logout" onClick={onLogout}>Cerrar sesión</button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="sidebar">
        <nav className="sidebar-nav">
          <a href="#home" className="nav-item active">
            <span className="nav-icon">🏠</span>
            <span>Inicio</span>
          </a>
          <a href="#projects" className="nav-item">
            <span className="nav-icon">📁</span>
            <span>Proyectos</span>
          </a>
          <a href="#team" className="nav-item">
            <span className="nav-icon">👥</span>
            <span>Equipo</span>
          </a>
          <a href="#tasks" className="nav-item">
            <span className="nav-icon">✅</span>
            <span>Tareas</span>
          </a>
          <a href="#analytics" className="nav-item">
            <span className="nav-icon">📊</span>
            <span>Análisis</span>
          </a>
          <a href="#settings" className="nav-item">
            <span className="nav-icon">⚙️</span>
            <span>Configuración</span>
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="dashboard-content">
        {/* Welcome Section */}
        <section className="welcome-section">
          <div className="welcome-text">
            <h2>¡Bienvenido de vuelta, {user}!</h2>
            <p>Aquí está un resumen de tu actividad hoy</p>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📁</div>
            <div className="stat-content">
              <h3>Proyectos Activos</h3>
              <p className="stat-number">5</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>Tareas Completadas</h3>
              <p className="stat-number">24</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <h3>Miembros del Equipo</h3>
              <p className="stat-number">8</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🔔</div>
            <div className="stat-content">
              <h3>Nuevas Notificaciones</h3>
              <p className="stat-number">3</p>
            </div>
          </div>
        </section>

        {/* Projects Section */}
        <section className="projects-section">
          <div className="section-header">
            <h2>Tus Proyectos</h2>
            <button className="btn btn-primary">+ Nuevo Proyecto</button>
          </div>

          <div className="projects-grid">
            <div className="project-card">
              <div className="project-header">
                <h3>Sitio Web Corporativo</h3>
                <span className="project-status active">En Progreso</span>
              </div>
              <p className="project-description">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
              <div className="project-footer">
                <div className="project-members">
                  <span className="member-avatar">MJ</span>
                  <span className="member-avatar">AR</span>
                </div>
                <div className="project-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '75%' }}></div>
                  </div>
                  <span className="progress-text">75%</span>
                </div>
              </div>
            </div>

            <div className="project-card">
              <div className="project-header">
                <h3>Aplicación Móvil</h3>
                <span className="project-status active">En Progreso</span>
              </div>
              <p className="project-description">Ut enim ad minim veniam, quis nostrud exercitation ullamco.</p>
              <div className="project-footer">
                <div className="project-members">
                  <span className="member-avatar">JL</span>
                  <span className="member-avatar">CS</span>
                </div>
                <div className="project-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '50%' }}></div>
                  </div>
                  <span className="progress-text">50%</span>
                </div>
              </div>
            </div>

            <div className="project-card">
              <div className="project-header">
                <h3>Dashboard Analítico</h3>
                <span className="project-status completed">Completado</span>
              </div>
              <p className="project-description">Duis aute irure dolor in reprehenderit in voluptate velit.</p>
              <div className="project-footer">
                <div className="project-members">
                  <span className="member-avatar">NA</span>
                  <span className="member-avatar">DB</span>
                </div>
                <div className="project-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '100%' }}></div>
                  </div>
                  <span className="progress-text">100%</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="activity-section">
          <h2>Actividad Reciente</h2>
          <div className="activity-list">
            <div className="activity-item">
              <span className="activity-icon">📝</span>
              <div className="activity-content">
                <p className="activity-title">María actualizó el proyecto <strong>Sitio Web Corporativo</strong></p>
                <p className="activity-time">Hace 2 horas</p>
              </div>
            </div>

            <div className="activity-item">
              <span className="activity-icon">✅</span>
              <div className="activity-content">
                <p className="activity-title">Tarea completada: <strong>Diseño de interfaz</strong></p>
                <p className="activity-time">Hace 5 horas</p>
              </div>
            </div>

            <div className="activity-item">
              <span className="activity-icon">👥</span>
              <div className="activity-content">
                <p className="activity-title">Juan fue agregado al proyecto <strong>Aplicación Móvil</strong></p>
                <p className="activity-time">Hace 1 día</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function App() {
  const [user, setUser] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme-mode')
    return saved ? saved === 'dark' : false
  })

  // Aplicar tema al documento
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    localStorage.setItem('theme-mode', isDark ? 'dark' : 'light')
  }, [isDark])

  function handleLogin(username: string) {
    setUser(username)
  }

  function handleLogout() {
    setUser(null)
  }

  if (!user) {
    // unauthenticated: expose routes for landing, login/signup
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing isDark={isDark} setIsDark={setIsDark} />} />
          <Route path="/login" element={
            <div className="auth-layout">
              <Login onLogin={handleLogin} />
            </div>
          } />
          <Route path="/signup" element={
            <div className="auth-layout">
              <Signup />
            </div>
          } />
          <Route path="/forgot-password" element={
            <div className="auth-layout">
              <ForgotPassword />
            </div>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    )
  }

  // Authenticated user
  return <Dashboard user={user} onLogout={handleLogout} />
}

export default App

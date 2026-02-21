import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import Login from './components/Login.tsx'
import Signup from './components/Signup.tsx'

function Landing() {
  return (
    <>
      {/* Header Navigation */}
      <header className="landing-header">
        <nav>
          <div className="logo">✨ WorkPalace</div>
          <ul className="nav-links">
            <li><a href="#features">Características</a></li>
            <li><a href="#about">Acerca de</a></li>
            <li><a href="#contact">Contacto</a></li>
          </ul>
          <div className="auth-buttons">
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
              <div className="feature-icon">🎯</div>
              <h3>Gestión de Proyectos</h3>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>Colaboración en Tiempo Real</h3>
              <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Análisis y Reportes</h3>
              <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Seguridad Avanzada</h3>
              <p>Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Rendimiento Óptimo</h3>
              <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🚀</div>
              <h3>Escalabilidad</h3>
              <p>Totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="content-section" id="about">
        <div className="content-container">
          <h2>Acerca de WorkPalace</h2>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
          <p>
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat 
            cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          </p>
          <p>
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa 
            quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact">
        <p>&copy; 2026 WorkPalace. Todos los derechos reservados.</p>
        <p>Construido con ❤️ para mejorar tu productividad</p>
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
          <h1 className="dashboard-logo">✨ WorkPalace</h1>
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
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    )
  }

  // Authenticated user
  return <Dashboard user={user} onLogout={handleLogout} />
}

export default App

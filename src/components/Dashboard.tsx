import Navbar from './Navbar'
import { Link } from 'react-router-dom'
import './Landing.css'   // reuse landing styles for dashboard

interface DashboardProps {
  user: { username: string; role?: string }
  onLogout: () => void
  isDark: boolean
  setIsDark: (value: boolean) => void
}

export default function Dashboard({ user, onLogout, isDark, setIsDark }: DashboardProps) {
  return (
    <>
      <Navbar isDark={isDark} setIsDark={setIsDark} user={user} onLogout={onLogout} />

      {/* Hero-like welcome */}
      <section className="hero">
        <h1>Hola, {user.username}</h1>
        <p>Bienvenido a tu panel de control</p>
        <div className="hero-buttons">
          <Link to="/" className="btn btn-secondary" onClick={onLogout}>Cerrar sesión</Link>
        </div>
      </section>

      {/* Simple stats section styled like features */}
      <section className="features" id="stats">
        <div className="features-container">
          <h2 className="section-title">Resumen</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>Proyectos Activos</h3>
              <p>5</p>
            </div>
            <div className="feature-card">
              <h3>Tareas Completadas</h3>
              <p>24</p>
            </div>
            <div className="feature-card">
              <h3>Miembros</h3>
              <p>8</p>
            </div>
            <div className="feature-card">
              <h3>Notificaciones Nuevas</h3>
              <p>3</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer reuse landing footer */}
      <footer id="site-footer">
        <p>&copy; 2026 WorkPalace. Todos los derechos reservados.</p>
        <p>Panel de usuario</p>
      </footer>
    </>
  )
}

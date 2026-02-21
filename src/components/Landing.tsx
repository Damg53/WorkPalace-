import { Link } from 'react-router-dom'
import './Landing.css'

export default function Landing() {
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

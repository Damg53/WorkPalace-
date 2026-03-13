import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react';
import UserMenu from './UserMenu';

interface NavbarProps {
  isDark: boolean
  setIsDark: (value: boolean) => void
  user?: { username: string; role?: string }
  onLogout?: () => void
}

export default function Navbar({ isDark, setIsDark, user, onLogout }: NavbarProps) {
  const [visible, setVisible] = useState(true);

  // hide on scroll down, show on scroll up (with some threshold)
  useEffect(() => {
    let lastY = window.scrollY;
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastY && currentY > 50) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      lastY = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`landing-header ${visible ? '' : 'hidden'}`}> 
      <nav>
        <div className="logo">✨ WorkPalace</div>
        <ul className="nav-links">
          {user ? (
            <>
              {user.role !== 'admin' && (
                <>
                  <li><Link to="/">Disponibles</Link></li>
                  <li><Link to="/dashboard">Mis reservas</Link></li>
                </>
              )}
              <li><Link to="/settings">Perfil</Link></li>
            </>
          ) : (
            <>
              <li><a href="#features">Características</a></li>
              <li><a href="#about">Acerca de</a></li>
              <li><a href="#contact">Contacto</a></li>
            </>
          )}
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

          {user ? (
            <UserMenu user={user} onLogout={onLogout} />
          ) : (
            <>
              <Link to="/signup" className="btn btn-secondary">Registrarse</Link>
              <Link to="/login" className="btn btn-primary">Iniciar Sesión</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}

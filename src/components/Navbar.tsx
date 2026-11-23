import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import UserMenu from './UserMenu'
import './navbar.css'

interface NavbarProps {
  isDark: boolean
  setIsDark: (value: boolean) => void
  user?: { username: string; role?: string }
  onLogout?: () => void
}

interface NavigationItem {
  label: string
  href: string
  route?: boolean
}

const publicLinks: NavigationItem[] = [
  { label: 'Espacios', href: '#features' },
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Acerca de', href: '#about' },
  { label: 'Contacto', href: '#contact' },
]

const MoonIcon = () => (
  <svg className="luna" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" />
  </svg>
)

const SunIcon = () => (
  <svg className="sol" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </svg>
)

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

export default function Navbar({ isDark, setIsDark, user, onLogout }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeLink, setActiveLink] = useState<string | null>(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8)
    const closeOnResize = () => {
      if (window.innerWidth > 880) setMenuOpen(false)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', closeOnResize)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', closeOnResize)
    }
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  const navigationLinks: NavigationItem[] = user
    ? [
      ...(user.role !== 'admin'
        ? [
          { label: 'Disponibles', href: '/', route: true },
          { label: 'Mis reservas', href: '/dashboard', route: true },
        ]
        : []),
      { label: 'Perfil', href: '/settings', route: true },
    ]
    : publicLinks

  const selectLink = (href: string) => {
    setActiveLink(href)
    setMenuOpen(false)
  }

  const renderLinks = (className: string) => navigationLinks.map((item) => {
    const linkProps = {
      className,
      'aria-current': activeLink === item.href ? 'page' as const : undefined,
      onClick: () => selectLink(item.href),
    }
    return item.route
      ? <Link key={item.href} to={item.href} {...linkProps}>{item.label}</Link>
      : <a key={item.href} href={item.href} {...linkProps}>{item.label}</a>
  })

  return (
    <header className={`pn${scrolled ? ' pn--scrolled' : ''}`}>
      <div className="pn-bar">
        <Link to="/" className="pn-brand" aria-label="WorkPalace, página de inicio">
          <img className="brand-logo-dark" src="/workpalace-logo-dark.png" alt="" aria-hidden="true" />
          <img className="brand-logo-light" src="/workpalace-logo-light.png" alt="" aria-hidden="true" />
        </Link>

        <nav className="pn-links" aria-label="Principal">
          {renderLinks('')}
        </nav>

        <div className="pn-actions">
          <button
            type="button"
            className="pn-theme"
            role="switch"
            aria-checked={isDark}
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            onClick={() => setIsDark(!isDark)}
          >
            <i><MoonIcon /><SunIcon /></i>
          </button>
          {user ? (
            <div className="pn-user"><UserMenu user={user} onLogout={onLogout} /></div>
          ) : (
            <>
              <Link className="pn-btn pn-btn--ghost" to="/signup">Registrarse</Link>
              <Link className="pn-btn pn-btn--solid" to="/login">Iniciar sesión<ArrowIcon /></Link>
            </>
          )}
          <button
            type="button"
            className="pn-burger"
            aria-expanded={menuOpen}
            aria-controls="pn-panel"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="pn-panel" id="pn-panel">
          <nav className="pn-mobile-links" aria-label="Menú móvil">
            {renderLinks('pn-l')}
          </nav>
          {!user && (
            <div className="pn-mobile-actions">
              <Link className="pn-btn pn-btn--ghost" to="/signup" onClick={() => setMenuOpen(false)}>Registrarse</Link>
              <Link className="pn-btn pn-btn--solid" to="/login" onClick={() => setMenuOpen(false)}>Iniciar sesión<ArrowIcon /></Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}

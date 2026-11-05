import { NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import './Sidebar.css'

interface SidebarProps {
  user: { id?: number; username: string; role?: string; fullName?: string; profileImage?: string }
  isDark: boolean
  setIsDark: (value: boolean) => void
  onLogout: () => void
}

const userItems = [
  { label: 'Buscar espacios', icon: 'fa-search', to: '/places' },
  { label: 'Mis reservas', icon: 'fa-calendar', to: '/dashboard' },
  { label: 'Mi perfil', icon: 'fa-user', to: '/settings' },
]

const adminItems = [
  { label: 'Panel general', icon: 'fa-dashboard', to: '/admin', section: 'dashboard' },
  { label: 'Usuarios', icon: 'fa-users', to: '/admin#users', section: 'users' },
  { label: 'Reservas', icon: 'fa-calendar', to: '/admin#reservations', section: 'reservations' },
  { label: 'Espacios', icon: 'fa-home', to: '/admin#places', section: 'places' },
  { label: 'Operaciones', icon: 'fa-cogs', to: '/admin#operations', section: 'operations' },
  { label: 'Mi perfil', icon: 'fa-user', to: '/settings' },
]

export default function Sidebar({ user, isDark, setIsDark, onLogout }: SidebarProps) {
  const isAdmin = user.role === 'admin'
  const items = isAdmin ? adminItems : userItems
  const displayName = user.username
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (isAdmin || !user.id) {
      setUnreadCount(0)
      return
    }

    let active = true
    let requestInProgress = false

    const fetchUnreadCount = async () => {
      if (requestInProgress) return
      requestInProgress = true
      try {
        const response = await fetch(`http://localhost:3001/api/users/${user.id}/notifications`, {
          headers: { 'x-user-id': String(user.id) },
        })
        if (!response.ok) throw new Error('No se pudo consultar el contador de notificaciones.')
        const data = await response.json()
        if (active) setUnreadCount(Number(data.unreadCount) || 0)
      } catch (error) {
        console.error('Error actualizando el indicador de notificaciones:', error)
      } finally {
        requestInProgress = false
      }
    }

    const onNotificationsUpdated = () => void fetchUnreadCount()
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void fetchUnreadCount()
    }

    void fetchUnreadCount()
    const intervalId = window.setInterval(fetchUnreadCount, 60000)
    window.addEventListener('workpalace-notifications-updated', onNotificationsUpdated)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      active = false
      window.clearInterval(intervalId)
      window.removeEventListener('workpalace-notifications-updated', onNotificationsUpdated)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [isAdmin, user.id])

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <img className="sidebar-brand-mark brand-logo-dark" src="/workpalace-logo-dark.png" alt="" aria-hidden="true" />
        <img className="sidebar-brand-mark brand-logo-light" src="/workpalace-logo-light.png" alt="" aria-hidden="true" />
        <span className="sidebar-brand-text">WorkPalace</span>
      </div>

      <nav className="sidebar-nav" aria-label="Navegación principal">
        <span className="sidebar-section-title">Menú</span>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => {
              const sectionIsActive = 'section' in item
                ? location.pathname === '/admin' && (location.hash.slice(1) || 'dashboard') === item.section
                : isActive
              return `sidebar-link ${sectionIsActive ? 'active' : ''}`
            }}
          >
            <i className={`fa ${item.icon}`} aria-hidden="true" />
            <span>{item.label}</span>
            {!isAdmin && item.to === '/dashboard' && unreadCount > 0 && (
              <span className="sidebar-notification-badge" aria-label={`${unreadCount} notificaciones sin leer`}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-profile">
          <div className="sidebar-avatar">
            {user.profileImage ? (
              <img src={user.profileImage} alt="Foto de perfil" className="sidebar-avatar-image" />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <strong>{displayName}</strong>
            <span>{isAdmin ? 'Administrador' : 'Usuario'}</span>
          </div>
        </div>
        <button className="sidebar-link sidebar-action" type="button" onClick={() => setIsDark(!isDark)}>
          <i className={`fa ${isDark ? 'fa-sun-o' : 'fa-moon-o'}`} aria-hidden="true" />
          <span>{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
        </button>
        <button className="sidebar-link sidebar-action sidebar-logout" type="button" onClick={onLogout}>
          <i className="fa fa-sign-out" aria-hidden="true" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}
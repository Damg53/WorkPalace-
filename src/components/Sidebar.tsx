import { type CSSProperties, type ReactNode, useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { API_BASE_URL } from '../services/api'
import './Sidebar.css'

interface SidebarProps {
  user: { id?: number; username: string; role?: string; fullName?: string; email?: string; profileImage?: string }
  isDark: boolean
  setIsDark: (value: boolean) => void
  onLogout: () => void
}

type IconName = 'compass' | 'calendar' | 'heart' | 'chat' | 'grid' | 'building' | 'sliders' | 'activity' | 'moon' | 'sun' | 'logout' | 'chevron' | 'spark' | 'user' | 'menu' | 'close'
interface SidebarItem {
  id: string
  label: string
  icon: IconName
  to: string
  section?: string
}

const userItems: SidebarItem[] = [
  { id: 'explorar', label: 'Explorar', icon: 'compass', to: '/places' },
  { id: 'reservas', label: 'Mis reservas', icon: 'calendar', to: '/dashboard#stats' },
  { id: 'favoritos', label: 'Favoritos y avisos', icon: 'heart', to: '/dashboard#favorites-and-notifications' },
]

const ownerItems: SidebarItem[] = [
  { id: 'panel', label: 'Panel', icon: 'grid', to: '/owner' },
  { id: 'espacios', label: 'Mis espacios', icon: 'building', to: '/owner#places' },
  { id: 'mis-reservas', label: 'Mis reservas', icon: 'calendar', to: '/dashboard#stats' },
  { id: 'reservas', label: 'Solicitudes', icon: 'spark', to: '/owner#owner-reservations' },
  { id: 'explorar', label: 'Explorar espacios', icon: 'compass', to: '/places' },
  { id: 'avisos', label: 'Favoritos y avisos', icon: 'heart', to: '/dashboard#favorites-and-notifications' },
]

const adminItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Panel general', icon: 'grid', to: '/admin', section: 'dashboard' },
  { id: 'users', label: 'Usuarios', icon: 'user', to: '/admin#users', section: 'users' },
  { id: 'reservations', label: 'Reservas', icon: 'calendar', to: '/admin#reservations', section: 'reservations' },
  { id: 'places', label: 'Espacios', icon: 'building', to: '/admin#places', section: 'places' },
  { id: 'operations', label: 'Operaciones', icon: 'activity', to: '/admin#operations', section: 'operations' },
]

const iconPaths: Record<IconName, ReactNode> = {
  compass: <><circle cx="12" cy="12" r="10" /><polygon points="16.2 7.8 14.1 14.1 7.8 16.2 9.9 9.9 16.2 7.8" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  heart: <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z" />,
  chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>,
  building: <><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" /></>,
  sliders: <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />,
  activity: <path d="M3 3v18h18M7 14l4-4 4 4 6-7" />,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" /></>,
  logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  chevron: <path d="m15 18-6-6 6-6" />,
  spark: <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  close: <><path d="m18 6-12 12M6 6l12 12" /></>,
}

function Icon({ name }: { name: IconName }) {
  return (
    <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPaths[name]}
    </svg>
  )
}

function readCollapsedPreference() {
  try {
    return localStorage.getItem('wp-sb-mini') === 'true'
  } catch {
    return false
  }
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'WP'
}

function useMobile(px = 820) {
  const query = `(max-width: ${px}px)`
  const [mobile, setMobile] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMobile(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])
  return mobile
}

export default function Sidebar({ user, isDark, setIsDark, onLogout }: SidebarProps) {
  const isMobile = useMobile()
  const isAdmin = user.role === 'admin'
  const isOwner = user.role === 'owner'
  const roleLabel = isAdmin ? 'Administrador' : isOwner ? 'Propietario' : 'Cliente'
  const roleInitial = isAdmin ? 'A' : isOwner ? 'P' : 'C'
  const [mini, setMini] = useState(readCollapsedPreference)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [pendingRequestCount, setPendingRequestCount] = useState(0)
  const location = useLocation()
  const displayName = user.fullName || user.username
  const compact = mini && !isMobile
  const role = isAdmin ? 'administrador' : isOwner ? 'propietario' : 'cliente'
  const items = isAdmin ? adminItems : isOwner ? ownerItems : userItems
  const activeSection = location.pathname === '/admin' ? location.hash.slice(1) || 'dashboard' : ''
  const isItemActive = (item: SidebarItem) => {
    if (item.section) return activeSection === item.section
    const [path, hash] = item.to.split('#')
    return location.pathname === path && (hash ? location.hash === `#${hash}` : !location.hash)
  }
  const activeIndex = items.findIndex(isItemActive)

  useEffect(() => {
    try {
      localStorage.setItem('wp-sb-mini', JSON.stringify(mini))
    } catch (error) {
      console.warn('No se pudo guardar el estado del menú lateral:', error)
    }
  }, [mini])

  useEffect(() => {
    if (!isMobile || !mobileOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isMobile, mobileOpen])

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
        const response = await fetch(`${API_BASE_URL}/api/users/${user.id}/notifications`, {
          headers: { 'x-user-id': String(user.id) },
        })
        if (!response.ok) throw new Error('No se pudo consultar el contador de notificaciones.')
        const data = await response.json() as { unreadCount?: number }
        if (active) setUnreadCount(Number(data.unreadCount) || 0)
      } catch (error) {
        console.error('Error actualizando el indicador de notificaciones:', error)
      } finally {
        requestInProgress = false
      }
    }
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void fetchUnreadCount()
    }
    void fetchUnreadCount()
    const intervalId = window.setInterval(fetchUnreadCount, 60000)
    window.addEventListener('workpalace-notifications-updated', fetchUnreadCount)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      active = false
      window.clearInterval(intervalId)
      window.removeEventListener('workpalace-notifications-updated', fetchUnreadCount)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [isAdmin, user.id])

  useEffect(() => {
    if ((!isAdmin && !isOwner) || !user.id) {
      setPendingRequestCount(0)
      return
    }

    let active = true
    let requestInProgress = false
    const fetchPendingRequestCount = async () => {
      if (requestInProgress) return
      requestInProgress = true
      try {
        const endpoint = isAdmin
          ? '/api/admin/reservations/pending-count'
          : '/api/owner/reservations/pending-count'
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          headers: { 'x-user-id': String(user.id) },
        })
        const data = await response.json() as { pendingCount?: number; error?: string }
        if (!response.ok) throw new Error(data.error || 'No se pudieron consultar las solicitudes pendientes.')
        const count = Number(data.pendingCount)
        if (active) setPendingRequestCount(Number.isSafeInteger(count) && count > 0 ? count : 0)
      } catch (error) {
        console.error('Error actualizando el indicador de solicitudes:', error)
      } finally {
        requestInProgress = false
      }
    }
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void fetchPendingRequestCount()
    }
    void fetchPendingRequestCount()
    const intervalId = window.setInterval(fetchPendingRequestCount, 30000)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      active = false
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [isAdmin, isOwner, user.id])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b' && !isMobile) {
        event.preventDefault()
        setMini((value) => !value)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isMobile])

  const closeMobile = () => setMobileOpen(false)
  const renderItem = (item: SidebarItem, index: number) => {
    const active = isItemActive(item)
    const requestItem = (isOwner && item.id === 'reservas') || (isAdmin && item.id === 'reservations')
    const notificationItem = item.id === 'favoritos' || item.id === 'avisos'
    const badgeCount = requestItem ? pendingRequestCount : notificationItem ? unreadCount : 0
    const badgeLabel = requestItem ? 'solicitudes pendientes' : 'notificaciones sin leer'
    return (
      <NavLink
        key={item.id}
        to={item.to}
        className={`sb__item${active ? ' is-active' : ''}`}
        data-label={item.label}
        style={{ '--n': index } as CSSProperties}
        aria-current={active ? 'page' : undefined}
        onClick={closeMobile}
      >
        <Icon name={item.icon} />
        <span className="sb__label">{item.label}</span>
        {badgeCount > 0 && (
          <span className="sb__badge" aria-label={`${badgeCount} ${badgeLabel}`}>
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </NavLink>
    )
  }

  return (
    <>
      {isMobile && !mobileOpen && (
        <button type="button" className="sb__mobile-trigger" aria-label="Abrir menú"
          aria-expanded={false} onClick={() => setMobileOpen(true)}>
          <Icon name="menu" />
        </button>
      )}
      {isMobile && <button type="button" className={`sb__overlay${mobileOpen ? ' is-on' : ''}`} aria-label="Cerrar menú" tabIndex={mobileOpen ? 0 : -1} onClick={closeMobile} />}
      <aside className="sb app-sidebar" data-mini={compact} data-open={!isMobile || mobileOpen} aria-label="Navegación principal">
        <button type="button" className="sb__toggle" onClick={() => setMini((value) => !value)}
          aria-label={compact ? 'Expandir menú' : 'Contraer menú'} title="Ctrl + B">
          <Icon name="chevron" />
        </button>

        <div className="sb__brand-row">
          <Link className="sb__brand" to="/" aria-label="WorkPalace">
            <span className="sb__mark">
              <img src={isDark ? '/favicon.svg' : '/favicon-light.svg'} alt="" />
            </span>
            <span className="sb__label sb__wordmark">Work<b>Palace</b></span>
          </Link>
          {isMobile && (
            <button type="button" className="sb__mobile-close" aria-label="Cerrar menú" onClick={closeMobile}>
              <Icon name="close" />
            </button>
          )}
        </div>

        <div className="role role--single" data-rol={role} aria-label="Tipo de cuenta">
          <span className="role__pill" aria-hidden="true" />
          <span className="role__single" data-ini={roleInitial}>{roleLabel}</span>
        </div>

        <nav className="sb__nav" aria-label={isAdmin ? 'Administración' : isOwner ? 'Propietario' : 'Cliente'}>
          <span className={`sb__pill${activeIndex < 0 ? ' is-hidden' : ''}`} style={{ '--i': Math.max(activeIndex, 0) } as CSSProperties} aria-hidden="true" />
          {items.map((item, index) => renderItem(item, index))}
        </nav>

        <div className="sb__grow" />

        <div className="sb__aux">
          {renderItem({ id: 'settings', label: 'Ajustes', icon: 'sliders', to: '/settings' }, 0)}
          <button type="button" className="sb__item" data-label={isDark ? 'Modo claro' : 'Modo oscuro'} onClick={() => setIsDark(!isDark)}>
            <Icon name={isDark ? 'sun' : 'moon'} />
            <span className="sb__label">{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
          </button>
        </div>

        <div className="user">
          <span className="user__avatar">
            {user.profileImage ? <img src={user.profileImage} alt="" /> : initials(displayName)}
          </span>
          <span className="sb__label user__info">
            <b>{displayName}</b>
            <small>{user.email || roleLabel}</small>
          </span>
          <button type="button" className="user__out sb__label" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={onLogout}>
            <Icon name="logout" />
          </button>
        </div>
      </aside>
    </>
  )
}

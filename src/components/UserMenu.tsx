import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

interface UserMenuProps {
  user: { username: string; role?: string }
  onLogout?: () => void
}

export default function UserMenu({ user, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initial = user.username?.charAt(0).toUpperCase() || '?'

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        type="button"
        className="user-menu-button"
        onClick={() => setOpen(prev => !prev)}
      >
        <span className="user-avatar">{initial}</span>
        <span className="user-name">{user.username}</span>
        <span className="user-menu-arrow">▾</span>
      </button>

      {open && (
        <div className="user-menu-dropdown">
          <div className="user-menu-header">
            <span className="user-menu-username">@{user.username}</span>
            {user.role && (
              <span className={`user-menu-role ${user.role}`}>
                {user.role === 'admin' ? 'Admin' : 'Usuario'}
              </span>
            )}
          </div>

          {user.role === 'admin' && (
            <Link to="/admin" className="user-menu-item">
              Panel de administración
            </Link>
          )}

          <Link to="/settings" className="user-menu-item">
            Datos personales
          </Link>

          <button
            type="button"
            className="user-menu-item user-menu-logout"
            onClick={onLogout}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}


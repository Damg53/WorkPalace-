import { useState, useEffect, useCallback } from 'react'
import './App.css'


import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Login from './components/Login.tsx'
import Signup from './components/Signup.tsx'
import ForgotPassword from './components/ForgotPassword.tsx'
import ResetPassword from './components/ResetPassword.tsx'
import Navbar from './components/Navbar'
import Dashboard from './components/Dashboard'
import AdminDashboard from './components/AdminDashboard'
import OwnerDashboard from './components/OwnerDashboard'
import Settings from './components/Settings'
import Checkout from './components/Checkout'
import PlacesPage from './components/PlacesPage'
import LandingHome from './components/LandingHome'
import Sidebar from './components/Sidebar'
import { cacheProfileImageFromUrl, loadCachedProfileImage } from './services/profileImageCache'
import { API_BASE_URL } from './services/api'

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
      <Navbar isDark={isDark} setIsDark={setIsDark} user={user || undefined} onLogout={onLogout} />
      {user && user.role === 'admin' ? (
        <Navigate to="/admin" replace />
      ) : user && user.role === 'owner' ? (
        <Navigate to="/owner" replace />
      ) : user && user.role !== 'admin' ? (
        <Navigate to="/places" replace />
      ) : (
        <LandingHome />
      )}
    </>
  )
}

function AuthenticatedLayout({
  user,
  isDark,
  setIsDark,
  onLogout,
}: {
  user: { id?: number; username: string; role?: string; fullName?: string; email?: string; profileImage?: string }
  isDark: boolean
  setIsDark: (value: boolean) => void
  onLogout: () => void
}) {
  return (
    <div className="authenticated-layout">
      <Sidebar user={user} isDark={isDark} setIsDark={setIsDark} onLogout={onLogout} />
      <Outlet />
    </div>
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
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
    return
  }

  const safeUser = {
    id: user.id,
    username: user.username,
    role: user.role,
    fullName: user.fullName,
    email: user.email,
    profileImage: user.profileImage?.startsWith('data:image/') || user.profileImage?.startsWith('blob:')
      ? ''
      : user.profileImage || '',
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

  useEffect(() => {
    if (user?.id == null) return
    const profileUserId = user.id
    const profileImageSource = user.profileImage
    if (profileImageSource?.startsWith('data:image/')) return
    let cancelled = false

    async function restoreProfileImage() {
      try {
        const cachedImage = await loadCachedProfileImage(profileUserId)
        const image = cachedImage || (profileImageSource
          ? await cacheProfileImageFromUrl(profileUserId, profileImageSource)
          : null)
        if (!cancelled && image) {
          setUser((current) => {
            if (!current || current.id !== profileUserId) return current
            const next = { ...current, profileImage: image }
            saveUser(next)
            return next
          })
        }
      } catch (error) {
        console.error('No se pudo restaurar la copia local de la foto de perfil:', error)
      }
    }

    restoreProfileImage()
    return () => { cancelled = true }
  }, [user?.id, user?.profileImage])

  useEffect(() => {
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  // Aplicar tema al documento
  useEffect(() => {
    const theme = isDark ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme-mode', isDark ? 'dark' : 'light')
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (themeColor) {
      themeColor.content = isDark ? '#1a1a1a' : '#f3f4f6'
    }
    const favicon = document.querySelector<HTMLLinkElement>('#page-favicon')
    if (favicon) {
      favicon.href = isDark ? '/favicon.svg?v=3' : '/favicon-light.svg?v=1'
    }
  }, [isDark])

  useEffect(() => {
    if (!user?.id) return
    fetch(`${API_BASE_URL}/api/users/${user.id}/profile`)
      .then((response) => {
        if (response.status === 403 || response.status === 404) {
          setUser(null)
          setIsAdmin(false)
          localStorage.removeItem(STORAGE_KEY)
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
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('workpalace-user-preferences')
    setUser(null)
    setIsAdmin(false)
  }

  const handleProfileUpdate = useCallback((updated: { id: number; username: string; role?: string; fullName?: string; email?: string; profileImage?: string; twoFactorEnabled?: boolean }) => {
    setUser(prev => {
      const next = prev ? { ...prev, ...updated } : null
      if (next) saveUser(next)
      return next
    })
  }, [])

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
              user.role === 'admin' ? <Navigate to="/admin" replace /> : user.role === 'owner' ? <Navigate to="/owner" replace /> : <Navigate to="/dashboard" replace />
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
        <Route
          path="/reset-password"
          element={
            <div className="auth-layout">
              <ResetPassword />
            </div>
          }
        />


        <Route
          element={user ? (
            <AuthenticatedLayout user={user} isDark={isDark} setIsDark={setIsDark} onLogout={handleLogout} />
          ) : <Navigate to="/" replace />}
        >
          <Route
            path="/dashboard"
            element={
              user && !isAdmin ? (
                <Dashboard user={user} onLogout={handleLogout} isDark={isDark} setIsDark={setIsDark} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/places"
            element={
              user && !isAdmin ? (
                <PlacesPage user={user} isDark={isDark} setIsDark={setIsDark} onLogout={handleLogout} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/admin"
            element={
              user && isAdmin ? (
                <AdminDashboard user={user} onLogout={handleLogout} isDark={isDark} setIsDark={setIsDark} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/owner"
            element={
              user && user.role === 'owner' ? (
                <OwnerDashboard user={user} onLogout={handleLogout} isDark={isDark} setIsDark={setIsDark} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
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
                <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'owner' ? '/owner' : '/dashboard'} replace />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Route>

        {/* checkout / simulación de pago */}
        <Route
          path="/checkout/:placeId"
          element={
            user && !isAdmin && user.id != null ? (
              <Checkout user={user} isDark={isDark} setIsDark={setIsDark} />
            ) : user ? (
              <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'owner' ? '/owner' : '/dashboard'} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

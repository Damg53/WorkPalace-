import Sidebar from './Sidebar'
import AdminUsersSection from './AdminUsersSection'
import AdminReservationsSection from './AdminReservationsSection'
import AdminPlacesSection from './AdminPlacesSection'
import AdminOverviewSection from './AdminOverviewSection'
import AdminOperationsSection from './AdminOperationsSection'
import { useAdminData } from './useAdminData'
import './AdminDashboard.css'
import { useLocation } from 'react-router-dom'

interface AdminDashboardProps {
  user: { id?: number; username: string; role?: string }
  onLogout: () => void
  isDark: boolean
  setIsDark: (value: boolean) => void
}

export default function AdminDashboard({ user, onLogout, isDark, setIsDark }: AdminDashboardProps) {
  const location = useLocation()
  const activeSection = location.hash.slice(1) || 'dashboard'
  const data = useAdminData(user.id)
  const { users, reservations, places, error } = data

  const sectionHeader = {
    dashboard: {
      title: 'Bienvenido al Panel de Administración',
      message: 'Gestiona usuarios, reservas y espacios de WorkPalace desde aquí.',
    },
    users: {
      title: 'Usuarios registrados',
      message: 'Administra permisos, estados y accesos de la comunidad WorkPalace.',
    },
    reservations: {
      title: 'Reservas de clientes',
      message: 'Controla fechas, estados y detalles de cada reserva en un solo lugar.',
    },
    places: {
      title: 'Lugares publicados',
      message: 'Gestiona los espacios que hacen posible cada gran idea.',
    },
    operations: {
      title: 'Operaciones',
      message: 'Controla promociones, disponibilidad y actividad administrativa.',
    },
  }[activeSection as 'dashboard' | 'users' | 'reservations' | 'places' | 'operations'] || {
    title: 'Panel de Administración',
    message: 'Gestiona WorkPalace desde un solo lugar.',
  }

  return (
    <div className="admin-container">
      <Sidebar user={user} isDark={isDark} setIsDark={setIsDark} onLogout={onLogout} />
      <div className="admin-header">
        <h1>{sectionHeader.title}</h1>
        <p>{sectionHeader.message}</p>
      </div>
      <div className="admin-content">
        {activeSection === 'dashboard' && <div className="admin-stats">
          <div className="stat-card"><h3>Total de Usuarios</h3><div className="number">{users.length}</div></div>
          <div className="stat-card"><h3>Administradores</h3><div className="number">{users.filter((item) => item.role === 'admin').length}</div></div>
          <div className="stat-card"><h3>Usuarios Regulares</h3><div className="number">{users.filter((item) => item.role === 'user').length}</div></div>
          <div className="stat-card"><h3>Reservas totales</h3><div className="number">{reservations.length}</div></div>
          <div className="stat-card"><h3>Lugares publicados</h3><div className="number">{places.length}</div></div>
        </div>}
        {activeSection === 'dashboard' && <AdminOverviewSection users={users} reservations={reservations} places={places} />}
        {error && <div className="error-banner">⚠️ {error}</div>}
        {activeSection === 'users' && <AdminUsersSection users={users} updateRole={data.updateRole} toggleUserActive={data.toggleUserActive} deleteUser={data.deleteUser} />}
        {activeSection === 'reservations' && <AdminReservationsSection reservations={reservations} updateReservation={data.updateReservation} deleteReservation={data.deleteReservation} />}
        {activeSection === 'places' && <AdminPlacesSection places={places} updatePlace={data.updatePlace} togglePlaceActive={data.togglePlaceActive} deletePlace={data.deletePlace} createPlace={data.createPlace} />}
        {activeSection === 'operations' && <AdminOperationsSection coupons={data.coupons} blocks={data.blocks} auditLogs={data.auditLogs} places={places} createCoupon={data.createCoupon} toggleCoupon={data.toggleCoupon} deleteCoupon={data.deleteCoupon} createBlock={data.createBlock} deleteBlock={data.deleteBlock} />}
        <div className="admin-footer"><p>&copy; 2026 WorkPalace. Acceso restringido a administradores.</p></div>
      </div>
    </div>
  )
}

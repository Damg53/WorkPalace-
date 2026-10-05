import { useState } from 'react'
import type { AdminUser } from './adminTypes'

interface AdminUsersSectionProps {
  users: AdminUser[]
  updateRole: (id: number, role: string) => void
  toggleUserActive: (id: number, active: boolean) => void
  deleteUser: (id: number) => void
}

export default function AdminUsersSection({ users, updateRole, toggleUserActive, deleteUser }: AdminUsersSectionProps) {
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('all')
  const filteredUsers = users.filter((user) => {
    const haystack = `${user.full_name ?? ''} ${user.email ?? ''} ${user.username}`.toLowerCase()
    return haystack.includes(query.toLowerCase()) && (role === 'all' || user.role === role) && (status === 'all' || (status === 'active' ? user.active !== false : user.active === false))
  })

  return (
    <section className="users-section" id="users">
      <h2>Usuarios registrados</h2>
      <div className="admin-toolbar"><input placeholder="Buscar por nombre, correo o usuario" value={query} onChange={(event) => setQuery(event.target.value)} /><select value={role} onChange={(event) => setRole(event.target.value)}><option value="all">Todos los roles</option><option value="admin">Administradores</option><option value="user">Usuarios</option></select><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos los estados</option><option value="active">Activos</option><option value="inactive">Inactivos</option></select><span>{filteredUsers.length} resultados</span></div>

      {users.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>Cargando usuarios...</p>
      ) : (
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr><th>ID</th><th>Nombre</th><th>Email</th><th>Usuario</th><th>Rol</th><th>Activo</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="user-id">#{user.id}</td>
                  <td className="user-name">{String(user.full_name ?? '')}</td>
                  <td className="user-email">{String(user.email ?? '')}</td>
                  <td className="user-username">@{user.username}</td>
                  <td>
                    <select className="role-select" value={user.role} onChange={(event) => updateRole(user.id, event.target.value)}>
                      <option value="user">Usuario</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </td>
                  <td>
                    <input type="checkbox" checked={user.active !== false} onChange={(event) => toggleUserActive(user.id, event.target.checked)} />
                  </td>
                  <td>
                    <button className="user-delete-button" onClick={() => deleteUser(user.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

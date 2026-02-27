import Navbar from './Navbar'

interface AdminDashboardProps {
  user: { username: string; role?: string }
  onLogout: () => void
  isDark: boolean
  setIsDark: (value: boolean) => void
}

import { useEffect, useState } from 'react';

export default function AdminDashboard({ user, onLogout, isDark, setIsDark }: AdminDashboardProps) {
  const [users, setUsers] = useState<Array<any>>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users', {
          headers: { 'x-user-role': 'admin' }
        });
        if (!res.ok) throw new Error('No autorizado');
        const data = await res.json();
        setUsers(data.users);
      } catch (e) {
        console.error(e);
        setError('No se pudieron cargar los usuarios');
      }
    };
    fetchUsers();
  }, []);

  const updateRole = async (id: number, role: string) => {
    try {
      const res = await fetch(`/api/users/${id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin'
        },
        body: JSON.stringify({ role })
      });
      if (!res.ok) throw new Error('Falló actualización');
      const { user: updated } = await res.json();
      setUsers((u) => u.map(x => x.id === updated.id ? updated : x));
    } catch (e) {
      console.error(e);
      setError('Error al actualizar rol');
    }
  };

  return (
    <>
      <Navbar isDark={isDark} setIsDark={setIsDark} user={user} onLogout={onLogout} />

      {/* Hero Section similar to landing */}
      <section className="hero">
        <h1>Panel de Administración</h1>
        <p>Gestiona usuarios, contenidos y configuración del sistema</p>
      </section>

      {/* User management table */}
      <section className="features" id="admin-features">
        <div className="features-container">
          <h2 className="section-title">Usuarios registrados</h2>
          {error && <p className="error-message">{error}</p>}
          <table className="features-grid" style={{ width: '100%', background: 'white', color: '#333', padding: '1rem' }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Usuario</th>
                <th>Rol</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.full_name}</td>
                  <td>{u.email}</td>
                  <td>{u.username}</td>
                  <td>
                    <select value={u.role} onChange={e => updateRole(u.id, e.target.value)}>
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer */}
      <footer id="site-footer">
        <p>&copy; 2026 WorkPalace. Todos los derechos reservados.</p>
        <p>Acceso restringido a administradores</p>
      </footer>
    </>
  )
}

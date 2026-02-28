import Navbar from './Navbar'
import './AdminDashboard.css'

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
        console.log('📡 Cargando usuarios...');
        const res = await fetch('http://localhost:3001/api/users', {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-role': 'admin' 
          }
        });
        console.log('Response status:', res.status);
        console.log('Response ok:', res.ok);
        
        const data = await res.json();
        console.log('Response data:', data);
        
        if (!res.ok) {
          throw new Error(data.error || 'No autorizado');
        }
        
        console.log('Usuarios cargados:', data.users);
        setUsers(data.users);
      } catch (e) {
        console.error('Error cargando usuarios:', e);
        setError('No se pudieron cargar los usuarios: ' + (e instanceof Error ? e.message : String(e)));
      }
    };
    fetchUsers();
  }, []);

  const updateRole = async (id: number, role: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/users/${id}/role`, {
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
    <div className="admin-container">
      <Navbar isDark={isDark} setIsDark={setIsDark} user={user} onLogout={onLogout} />

      <div className="admin-header">
        <h1>Panel de Administración</h1>
        <p>Gestiona usuarios, contenidos y configuración del sistema</p>
      </div>

      <div className="admin-content">
        {/* Stats Cards */}
        <div className="admin-stats">
          <div className="stat-card">
            <h3>Total de Usuarios</h3>
            <div className="number">{users.length}</div>
          </div>
          <div className="stat-card">
            <h3>Administradores</h3>
            <div className="number">{users.filter(u => u.role === 'admin').length}</div>
          </div>
          <div className="stat-card">
            <h3>Usuarios Regulares</h3>
            <div className="number">{users.filter(u => u.role === 'user').length}</div>
          </div>
        </div>

        {/* Users Table */}
        <div className="users-section">
          <h2>Usuarios registrados</h2>
          {error && <div className="error-banner">⚠️ {error}</div>}
          
          {users.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
              Cargando usuarios...
            </p>
          ) : (
            <div className="users-table-wrapper">
              <table className="users-table">
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
                      <td className="user-id">#{u.id}</td>
                      <td className="user-name">{u.full_name}</td>
                      <td className="user-email">{u.email}</td>
                      <td className="user-username">@{u.username}</td>
                      <td>
                        <select 
                          className="role-select" 
                          value={u.role} 
                          onChange={e => updateRole(u.id, e.target.value)}
                        >
                          <option value="user"> Usuario</option>
                          <option value="admin"> Administrador</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="admin-footer">
          <p>&copy; 2026 WorkPalace. Acceso restringido a administradores.</p>
        </div>
      </div>
    </div>
  )
}

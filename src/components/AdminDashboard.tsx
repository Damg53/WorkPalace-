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
  const [reservations, setReservations] = useState<Array<any>>([]);
  const [places, setPlaces] = useState<Array<any>>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/users', {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-role': 'admin' 
          }
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'No autorizado');
        }
        setUsers(data.users);
      } catch (e) {
        console.error('Error cargando usuarios:', e);
        setError('No se pudieron cargar los usuarios: ' + (e instanceof Error ? e.message : String(e)));
      }
    };

    const fetchReservations = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/admin/reservations', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': 'admin',
          },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'No autorizado');
        }
        setReservations(data.reservations);
      } catch (e) {
        console.error('Error cargando reservas:', e);
        setError(prev => prev || 'No se pudieron cargar las reservas');
      }
    };

    const fetchPlaces = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/admin/places', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': 'admin',
          },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'No autorizado');
        }
        setPlaces(data.places);
      } catch (e) {
        console.error('Error cargando lugares:', e);
        setError(prev => prev || 'No se pudieron cargar los lugares');
      }
    };

    fetchUsers();
    fetchReservations();
    fetchPlaces();
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

  const toggleUserActive = async (id: number, active: boolean) => {
    try {
      const res = await fetch(`http://localhost:3001/api/users/${id}/active`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error('Falló actualización');
      await res.json();
      window.location.reload();
    } catch (e) {
      console.error(e);
      setError('Error al actualizar estado del usuario');
    }
  };

  const deleteUser = async (id: number) => {
    if (!window.confirm(`¿Eliminar usuario #${id}? Esto también eliminará sus reservas.`)) return;
    try {
      const res = await fetch(`http://localhost:3001/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-role': 'admin' },
      });
      if (!res.ok && res.status !== 204) throw new Error('Falló eliminación');
      window.location.reload();
    } catch (e) {
      console.error(e);
      setError('Error al eliminar usuario');
    }
  };

  const updateReservation = async (id: number, payload: any) => {
    try {
      const res = await fetch(`http://localhost:3001/api/admin/reservations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falló actualización de reserva');
      const updated = data.reservation;
      setReservations((r) => r.map(x => x.id === updated.id ? updated : x));
    } catch (e) {
      console.error(e);
      setError('Error al actualizar reserva');
    }
  };

  const deleteReservation = async (id: number) => {
    if (!window.confirm(`¿Eliminar reserva #${id}?`)) return;
    try {
      const res = await fetch(`http://localhost:3001/api/admin/reservations/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-role': 'admin' },
      });
      if (!res.ok && res.status !== 204) throw new Error('Falló eliminación');
      window.location.reload();
    } catch (e) {
      console.error(e);
      setError('Error al eliminar reserva');
    }
  };

  const updatePlace = async (id: number, payload: any) => {
    try {
      const res = await fetch(`http://localhost:3001/api/admin/places/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falló actualización de lugar');
      const updated = data.place;
      setPlaces((p) => p.map(x => x.id === updated.id ? updated : x));
    } catch (e) {
      console.error(e);
      setError('Error al actualizar lugar');
    }
  };

  const togglePlaceActive = async (id: number, active: boolean) => {
    try {
      const res = await fetch(`http://localhost:3001/api/admin/places/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error('Falló actualización');
      await res.json();
      window.location.reload();
    } catch (e) {
      console.error(e);
      setError('Error al actualizar estado del lugar');
    }
  };

  const deletePlace = async (id: number) => {
    if (!window.confirm(`¿Eliminar lugar #${id}?`)) return;
    try {
      const res = await fetch(`http://localhost:3001/api/admin/places/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-role': 'admin' },
      });
      if (!res.ok && res.status !== 204) throw new Error('Falló eliminación');
      window.location.reload();
    } catch (e) {
      console.error(e);
      setError('Error al eliminar lugar');
    }
  };

  return (
    <div className="admin-container">
      <Navbar isDark={isDark} setIsDark={setIsDark} user={user} onLogout={onLogout} />

      <div className="admin-header">
        <h1>Panel de Administración</h1>
        <p>Gestiona usuarios, reservas y configuración del sistema</p>
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
          <div className="stat-card">
            <h3>Reservas totales</h3>
            <div className="number">{reservations.length}</div>
          </div>
          <div className="stat-card">
            <h3>Lugares publicados</h3>
            <div className="number">{places.length}</div>
          </div>
        </div>

        {error && <div className="error-banner">⚠️ {error}</div>}

        {/* Users Table */}
        <div className="users-section">
          <h2>Usuarios registrados</h2>
          
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
                    <th>Activo</th>
                    <th>Acciones</th>
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
                          <option value="user">Usuario</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={u.active !== false}
                          onChange={e => toggleUserActive(u.id, e.target.checked)}
                        />
                      </td>
                      <td>
                        <button
                          className="user-delete-button"
                          onClick={() => deleteUser(u.id)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reservations Table */}
        <div className="users-section" style={{ marginTop: '3rem' }}>
          <h2>Reservas de clientes</h2>
          {reservations.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
              No hay reservas registradas.
            </p>
          ) : (
            <div className="users-table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Usuario</th>
                    <th>Email</th>
                    <th>Alojamiento</th>
                    <th>Ubicación</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Huéspedes</th>
                    <th>Estado</th>
                    <th>Activo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map(r => (
                    <tr key={r.id}>
                      <td>#{r.id}</td>
                      <td>{r.username || `Usuario #${r.user_id}`}</td>
                      <td>{r.email || 'N/A'}</td>
                      <td>{r.hotel}</td>
                      <td>{r.ubicacion}</td>
                      <td>{r.check_in}</td>
                      <td>{r.check_out}</td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          value={r.huespedes}
                          onChange={e => updateReservation(r.id, { huespedes: Number(e.target.value) || 1 })}
                          style={{ width: '4rem' }}
                        />
                      </td>
                      <td>
                        <select
                          value={r.estado}
                          onChange={e => updateReservation(r.id, { estado: e.target.value })}
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="confirmada">Confirmada</option>
                          <option value="completada">Completada</option>
                          <option value="cancelada">Cancelada</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={r.active !== false}
                          onChange={e => updateReservation(r.id, { active: e.target.checked })}
                        />
                      </td>
                      <td>
                        <button
                          className="user-delete-button"
                          onClick={() => deleteReservation(r.id)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Places Table */}
        <div className="users-section" style={{ marginTop: '3rem' }}>
          <h2>Lugares publicados</h2>
          {places.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
              No hay lugares registrados.
            </p>
          ) : (
            <div className="users-table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Barrio</th>
                    <th>Ciudad</th>
                    <th>Capacidad</th>
                    <th>Precio/hora</th>
                    <th>Modalidad</th>
                    <th>Activo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {places.map(p => (
                    <tr key={p.id}>
                      <td>#{p.id}</td>
                      <td>
                        <input
                          type="text"
                          defaultValue={p.name}
                          onBlur={e => updatePlace(p.id, { name: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          defaultValue={p.tipo}
                          onBlur={e => updatePlace(p.id, { tipo: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          defaultValue={p.barrio || ''}
                          onBlur={e => updatePlace(p.id, { barrio: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          defaultValue={p.ciudad || ''}
                          onBlur={e => updatePlace(p.id, { ciudad: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          defaultValue={p.capacidad || ''}
                          onBlur={e => updatePlace(p.id, { capacidad: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          defaultValue={p.precio_hora ?? 0}
                          onBlur={e => updatePlace(p.id, { precio_hora: Number(e.target.value) || 0 })}
                          style={{ width: '6rem' }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          defaultValue={p.modalidad || ''}
                          onBlur={e => updatePlace(p.id, { modalidad: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={p.active !== false}
                          onChange={e => togglePlaceActive(p.id, e.target.checked)}
                        />
                      </td>
                      <td>
                        <button
                          className="user-delete-button"
                          onClick={() => deletePlace(p.id)}
                        >
                          Eliminar
                        </button>
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

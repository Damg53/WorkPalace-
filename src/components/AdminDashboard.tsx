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
  const TIPOS_LUGAR = [
    'Coworking',
    'Oficina privada',
    'Sala de reuniones',
    'Auditorio / salón de eventos',
    'Aula / salón de clases',
    'Estudio de grabación',
    'Estudio de fotografía',
    'Sala de ensayo',
    'Taller de carpintería',
    'Taller / maker space',
    'Cocina industrial',
    'Cocina oculta (dark kitchen)',
    'Espacio para talleres (manualidades/arte)',
    'Consultorio',
    'Sala de terapia / coaching',
    'Gimnasio / sala de entrenamiento',
    'Cancha / espacio deportivo',
    'Terraza / rooftop',
    'Patio / jardín',
    'Bodega / almacén',
    'Local comercial',
    'Otro',
  ]

  const BARRIOS_MEDELLIN = [
    'El Poblado',
    'Laureles - Estadio',
    'Belén',
    'Envigado',
    'Sabaneta',
    'Itagüí',
    'Robledo',
    'Buenos Aires',
    'La América',
    'San Javier',
    'Aranjuez',
    'Manrique',
    'Castilla',
    'Doce de Octubre',
    'Popular',
    'Santa Cruz',
    'Guayabal',
    'Centro',
    'Otro / No aplica',
  ]

  const CIUDADES_COLOMBIA = [
    'Medellín',
    'Bello',
    'Envigado',
    'Sabaneta',
    'Itagüí',
    'Bogotá',
    'Cali',
    'Barranquilla',
    'Cartagena',
    'Bucaramanga',
    'Pereira',
    'Manizales',
    'Santa Marta',
    'Cúcuta',
    'Otra',
  ]

  const CAPACIDADES = [
    '1 persona',
    '2 personas',
    '3-4 personas',
    '5-6 personas',
    '7-10 personas',
    '11-15 personas',
    '16-25 personas',
    '26-50 personas',
    '51-100 personas',
    'Más de 100 personas',
    'No especificado',
  ]

  const MODALIDADES = [
    'Por hora',
    'Media jornada (4 horas)',
    'Jornada completa (8 horas)',
    'Por día',
    'Por noche',
    'Por semana',
    'Solo por cita',
    'Flexible (acordar con el propietario)',
  ]

  const NIVELES_RUIDO = [
    'Silencioso (ideal para concentración)',
    'Moderado (conversación normal)',
    'Alto (actividad intensa)',
    'Muy alto (industrial / eventos)',
    'Aislado acústicamente',
    'No aplica',
  ]

  function preventWheelNumberChange(e: React.WheelEvent<HTMLInputElement>) {
    // Evita que al hacer scroll sobre un input type="number" se modifique el valor
    ;(e.currentTarget as HTMLInputElement).blur()
  }
  const [users, setUsers] = useState<Array<any>>([]);
  const [reservations, setReservations] = useState<Array<any>>([]);
  const [places, setPlaces] = useState<Array<any>>([]);
  const [error, setError] = useState('');
  const [showCreatePlaceForm, setShowCreatePlaceForm] = useState(false);
  const [editingImagePlaceId, setEditingImagePlaceId] = useState<number | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState('');
  const [newPlaceForm, setNewPlaceForm] = useState({
    name: '',
    tipo: '',
    barrio: '',
    ciudad: '',
    capacidad: '',
    precio_hora: '',
    modalidad: '',
    caracteristicas: '',
    nivel_ruido: '',
    image_url: '',
  });

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

  const openEditImageModal = (placeId: number) => {
    const place = places.find(p => p.id === placeId);
    if (place) {
      setEditingImagePlaceId(placeId);
      setEditingImageUrl(place.image_url || '');
    }
  };

  const saveImageChange = async () => {
    if (editingImagePlaceId === null) return;
    try {
      await updatePlace(editingImagePlaceId, { image_url: editingImageUrl });
      setEditingImagePlaceId(null);
      setEditingImageUrl('');
    } catch (e) {
      console.error(e);
      setError('Error al actualizar imagen');
    }
  };

  const deleteImage = async () => {
    if (editingImagePlaceId === null) return;
    if (!window.confirm('¿Eliminar la imagen de este lugar?')) return;
    try {
      await updatePlace(editingImagePlaceId, { image_url: null });
      setEditingImagePlaceId(null);
      setEditingImageUrl('');
    } catch (e) {
      console.error(e);
      setError('Error al eliminar imagen');
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

  const createPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaceForm.name || !newPlaceForm.tipo) {
      setError('Nombre y tipo son requeridos');
      return;
    }

    try {
      const res = await fetch('http://localhost:3001/api/admin/places', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({
          name: newPlaceForm.name,
          tipo: newPlaceForm.tipo,
          barrio: newPlaceForm.barrio || null,
          ciudad: newPlaceForm.ciudad || null,
          capacidad: newPlaceForm.capacidad || null,
          precio_hora: newPlaceForm.precio_hora ? Number(newPlaceForm.precio_hora) : null,
          modalidad: newPlaceForm.modalidad || null,
          caracteristicas: newPlaceForm.caracteristicas || null,
          nivel_ruido: newPlaceForm.nivel_ruido || null,
          image_url: newPlaceForm.image_url || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falló la creación del lugar');
      }

      setPlaces([...places, data.place]);
      setNewPlaceForm({
        name: '',
        tipo: '',
        barrio: '',
        ciudad: '',
        capacidad: '',
        precio_hora: '',
        modalidad: '',
        caracteristicas: '',
        nivel_ruido: '',
        image_url: '',
      });
      setShowCreatePlaceForm(false);
      setError('');
    } catch (e) {
      console.error(e);
      setError('Error al crear lugar: ' + (e instanceof Error ? e.message : String(e)));
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
                          className="table-input"
                          style={{ width: '4rem' }}
                        />
                      </td>
                      <td>
                        <select
                          value={r.estado}
                          onChange={e => updateReservation(r.id, { estado: e.target.value })}
                          className="table-select"
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2>Lugares publicados</h2>
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreatePlaceForm(!showCreatePlaceForm)}
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              {showCreatePlaceForm ? 'Cancelar' : '+ Crear nuevo lugar'}
            </button>
          </div>

          {/* Form para crear nuevo lugar */}
          {showCreatePlaceForm && (
            <form onSubmit={createPlace} className="form-create-place">
              <h3>Crear Nuevo Lugar</h3>
              <div className="form-create-place-grid">
                <div className="form-create-place-field">
                  <label className="form-create-place-label">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Studio 404"
                    value={newPlaceForm.name}
                    onChange={e => setNewPlaceForm({ ...newPlaceForm, name: e.target.value })}
                    required
                    className="form-create-place-input"
                  />
                </div>
                <div className="form-create-place-field">
                  <label className="form-create-place-label">
                    Tipo *
                  </label>
                  <select
                    value={newPlaceForm.tipo}
                    onChange={e => setNewPlaceForm({ ...newPlaceForm, tipo: e.target.value })}
                    required
                    className="form-create-place-input"
                  >
                    <option value="">Selecciona un tipo</option>
                    {TIPOS_LUGAR.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="form-create-place-field">
                  <label className="form-create-place-label">
                    Barrio
                  </label>
                  <select
                    value={newPlaceForm.barrio}
                    onChange={e => setNewPlaceForm({ ...newPlaceForm, barrio: e.target.value })}
                    className="form-create-place-input"
                  >
                    <option value="">Selecciona un barrio</option>
                    {BARRIOS_MEDELLIN.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="form-create-place-field">
                  <label className="form-create-place-label">
                    Ciudad
                  </label>
                  <select
                    value={newPlaceForm.ciudad}
                    onChange={e => setNewPlaceForm({ ...newPlaceForm, ciudad: e.target.value })}
                    className="form-create-place-input"
                  >
                    <option value="">Selecciona una ciudad</option>
                    {CIUDADES_COLOMBIA.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-create-place-field">
                  <label className="form-create-place-label">
                    Capacidad
                  </label>
                  <select
                    value={newPlaceForm.capacidad}
                    onChange={e => setNewPlaceForm({ ...newPlaceForm, capacidad: e.target.value })}
                    className="form-create-place-input"
                  >
                    <option value="">Selecciona capacidad</option>
                    {CAPACIDADES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-create-place-field">
                  <label className="form-create-place-label">
                    Precio/hora
                  </label>
                  <input
                    type="number"
                    placeholder="Ej: 45000"
                    value={newPlaceForm.precio_hora}
                    onChange={e => setNewPlaceForm({ ...newPlaceForm, precio_hora: e.target.value })}
                    onWheel={preventWheelNumberChange}
                    className="form-create-place-input"
                  />
                </div>
                <div className="form-create-place-field">
                  <label className="form-create-place-label">
                    Modalidad
                  </label>
                  <select
                    value={newPlaceForm.modalidad}
                    onChange={e => setNewPlaceForm({ ...newPlaceForm, modalidad: e.target.value })}
                    className="form-create-place-input"
                  >
                    <option value="">Selecciona modalidad</option>
                    {MODALIDADES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="form-create-place-field form-create-place-full-width">
                  <label className="form-create-place-label">
                    Características
                  </label>
                  <textarea
                    placeholder="Ej: Cabina tratada acústicamente, Interfaz de audio, Micrófonos profesionales"
                    value={newPlaceForm.caracteristicas}
                    onChange={e => setNewPlaceForm({ ...newPlaceForm, caracteristicas: e.target.value })}
                    className="form-create-place-textarea"
                  />
                </div>
                <div className="form-create-place-field">
                  <label className="form-create-place-label">
                    Nivel de ruido
                  </label>
                  <select
                    value={newPlaceForm.nivel_ruido}
                    onChange={e => setNewPlaceForm({ ...newPlaceForm, nivel_ruido: e.target.value })}
                    className="form-create-place-input"
                  >
                    <option value="">Selecciona nivel de ruido</option>
                    {NIVELES_RUIDO.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="form-create-place-field form-create-place-full-width">
                  <label className="form-create-place-label">
                    Imagen (URL o cargar archivo)
                  </label>
                  <div className="form-create-place-image-container">
                    <input
                      type="text"
                      placeholder="Pega aquí el enlace de la imagen"
                      value={newPlaceForm.image_url}
                      onChange={e => setNewPlaceForm({ ...newPlaceForm, image_url: e.target.value })}
                      className="form-create-place-input"
                      style={{ flex: 1 }}
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const result = event.target?.result as string;
                            setNewPlaceForm({ ...newPlaceForm, image_url: result });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="form-create-place-file"
                    />
                  </div>
                  {newPlaceForm.image_url && (
                    <div className="form-create-place-image-preview">
                      <img src={newPlaceForm.image_url} alt="Preview" />
                    </div>
                  )}
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '0.7rem 1.5rem' }}
              >
                Crear Lugar
              </button>
            </form>
          )}

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
                          className="table-input"
                        />
                      </td>
                      <td>
                        <select
                          defaultValue={p.tipo || ''}
                          onChange={e => updatePlace(p.id, { tipo: e.target.value })}
                          className="table-select"
                        >
                          <option value="">(vacío)</option>
                          {TIPOS_LUGAR.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          defaultValue={p.barrio || ''}
                          onChange={e => updatePlace(p.id, { barrio: e.target.value })}
                          className="table-select"
                        >
                          <option value="">(vacío)</option>
                          {BARRIOS_MEDELLIN.map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          defaultValue={p.ciudad || ''}
                          onChange={e => updatePlace(p.id, { ciudad: e.target.value })}
                          className="table-select"
                        >
                          <option value="">(vacío)</option>
                          {CIUDADES_COLOMBIA.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          defaultValue={p.capacidad || ''}
                          onChange={e => updatePlace(p.id, { capacidad: e.target.value })}
                          className="table-select"
                        >
                          <option value="">(vacío)</option>
                          {CAPACIDADES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          defaultValue={p.precio_hora ?? 0}
                          onBlur={e => updatePlace(p.id, { precio_hora: Number(e.target.value) || 0 })}
                          onWheel={preventWheelNumberChange}
                          className="table-input"
                          style={{ width: '6rem' }}
                        />
                      </td>
                      <td>
                        <select
                          defaultValue={p.modalidad || ''}
                          onChange={e => updatePlace(p.id, { modalidad: e.target.value })}
                          className="table-select"
                        >
                          <option value="">(vacío)</option>
                          {MODALIDADES.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={p.active !== false}
                          onChange={e => togglePlaceActive(p.id, e.target.checked)}
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-secondary"
                            onClick={() => openEditImageModal(p.id)}
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                          >
                            🖼️ Imagen
                          </button>
                          <button
                            className="user-delete-button"
                            onClick={() => deletePlace(p.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal para editar imagen */}
        {editingImagePlaceId !== null && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: isDark ? '#1a1a1a' : '#fff',
              padding: '2rem',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}>
              <h3 style={{ marginBottom: '1rem', color: isDark ? '#fff' : '#000' }}>Editar imagen del lugar</h3>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: isDark ? '#ccc' : '#666' }}>
                  URL de la imagen
                </label>
                <input
                  type="text"
                  placeholder="Pega el enlace de la imagen"
                  value={editingImageUrl}
                  onChange={(e) => setEditingImageUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.7rem',
                    borderRadius: '4px',
                    border: '1px solid #444',
                    backgroundColor: isDark ? '#222' : '#f0f0f0',
                    color: isDark ? '#fff' : '#000'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: isDark ? '#ccc' : '#666' }}>
                  O carga un archivo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const result = event.target?.result as string;
                        setEditingImageUrl(result);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.7rem',
                    borderRadius: '4px',
                    border: '1px solid #444',
                    backgroundColor: isDark ? '#222' : '#f0f0f0',
                    color: isDark ? '#fff' : '#000'
                  }}
                />
              </div>

              {editingImageUrl && (
                <div style={{
                  marginBottom: '1rem',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  maxHeight: '250px'
                }}>
                  <img src={editingImageUrl} alt="Preview" style={{ width: '100%', height: '250px', objectFit: 'cover' }} />
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setEditingImagePlaceId(null)}
                  className="btn btn-secondary"
                  style={{ padding: '0.6rem 1.2rem' }}
                >
                  Cancelar
                </button>
                {editingImageUrl && (
                  <button
                    onClick={deleteImage}
                    style={{
                      padding: '0.6rem 1.2rem',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Borrar imagen
                  </button>
                )}
                <button
                  onClick={saveImageChange}
                  className="btn btn-primary"
                  style={{ padding: '0.6rem 1.2rem' }}
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="admin-footer">
          <p>&copy; 2026 WorkPalace. Acceso restringido a administradores.</p>
        </div>
      </div>
    </div>
  )
}

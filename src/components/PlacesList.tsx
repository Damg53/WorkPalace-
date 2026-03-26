import React, { useState } from 'react'

interface Place {
  id: number
  name: string
  tipo: string
  barrio: string | null
  ciudad: string | null
  capacidad: string | null
  precio_hora: number | null
  modalidad: string | null
  caracteristicas: string | null
  nivel_ruido: string | null
  image_url: string | null
  active: boolean
}

interface PlacesListProps {
  places: Place[]
  loading: boolean
  error: string | null
  onReserve: (placeId: number) => void
}

const PlacesList: React.FC<PlacesListProps> = ({ places, loading, error, onReserve }) => {
  const [openDetails, setOpenDetails] = useState<{ [id: number]: boolean }>({});

  const toggleDetails = (id: number) => {
    setOpenDetails(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <>
      {error && <p className="reservations-error">{error}</p>}
      {loading ? (
        <p className="settings-loading">Cargando espacios disponibles...</p>
      ) : (
        <div className="features-grid">
          {places.length === 0 ? (
            <p style={{ padding: '1.5rem 0', color: '#666' }}>
              No hay espacios registrados aún en la base de datos.
            </p>
          ) : (
            places.map(place => (
              <div key={place.id} className="feature-card">
                {place.image_url && (
                  <div style={{ marginBottom: '0.9rem', borderRadius: '12px', overflow: 'hidden', maxHeight: '210px', boxShadow: '0 4px 18px rgba(102,126,234,0.10)' }}>
                    <img src={place.image_url} alt={place.name} style={{ width: '100%', height: '210px', objectFit: 'cover', transition: 'transform 0.3s', borderRadius: '12px' }} />
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <h3 style={{
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '230px',
                    fontSize: '1.35rem',
                    fontWeight: 700
                  }}>{place.tipo}</h3>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    backgroundColor: place.active ? '#4CAF50' : '#f44336',
                    color: 'white',
                    minWidth: '90px',
                    textAlign: 'center',
                    marginLeft: '0.25rem'
                  }}>
                    {place.active ? 'Disponible' : 'No disponible'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem 1.1rem', fontSize: '0.95rem', border: '1px solid #667eea', background: '#fff', color: '#333', borderRadius: '7px', fontWeight: 500, cursor: 'pointer' }}
                    onClick={() => toggleDetails(place.id)}
                  >
                    {openDetails[place.id] ? 'Ocultar detalles' : 'Detalles'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onReserve(place.id)}
                    disabled={!place.active}
                  >
                    Reserva ya
                  </button>
                </div>
                {openDetails[place.id] && (
                  <div style={{ marginBottom: '0.5rem', animation: 'fadeIn 0.3s' }}>
                    <p style={{ marginBottom: '0.35rem' }}>
                      {[place.barrio, place.ciudad].filter(Boolean).join(', ')}
                    </p>
                    <p style={{ marginBottom: '0.35rem' }}>
                      <strong>Capacidad:</strong> {place.capacidad ?? 'Sin especificar'}
                    </p>
                    <p style={{ marginBottom: '0.35rem' }}>
                      <strong>Modalidad:</strong> {place.modalidad ?? 'Consultar disponibilidad'}
                    </p>
                    <p style={{ marginBottom: '0.75rem' }}>
                      <strong>Precio de referencia:</strong>{' '}
                      {place.precio_hora != null
                        ? `$${place.precio_hora.toLocaleString('es-CO')} / hora`
                        : 'A convenir'}
                    </p>
                    {place.caracteristicas && (
                      <p style={{ marginBottom: '0.75rem' }}>
                        <strong>Características:</strong> {place.caracteristicas}
                      </p>
                    )}
                    {place.nivel_ruido && (
                      <p style={{ marginBottom: '0.75rem', fontSize: '0.85rem', opacity: 0.85 }}>
                        Nivel de ruido: {place.nivel_ruido}
                      </p>
                    )}
                  </div>
                )}
                <span style={{ fontSize: '0.85rem', color: '#888' }}>
                  Confirma los datos y simula tu pago para reservar.
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </>
  )
}

export default PlacesList

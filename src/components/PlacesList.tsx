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
  unavailable_reason?: string | null
  available_from?: string | null
}

interface PlacesListProps {
  places: Place[]
  loading: boolean
  error: string | null
  onReserve: (placeId: number) => void
}

const getPriceByModality = (precioHora: number | null, modalidad: string | null) => {
  if (precioHora == null) return 'A convenir'

  const unidades: Record<string, string> = {
    'Por hora': '/ hora',
    'Media jornada (4 horas)': '/ 4 horas',
    'Jornada completa (8 horas)': '/ 8 horas',
    'Por día': '/ día',
    'Por noche': '/ noche',
    'Por semana': '/ semana',
    'Solo por cita': ' por cita',
    'Flexible (acordar con el propietario)': '/ tarifa',
  }

  return `$${precioHora.toLocaleString('es-CO')}${unidades[modalidad ?? ''] ?? ''}`
}

const availabilityDate = (value: string | null | undefined) => value
  ? new Date(value).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
  : null

const PlacesList: React.FC<PlacesListProps> = ({ places, loading, error, onReserve }) => {
  const [openDetailId, setOpenDetailId] = useState<number | null>(null);

  const toggleDetails = (id: number) => {
    setOpenDetailId(prev => (prev === id ? null : id));
  };

  const columns = Array.from({ length: 3 }, (_, columnIndex) =>
    places.filter((_, index) => index % 3 === columnIndex)
  );

  const renderPlaceCard = (place: Place) => {
    const isOpen = openDetailId === place.id;

    return (
      <div
        key={place.id}
        className="feature-card"
        style={{
          minHeight: isOpen ? 'auto' : '220px',
          transition: 'min-height 0.2s ease, transform 0.22s cubic-bezier(.4,1.6,.6,1)',
        }}
      >
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
            {isOpen ? 'Ocultar detalles' : 'Detalles'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onReserve(place.id)}
            disabled={!place.active}
          >
            {place.active ? 'Reserva ya' : 'No disponible'}
          </button>
        </div>
        {isOpen && (
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
              <strong>Precio:</strong>{' '}
              {getPriceByModality(place.precio_hora, place.modalidad)}
            </p>
            {!place.active && (
              <p style={{ marginBottom: '0.75rem', color: '#f0a36b' }}>
                <strong>Motivo:</strong> {place.unavailable_reason || 'No disponible temporalmente'}.
                {availabilityDate(place.available_from) && ` Disponible nuevamente el ${availabilityDate(place.available_from)}.`}
              </p>
            )}
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
    )
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
            columns.map((columnPlaces, columnIndex) => (
              <div key={`column-${columnIndex}`} className="places-column">
                {columnPlaces.map(place => renderPlaceCard(place))}
              </div>
            ))
          )}
        </div>
      )}
    </>
  )
}

export default PlacesList

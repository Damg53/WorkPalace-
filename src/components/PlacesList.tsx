import React, { useEffect, useState } from 'react'
import './PlacesList.css'

interface Place {
  id: number
  name: string
  tipo: string
  direccion: string | null
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
  userId?: number
  places: Place[]
  loading: boolean
  error: string | null
  onReserve: (placeId: number) => void
}

interface Favorite {
  id: number
  place_id: number
  place_name: string
  place_city: string | null
}

const API = 'http://localhost:3001'

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

const PlacesList: React.FC<PlacesListProps> = ({ userId, places, loading, error, onReserve }) => {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loadingFavorites, setLoadingFavorites] = useState(true)
  const [pendingFavoriteId, setPendingFavoriteId] = useState<number | null>(null)
  const [favoriteError, setFavoriteError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedPlace) return

    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedPlace(null)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [selectedPlace])

  useEffect(() => {
    let cancelled = false

    async function fetchFavorites() {
      if (userId == null) {
        setFavorites([])
        setLoadingFavorites(false)
        return
      }

      setLoadingFavorites(true)
      try {
        const response = await fetch(`${API}/api/users/${userId}/favorites`, {
          headers: { 'x-user-id': String(userId) },
        })
        const data = await response.json() as { favorites?: Favorite[]; error?: string }
        if (!response.ok) {
          throw new Error(data.error || 'No se pudieron cargar los favoritos.')
        }
        if (!cancelled) {
          setFavorites(data.favorites || [])
          setFavoriteError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setFavoriteError(error instanceof Error ? error.message : 'No se pudieron cargar los favoritos.')
        }
      } finally {
        if (!cancelled) setLoadingFavorites(false)
      }
    }

    void fetchFavorites()
    return () => { cancelled = true }
  }, [userId])

  const toggleFavorite = async (place: Place) => {
    if (userId == null || pendingFavoriteId != null) return

    const isFavorite = favorites.some((favorite) => favorite.place_id === place.id)
    setPendingFavoriteId(place.id)
    setFavoriteError(null)

    try {
      const response = await fetch(
        isFavorite
          ? `${API}/api/users/${userId}/favorites/${place.id}`
          : `${API}/api/users/${userId}/favorites`,
        {
          method: isFavorite ? 'DELETE' : 'POST',
          headers: {
            'x-user-id': String(userId),
            ...(isFavorite ? {} : { 'Content-Type': 'application/json' }),
          },
          ...(!isFavorite && {
            body: JSON.stringify({
              placeId: place.id,
              placeName: place.name,
              placeCity: place.ciudad || '',
            }),
          }),
        },
      )

      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null
        throw new Error(data?.error || 'No se pudo actualizar el favorito.')
      }

      if (isFavorite) {
        setFavorites((current) => current.filter((favorite) => favorite.place_id !== place.id))
      } else {
        const data = await response.json() as { favorite: Favorite }
        setFavorites((current) => [
          {
            id: data.favorite.id,
            place_id: data.favorite.place_id ?? place.id,
            place_name: data.favorite.place_name ?? place.name,
            place_city: data.favorite.place_city ?? place.ciudad,
          },
          ...current.filter((favorite) => favorite.place_id !== place.id),
        ])
      }
    } catch (error) {
      setFavoriteError(error instanceof Error ? error.message : 'No se pudo actualizar el favorito.')
    } finally {
      setPendingFavoriteId(null)
    }
  }

  const renderPlaceCard = (place: Place) => {
    const isFavorite = favorites.some((favorite) => favorite.place_id === place.id)

    return (
      <div
        key={place.id}
        className="feature-card place-card"
      >
        {place.image_url && (
          <div className="place-image-wrapper">
            <img src={place.image_url} alt={place.name} className="place-image" />
          </div>
        )}
        {userId != null && (
          <button
            type="button"
            className={`place-favorite-button${isFavorite ? ' is-favorite' : ''}`}
            onClick={() => void toggleFavorite(place)}
            disabled={loadingFavorites || pendingFavoriteId != null}
            aria-pressed={isFavorite}
            aria-label={pendingFavoriteId === place.id
              ? 'Guardando favorito'
              : isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          >
            <i
              className={`fa ${pendingFavoriteId === place.id ? 'fa-spinner fa-spin' : isFavorite ? 'fa-heart' : 'fa-heart-o'}`}
              aria-hidden="true"
            />
            <span className="place-favorite-tooltip" aria-hidden="true">
              {pendingFavoriteId === place.id
                ? 'Guardando...'
                : isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            </span>
          </button>
        )}
        <div className="place-card-heading">
          <h3 style={{
            margin: 0,
            fontSize: '1.35rem',
            fontWeight: 700
          }}>{place.tipo}</h3>
          <span className={`place-availability${place.active ? '' : ' is-unavailable'}`}>
            {place.active ? 'Disponible' : 'No disponible'}
          </span>
        </div>
        <div className="place-card-actions">
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '0.5rem 1.1rem', fontSize: '0.95rem', border: '1px solid #667eea', background: '#fff', color: '#333', borderRadius: '7px', fontWeight: 500, cursor: 'pointer' }}
            onClick={() => setSelectedPlace(place)}
          >
            Detalles
          </button>
          <button
            type="button"
            className={`btn btn-primary place-reserve-button${place.active ? '' : ' is-unavailable'}`}
            onClick={() => onReserve(place.id)}
            disabled={!place.active}
          >
            {place.active ? 'Reserva ya' : 'Ocupado'}
          </button>
        </div>
        <span style={{ fontSize: '0.85rem', color: '#888' }}>
          Confirma los datos y simula tu pago para reservar.
        </span>
      </div>
    )
  };

  return (
    <>
      {error && <p className="reservations-error">{error}</p>}
      {favoriteError && <p className="place-favorite-error" role="alert">{favoriteError}</p>}
      {selectedPlace && (
        <div
          className="place-detail-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedPlace(null)
          }}
        >
          <section
            className="place-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="place-detail-title"
          >
            <header className="place-detail-modal__header">
              <div>
                <span className={`place-availability${selectedPlace.active ? '' : ' is-unavailable'}`}>
                  {selectedPlace.active ? 'Disponible' : 'No disponible'}
                </span>
                <h2 id="place-detail-title">{selectedPlace.name || selectedPlace.tipo}</h2>
                <p>{selectedPlace.tipo}</p>
              </div>
              <button
                type="button"
                className="place-detail-modal__close"
                onClick={() => setSelectedPlace(null)}
                aria-label="Cerrar detalles"
              >
                ×
              </button>
            </header>

            {selectedPlace.image_url && (
              <img className="place-detail-modal__image" src={selectedPlace.image_url} alt={selectedPlace.name} />
            )}

            <dl className="place-detail-list">
              <div>
                <dt>Dirección</dt>
                <dd>
                  {selectedPlace.direccion ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        [selectedPlace.direccion, selectedPlace.barrio, selectedPlace.ciudad].filter(Boolean).join(', '),
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {selectedPlace.direccion}
                    </a>
                  ) : 'No especificada'}
                </dd>
              </div>
              <div>
                <dt>Ubicación</dt>
                <dd>{[selectedPlace.barrio, selectedPlace.ciudad].filter(Boolean).join(', ') || 'No especificada'}</dd>
              </div>
              <div>
                <dt>Capacidad</dt>
                <dd>{selectedPlace.capacidad || 'Sin especificar'}</dd>
              </div>
              <div>
                <dt>Modalidad</dt>
                <dd>{selectedPlace.modalidad || 'Consultar disponibilidad'}</dd>
              </div>
              <div>
                <dt>Precio</dt>
                <dd>{getPriceByModality(selectedPlace.precio_hora, selectedPlace.modalidad)}</dd>
              </div>
              {selectedPlace.nivel_ruido && (
                <div>
                  <dt>Nivel de ruido</dt>
                  <dd>{selectedPlace.nivel_ruido}</dd>
                </div>
              )}
            </dl>

            {!selectedPlace.active && (
              <p className="place-detail-modal__unavailable">
                <strong>Motivo:</strong> {selectedPlace.unavailable_reason || 'No disponible temporalmente'}.
                {availabilityDate(selectedPlace.available_from) && ` Disponible nuevamente el ${availabilityDate(selectedPlace.available_from)}.`}
              </p>
            )}
            {selectedPlace.caracteristicas && (
              <p className="place-detail-modal__features">
                <strong>Características:</strong> {selectedPlace.caracteristicas}
              </p>
            )}

            <footer className="place-detail-modal__footer">
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedPlace(null)}>
                Cerrar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onReserve(selectedPlace.id)}
                disabled={!selectedPlace.active}
              >
                {selectedPlace.active ? 'Reservar espacio' : 'No disponible'}
              </button>
            </footer>
          </section>
        </div>
      )}
      {loading ? (
        <p className="settings-loading">Cargando espacios disponibles...</p>
      ) : (
        <div className="features-grid places-grid">
          {places.length === 0 ? (
            <p style={{ padding: '1.5rem 0', color: '#666' }}>
              No hay espacios registrados aún en la base de datos.
            </p>
          ) : (
            places.map((place) => renderPlaceCard(place))
          )}
        </div>
      )}
    </>
  )
}

export default PlacesList

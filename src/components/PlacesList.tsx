import React, { useEffect, useState } from 'react'
import './PlacesList.css'
import { API_BASE_URL } from '../services/api'
import { formatAvailableFrom, formatReadableDate } from '../utils/dateFormatting'

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
  owner_name?: string | null
  average_rating?: number | string | null
  review_count?: number | string | null
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

interface PlaceReview {
  id: number
  rating: number
  comment: string | null
  reviewer_name: string
  created_at: string
}

const API = API_BASE_URL

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
  }

  return `$${precioHora.toLocaleString('es-CO')}${unidades[modalidad ?? ''] ?? ''}`
}

const PlacesList: React.FC<PlacesListProps> = ({ userId, places, loading, error, onReserve }) => {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loadingFavorites, setLoadingFavorites] = useState(true)
  const [pendingFavoriteId, setPendingFavoriteId] = useState<number | null>(null)
  const [favoriteError, setFavoriteError] = useState<string | null>(null)
  const [placeReviews, setPlaceReviews] = useState<PlaceReview[]>([])
  const [reviewsError, setReviewsError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedPlace) {
      setPlaceReviews([])
      setReviewsError(null)
      return
    }

    const placeId = selectedPlace.id
    let cancelled = false
    async function fetchReviews() {
      try {
        const response = await fetch(`${API}/api/places/${placeId}/reviews`)
        const data = await response.json() as { reviews?: PlaceReview[]; error?: string }
        if (!response.ok) throw new Error(data.error || 'No se pudieron cargar las reseñas.')
        if (!cancelled) {
          setPlaceReviews(data.reviews || [])
          setReviewsError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setReviewsError(error instanceof Error ? error.message : 'No se pudieron cargar las reseñas.')
        }
      }
    }

    void fetchReviews()
    return () => { cancelled = true }
  }, [selectedPlace])

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
    const placeName = place.name || place.tipo
    const reviewCount = Number(place.review_count ?? 0)
    const availableFrom = formatAvailableFrom(place.available_from)

    return (
      <div
        key={place.id}
        className="feature-card place-card"
      >
        <div className="place-image-wrapper">
          {place.image_url ? (
            <img src={place.image_url} alt={place.name} className="place-image" />
          ) : (
            <div className="place-image-placeholder">
              <span className="fa fa-picture-o" aria-hidden="true" />
              <span>Espacio sin foto</span>
            </div>
          )}
        </div>
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
            {pendingFavoriteId === place.id ? (
              <svg className="place-favorite-spinner" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeDasharray="34 22" />
              </svg>
            ) : (
              <svg className="place-favorite-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"
                  fill={isFavorite ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            <span className="place-favorite-tooltip" aria-hidden="true">
              {pendingFavoriteId === place.id
                ? 'Guardando...'
                : isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            </span>
          </button>
        )}
        <div className="place-card-heading">
          <div className="place-card-heading__copy">
            <h3>{placeName}</h3>
            <span className="place-card__type">{place.tipo}</span>
          </div>
          <span className={`place-availability${place.active ? '' : ' is-unavailable'}`}>
            {place.active ? 'Disponible' : 'No disponible'}
          </span>
        </div>
        <p className="place-card__price">{getPriceByModality(place.precio_hora, place.modalidad)}</p>
        <p className="place-card__location">
          {[place.barrio, place.ciudad].filter(Boolean).join(', ') || 'Ubicación por confirmar'}
        </p>
        <p className="place-card__trust">
          {reviewCount > 0
            ? <><span aria-hidden="true">★</span> {Number(place.average_rating).toFixed(1)} · {reviewCount} {reviewCount === 1 ? 'reseña verificada' : 'reseñas verificadas'}</>
            : 'Aún sin reseñas'}
        </p>
        {!place.active && (
          <p className="place-card__unavailable">
            {place.unavailable_reason || 'No disponible temporalmente'}
            {availableFrom && ` · Disponible nuevamente el ${availableFrom}`}
          </p>
        )}
        <div className="place-card-actions">
          <button
            type="button"
            className="place-details-button"
            onClick={() => setSelectedPlace(place)}
            aria-label={`Ver detalles de ${placeName}`}
          >
            Detalles
          </button>
          <button
            type="button"
            className={`btn btn-primary place-reserve-button${place.active ? '' : ' is-unavailable'}`}
            onClick={() => onReserve(place.id)}
            disabled={!place.active}
          >
            {place.active ? 'Reservar' : 'Ocupado'}
          </button>
        </div>
      </div>
    )
  }

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
            <p className="place-detail-modal__price-note">
              Precio publicado por el anfitrión. El valor final se confirma en el resumen antes de reservar.
            </p>
            <div className="place-detail-modal__host">
              <strong>Anfitrión</strong>
              <span>{selectedPlace.owner_name || 'Equipo WorkPalace'}</span>
              <span>La solicitud queda pendiente hasta que el anfitrión la confirme.</span>
            </div>

            {!selectedPlace.active && (
              <p className="place-detail-modal__unavailable">
                <strong>Motivo:</strong> {selectedPlace.unavailable_reason || 'No disponible temporalmente'}.
                {formatAvailableFrom(selectedPlace.available_from) && ` Disponible nuevamente el ${formatAvailableFrom(selectedPlace.available_from)}.`}
              </p>
            )}
            {selectedPlace.caracteristicas && (
              <p className="place-detail-modal__features">
                <strong>Características:</strong> {selectedPlace.caracteristicas}
              </p>
            )}
            <details className="place-reviews">
              <summary>
                <span>
                  Reseñas verificadas
                  {Number(selectedPlace.review_count) > 0 && (
                    <span className="place-reviews__rating"> · ★ {Number(selectedPlace.average_rating).toFixed(1)} ({selectedPlace.review_count})</span>
                  )}
                </span>
                <span className="place-reviews__toggle">Ver reseñas</span>
              </summary>
              {reviewsError ? (
                <p className="place-reviews__message" role="alert">{reviewsError}</p>
              ) : placeReviews.length === 0 ? (
                <p className="place-reviews__message">Todavía no hay reseñas de reservas completadas.</p>
              ) : (
                <div className="place-reviews__list">
                  {placeReviews.map((review) => (
                    <article className="place-review" key={review.id}>
                      <strong>{review.reviewer_name} · {'★'.repeat(review.rating)}</strong>
                      {review.comment && <p>{review.comment}</p>}
                      <small>Reserva completada · {formatReadableDate(review.created_at)}</small>
                    </article>
                  ))}
                </div>
              )}
            </details>

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
        <div className="places-loading" role="status">
          <span className="places-loading__spinner" aria-hidden="true" />
          Cargando espacios disponibles...
        </div>
      ) : (
        <div className="features-grid places-grid">
          {places.length === 0 ? (
            <div className="places-empty-state">
              <span className="fa fa-search" aria-hidden="true" />
              <h3>No encontramos espacios</h3>
              <p>Prueba ajustar la búsqueda o los filtros para ver otras opciones.</p>
            </div>
          ) : (
            places.map((place) => renderPlaceCard(place))
          )}
        </div>
      )}
    </>
  )
}

export default PlacesList

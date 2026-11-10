import React, { useEffect, useState } from 'react'
import PlacesList from './PlacesList'
import PlacesFilter from './PlacesFilter'
import Sidebar from './Sidebar'
import { useNavigate } from 'react-router-dom'
import { createRealtimeClient, type SealedLiveQuery } from '@neon/realtime/client'
import { API_BASE_URL } from '../services/api'

const API = API_BASE_URL

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

type LivePlace = Omit<Place, 'available_from'> & { available_from: string | Date | null }

interface PlaceFilters {
  search: string
  tipo: string
  ciudad: string
  barrio: string
  capacidad: string
  modalidad: string
  precioMin: string
  precioMax: string
  orden: string
}

interface PlacesPageProps {
  user: { id?: number; username: string; role?: string; fullName?: string; email?: string }
  isDark: boolean
  setIsDark: (value: boolean) => void
  onLogout: () => void
}

const PlacesPage: React.FC<PlacesPageProps> = ({ user, isDark, setIsDark, onLogout }) => {
  const navigate = useNavigate()
  const [places, setPlaces] = useState<Place[]>([])
  const [filtered, setFiltered] = useState<Place[]>([])
  const [loadingSpaces, setLoadingSpaces] = useState(true)
  const [spacesError, setSpacesError] = useState<string | null>(null)
  const [filters, setFilters] = useState<PlaceFilters>({
    search: '',
    tipo: '',
    ciudad: '',
    barrio: '',
    capacidad: '',
    modalidad: '',
    precioMin: '',
    precioMax: '',
    orden: 'recomendados',
  })

  useEffect(() => {
    let cancelled = false
    async function fetchPlaces() {
      try {
        if (!user?.id) {
          setPlaces([])
          setLoadingSpaces(false)
          return
        }
        const res = await fetch(`${API}/api/places`, {
          headers: {
            'x-user-id': String(user.id),
          },
        })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setSpacesError(data.error || 'Error al cargar espacios disponibles')
          return
        }
        setPlaces(data.places || [])
        setFiltered(data.places || [])
      } catch {
        if (!cancelled) setSpacesError('No se pudieron cargar los espacios disponibles.')
      } finally {
        if (!cancelled) setLoadingSpaces(false)
      }
    }
    fetchPlaces()
    return () => { cancelled = true }
  }, [user?.id])

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    let closeSubscription: (() => void) | undefined

    async function refreshLivePlaces() {
      try {
        const response = await fetch(`${API}/api/realtime/places`, {
          headers: { 'x-user-id': String(user.id) },
        })
        const data = await response.json() as {
          url: string
          query: SealedLiveQuery<LivePlace>
          error?: string
        }
        if (!response.ok) {
          throw new Error(data.error || 'No se pudo conectar con la disponibilidad en tiempo real.')
        }
        if (cancelled) return

        closeSubscription?.()
        const client = createRealtimeClient({ url: data.url })
        const subscription = client.subscribe(data.query)
        closeSubscription = () => {
          subscription.unsubscribe()
          client.close()
        }
        subscription.onChange((snapshot) => {
          if (cancelled || !snapshot.data) return
          const nextPlaces = snapshot.data.map((place) => ({
            ...place,
            available_from: place.available_from instanceof Date
              ? place.available_from.toISOString()
              : place.available_from,
          }))
          setPlaces(nextPlaces)
          setLoadingSpaces(false)
          setSpacesError(null)
        })
      } catch (error) {
        if (!cancelled) {
          setSpacesError(error instanceof Error
            ? error.message
            : 'No se pudo conectar con la disponibilidad en tiempo real.')
        }
      } finally {
        if (!cancelled) {
          timer = window.setTimeout(refreshLivePlaces, 45_000)
        }
      }
    }

    if (user?.id) void refreshLivePlaces()
    return () => {
      cancelled = true
      if (timer !== undefined) window.clearTimeout(timer)
      closeSubscription?.()
    }
  }, [user?.id])

  useEffect(() => {
    let result = places
    if (filters.search.trim()) {
      const search = filters.search.trim().toLowerCase()
      result = result.filter((place) =>
        place.name.toLowerCase().includes(search) ||
        place.tipo?.toLowerCase().includes(search) ||
        place.caracteristicas?.toLowerCase().includes(search)
      )
    }
    if (filters.tipo) result = result.filter((place) => place.tipo === filters.tipo)
    if (filters.ciudad) result = result.filter((place) => place.ciudad === filters.ciudad)
    if (filters.barrio) result = result.filter((place) => place.barrio === filters.barrio)
    if (filters.modalidad) result = result.filter((place) => place.modalidad === filters.modalidad)
    const minPrice = filters.precioMin === '' ? null : Number(filters.precioMin)
    const maxPrice = filters.precioMax === '' ? null : Number(filters.precioMax)
    if (minPrice !== null) result = result.filter((place) => place.precio_hora != null && place.precio_hora >= minPrice)
    if (maxPrice !== null) result = result.filter((place) => place.precio_hora != null && place.precio_hora <= maxPrice)
    if (filters.capacidad) {
      const exact = Number.parseInt(filters.capacidad, 10)
      if (!Number.isNaN(exact)) {
        result = result.filter((place) => {
          const match = place.capacidad?.match(/\d+/)
            return match !== null && match !== undefined && Number.parseInt(match[0], 10) === exact
        })
      }
    }
    if (filters.orden === 'precio-asc') {
      result = [...result].sort((a, b) => (a.precio_hora ?? Number.MAX_SAFE_INTEGER) - (b.precio_hora ?? Number.MAX_SAFE_INTEGER))
    } else if (filters.orden === 'precio-desc') {
      result = [...result].sort((a, b) => (b.precio_hora ?? -1) - (a.precio_hora ?? -1))
    } else if (filters.orden === 'calificacion') {
      result = [...result].sort((a, b) => Number(b.average_rating ?? 0) - Number(a.average_rating ?? 0))
    }
    setFiltered(result)
  }, [places, filters])

  // Filtros únicos para selects
  const tipos = Array.from(new Set(places.map(p => p.tipo).filter((x): x is string => !!x)))
  const ciudades = Array.from(new Set(places.map(p => p.ciudad).filter((x): x is string => !!x)))
  const barrios = Array.from(new Set(places.map(p => p.barrio).filter((x): x is string => !!x)))
  const modalidades = Array.from(new Set(places.map(p => p.modalidad).filter((x): x is string => !!x)))

  function handleFilter(nextFilters: PlaceFilters) {
    setFilters(nextFilters)
  }

  function handleReserve(placeId: number) {
    if (user && user.id != null) {
      navigate(`/checkout/${placeId}`)
    } else {
      const redirect = encodeURIComponent(`/checkout/${placeId}`)
      navigate(`/login?redirect=${redirect}`)
    }
  }

  return (
    <div className="with-sidebar">
      <Sidebar user={user} isDark={isDark} setIsDark={setIsDark} onLogout={onLogout} />
      <section className="features" id="explore-spaces">
        <div className="features-container">
          <h2 className="section-title">Explora espacios disponibles</h2>
          <p style={{ marginBottom: '1.5rem', maxWidth: 720 }}>
            Aquí verás todos los espacios publicados, incluso si están temporalmente ocupados. Cuando no estén disponibles, te mostramos el motivo y la fecha estimada en que vuelven a estar libres.
          </p>
          <PlacesFilter
            onFilter={handleFilter}
            tipos={tipos}
            ciudades={ciudades}
            barrios={barrios}
            modalidades={modalidades}
          />
          <PlacesList
            userId={user.id}
            places={filtered}
            loading={loadingSpaces}
            error={spacesError}
            onReserve={handleReserve}
          />
        </div>
      </section>
    </div>
  )
}

export default PlacesPage

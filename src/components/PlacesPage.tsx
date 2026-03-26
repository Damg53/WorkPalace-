import React, { useEffect, useState } from 'react'
import PlacesList from './PlacesList'
import PlacesFilter from './PlacesFilter'
import Navbar from './Navbar'
import { useNavigate } from 'react-router-dom'

const API = 'http://localhost:3001'

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
      } catch (_e) {
        if (!cancelled) setSpacesError('No se pudieron cargar los espacios disponibles.')
      } finally {
        if (!cancelled) setLoadingSpaces(false)
      }
    }
    fetchPlaces()
    return () => { cancelled = true }
  }, [user?.id])

  // Filtros únicos para selects
  const tipos = Array.from(new Set(places.map(p => p.tipo).filter((x): x is string => !!x)))
  const ciudades = Array.from(new Set(places.map(p => p.ciudad).filter((x): x is string => !!x)))
  const barrios = Array.from(new Set(places.map(p => p.barrio).filter((x): x is string => !!x)))
  const modalidades = Array.from(new Set(places.map(p => p.modalidad).filter((x): x is string => !!x)))

  function handleFilter(filters: {
    search: string
    tipo?: string
    ciudad: string
    barrio: string
    capacidad: string
    modalidad: string
  }) {
    let result = places
    if (filters.search && filters.search.trim() !== "") {
      const s = filters.search.trim().toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(s) ||
        (p.tipo && p.tipo.toLowerCase().includes(s)) ||
        (p.caracteristicas && p.caracteristicas.toLowerCase().includes(s))
      );
    }
    if (filters.tipo) result = result.filter(p => p.tipo === filters.tipo)
    if (filters.ciudad) result = result.filter(p => p.ciudad === filters.ciudad)
    if (filters.barrio) result = result.filter(p => p.barrio === filters.barrio)
    if (filters.modalidad) result = result.filter(p => p.modalidad === filters.modalidad)
    if (filters.capacidad) {
      const exact = parseInt(filters.capacidad)
      if (!isNaN(exact)) {
        result = result.filter(p => {
          if (!p.capacidad) return false;
          // Extraer el primer número de la cadena de capacidad
          const match = p.capacidad.match(/\d+/);
          if (!match) return false;
          const n = parseInt(match[0]);
          return !isNaN(n) && n === exact;
        });
      }
    }
    setFiltered(result)
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
    <>
      <Navbar isDark={isDark} setIsDark={setIsDark} user={user} onLogout={onLogout} />
      <section className="features" id="explore-spaces">
        <div className="features-container">
          <h2 className="section-title">Explora espacios disponibles</h2>
          <p style={{ marginBottom: '1.5rem', maxWidth: 720 }}>
            Estos son los espacios publicados en la plataforma.
          </p>
          <PlacesFilter
            onFilter={handleFilter}
            tipos={tipos}
            ciudades={ciudades}
            barrios={barrios}
            modalidades={modalidades}
          />
          <PlacesList
            places={filtered}
            loading={loadingSpaces}
            error={spacesError}
            onReserve={handleReserve}
          />
        </div>
      </section>
    </>
  )
}

export default PlacesPage

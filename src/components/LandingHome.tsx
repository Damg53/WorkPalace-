import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE_URL } from '../services/api'
import ContactDock from './ContactDock'
import './LandingHome.css'

interface LandingPlace {
  id: number
  name: string
  tipo: string
  barrio: string | null
  ciudad: string | null
  precio_hora: number | null
  caracteristicas: string | null
  image_url: string | null
  average_rating: number | string | null
  review_count: number | string | null
}

const PUBLIC_PLACES_CACHE_KEY = 'workpalace:public-places:v1'

function isLandingPlace(value: unknown): value is LandingPlace {
  if (!value || typeof value !== 'object') return false
  const place = value as Record<string, unknown>
  return Number.isFinite(place.id)
    && typeof place.name === 'string'
    && typeof place.tipo === 'string'
}

function readCachedPlaces() {
  try {
    const cached: unknown = JSON.parse(localStorage.getItem(PUBLIC_PLACES_CACHE_KEY) || 'null')
    return Array.isArray(cached) ? cached.filter(isLandingPlace) : []
  } catch (error) {
    console.warn('No se pudieron leer los espacios destacados guardados:', error)
    return []
  }
}

function cachePlaces(places: LandingPlace[]) {
  try {
    localStorage.setItem(PUBLIC_PLACES_CACHE_KEY, JSON.stringify(places))
  } catch (error) {
    try {
      const withoutImages = places.map((place) => ({ ...place, image_url: null }))
      localStorage.setItem(PUBLIC_PLACES_CACHE_KEY, JSON.stringify(withoutImages))
      console.warn('Se guardaron los espacios destacados sin sus imágenes por falta de espacio:', error)
    } catch (cacheError) {
      console.warn('No se pudieron guardar los espacios destacados para usarlos sin conexión:', cacheError)
    }
  }
}

const CATEGORIES = [
  'Estudios creativos',
  'Cocinas industriales',
  'Talleres y oficios',
  'Salas y espacios flexibles',
]

const STEPS = [
  {
    title: 'Encuentra el lugar indicado',
    items: [
      ['Explora opciones', 'Descubre espacios productivos y compara su información.'],
      ['Usa los filtros', 'Busca por ciudad, tipo, capacidad y modalidad.'],
    ],
  },
  {
    title: 'Elige cuándo lo necesitas',
    items: [
      ['Selecciona tu horario', 'Consulta las modalidades y fechas disponibles para el espacio.'],
      ['Revisa tu solicitud', 'Confirma los datos de tu reserva antes de enviarla.'],
    ],
  },
  {
    title: 'Coordina y comparte',
    items: [
      ['Gestiona tu reserva', 'Consulta el estado de tus solicitudes desde tu cuenta.'],
      ['Deja una reseña', 'Después de completar la reserva, comparte tu experiencia.'],
    ],
  },
]

const FAQ = [
  ['¿Qué tipo de espacios puedo encontrar?', 'Puedes explorar espacios productivos como estudios, cocinas, talleres y otros lugares publicados en la plataforma.'],
  ['¿Puedo reservar por horas?', 'La modalidad depende de cada espacio. En su ficha puedes revisar las opciones disponibles antes de enviar una solicitud.'],
  ['¿Cómo publico mi espacio?', 'Crea una cuenta y elige la opción para registrarte como propietario. Luego podrás administrar tu publicación.'],
  ['¿Puedo dejar una reseña?', 'Sí. Puedes compartir una reseña cuando tu reserva haya sido completada.'],
]

function useInView<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const element = ref.current
    if (!element || visible) return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true)
        observer.disconnect()
      }
    }, { threshold })
    observer.observe(element)
    return () => observer.disconnect()
  }, [threshold, visible])

  return [ref, visible] as const
}

function formatPesos(value: number) {
  return `$${value.toLocaleString('es-CO')}`
}

function locationLabel(place: LandingPlace) {
  return [place.barrio, place.ciudad].filter(Boolean).join(', ') || 'Colombia'
}

function cardPalette(tipo: string) {
  const normalized = tipo.toLowerCase()
  if (normalized.includes('cocina')) return { a: '#b95f37', b: '#d33f78', icon: '♨' }
  if (normalized.includes('taller') || normalized.includes('carpinter')) return { a: '#227b65', b: '#3967aa', icon: '⌁' }
  if (normalized.includes('foto')) return { a: '#6952a3', b: '#a44377', icon: '◉' }
  return { a: '#3054ad', b: '#7468c9', icon: '▦' }
}

function usePublicPlaces() {
  const [initialPlaces] = useState(readCachedPlaces)
  const [places, setPlaces] = useState<LandingPlace[]>(initialPlaces)
  const [loading, setLoading] = useState(initialPlaces.length === 0)
  const [loadError, setLoadError] = useState(false)
  const [usingCachedData, setUsingCachedData] = useState(initialPlaces.length > 0)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    let requestInFlight = false
    let controller: AbortController | null = null
    async function loadPlaces() {
      if (requestInFlight) return
      requestInFlight = true
      controller = new AbortController()
      const timeout = window.setTimeout(() => controller?.abort(), 10_000)
      try {
        const response = await fetch(`${API_BASE_URL}/api/public/places`, { signal: controller.signal })
        const data = await response.json() as { places?: unknown; error?: string }
        if (!response.ok) throw new Error(data.error || 'No se pudieron cargar los espacios destacados.')
        if (cancelled) return
        const listedPlaces = Array.isArray(data.places) ? data.places.filter(isLandingPlace) : []
        setPlaces(listedPlaces)
        setLoadError(false)
        setUsingCachedData(false)
        cachePlaces(listedPlaces)
      } catch {
        if (!cancelled) {
          setLoadError(true)
          setUsingCachedData(true)
        }
      } finally {
        window.clearTimeout(timeout)
        requestInFlight = false
        if (!cancelled) setLoading(false)
      }
    }

    void loadPlaces()
    const retryTimer = window.setInterval(() => { void loadPlaces() }, 5 * 60 * 1000)
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void loadPlaces()
    }
    window.addEventListener('online', loadPlaces)
    window.addEventListener('focus', loadPlaces)
    window.addEventListener('pageshow', loadPlaces)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      cancelled = true
      controller?.abort()
      window.clearInterval(retryTimer)
      window.removeEventListener('online', loadPlaces)
      window.removeEventListener('focus', loadPlaces)
      window.removeEventListener('pageshow', loadPlaces)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [retryKey])

  return {
    places,
    loading,
    loadError,
    usingCachedData,
    retry: () => setRetryKey((current) => current + 1),
  }
}

interface PublicPlacesState {
  places: LandingPlace[]
  loading: boolean
  loadError: boolean
  usingCachedData: boolean
  retry: () => void
}

function Pila({ places, loadError, usingCachedData, retry }: PublicPlacesState) {
  const [order, setOrder] = useState<number[]>(() => places.map((place) => place.id))
  const [paused, setPaused] = useState(false)
  const placeIds = places.map((place) => place.id)
  const hasCurrentOrder = order.length === placeIds.length && order.every((id) => placeIds.includes(id))
  const visibleOrder = hasCurrentOrder ? order : placeIds

  useEffect(() => {
    const ids = places.map((place) => place.id)
    if (paused || ids.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => {
      setOrder((current) => {
        const isCurrent = current.length === ids.length && current.every((id) => ids.includes(id))
        const activeOrder = isCurrent ? current : ids
        return [...activeOrder.slice(1), activeOrder[0]]
      })
    }, 5000)
    return () => window.clearInterval(timer)
  }, [places, paused])

  const advance = () => setOrder((current) => {
    const activeOrder = current.length === placeIds.length && current.every((id) => placeIds.includes(id)) ? current : placeIds
    return activeOrder.length > 1 ? [...activeOrder.slice(1), activeOrder[0]] : activeOrder
  })
  const showPlace = (id: number) => setOrder((current) => {
    const activeOrder = current.length === placeIds.length && current.every((placeId) => placeIds.includes(placeId)) ? current : placeIds
    const index = activeOrder.indexOf(id)
    return index < 0 ? activeOrder : [...activeOrder.slice(index), ...activeOrder.slice(0, index)]
  })

  return (
    <div
      className="wp-home-stack"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false)
      }}
    >
      {places.length > 0 ? (
        <>
          {usingCachedData && <p className="wp-home-stack__offline" role="status">Mostrando espacios guardados; la información podría no estar actualizada.</p>}
          {visibleOrder.slice(0, 4).map((id, position) => {
            const place = places.find((item) => item.id === id)
            if (!place) return null
            const topCard = position === 0
            const palette = cardPalette(place.tipo)
            const rating = Number(place.average_rating)
            const reviews = Number(place.review_count)
            return (
              <article
                key={place.id}
                className={`wp-home-stack__card${topCard ? ' is-top' : ''}`}
                style={{ '--card-position': position, '--card-a': palette.a, '--card-b': palette.b } as React.CSSProperties}
                aria-hidden={!topCard}
                onClick={topCard ? advance : undefined}
              >
                <div className="wp-home-stack__art">
                  <span className="wp-home-stack__icon" aria-hidden="true">{palette.icon}</span>
                  {place.image_url && <img src={place.image_url} alt="" onError={(event) => { event.currentTarget.hidden = true }} />}
                  <span className="wp-home-stack__published"><i /> Espacio publicado</span>
                  {reviews > 0 && <span className="wp-home-stack__rating">★ {rating.toFixed(1)} · {reviews}</span>}
                </div>
                <div className="wp-home-stack__body">
                  <span className="wp-home-stack__type">{place.tipo}</span>
                  <h2>{place.name}</h2>
                  <p className="wp-home-stack__location">{locationLabel(place)}</p>
                  <p className="wp-home-stack__detail">{place.caracteristicas || (reviews > 0 ? `${reviews} reseñas verificadas` : 'Descubre este espacio en WorkPalace.')}</p>
                  <div className="wp-home-stack__footer">
                    <strong>{place.precio_hora != null && Number(place.precio_hora) > 0 ? <>{formatPesos(Number(place.precio_hora))}<small> / hora</small></> : 'Consulta la tarifa'}</strong>
                    <Link to="/signup" tabIndex={topCard ? 0 : -1} onClick={(event) => event.stopPropagation()} className="wp-home-btn wp-home-btn--primary">
                      Explorar <span aria-hidden="true">↗</span>
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
          {places.length > 1 && <div className="wp-home-stack__dots" role="group" aria-label="Espacios destacados">
            {places.slice(0, 4).map((place) => (
              <button
                key={place.id}
                type="button"
                className={visibleOrder[0] === place.id ? 'is-active' : ''}
                aria-label={`Mostrar ${place.name}`}
                aria-pressed={visibleOrder[0] === place.id}
                onClick={() => showPlace(place.id)}
              />
            ))}
          </div>}
        </>
      ) : (
        <div className="wp-home-stack__empty" role={loadError ? 'alert' : 'status'}>
          <span aria-hidden="true">⌂</span>
          <strong>{loadError ? 'No pudimos cargar los espacios.' : 'Estamos preparando los espacios destacados.'}</strong>
          <p>{loadError ? 'Inténtalo de nuevo más tarde.' : 'Inicia sesión para explorar las publicaciones disponibles.'}</p>
          {loadError && <button type="button" className="wp-home-btn wp-home-btn--outline" onClick={retry}>Reintentar</button>}
          <Link to="/signup" className="wp-home-btn wp-home-btn--primary">Crear cuenta</Link>
        </div>
      )}
    </div>
  )
}

function FeaturedPlaces({ places, loading, loadError, usingCachedData, retry }: PublicPlacesState) {
  return (
    <section className="wp-home-section wp-home-categories" id="features">
      <div className="wp-home-section__heading">
        <div>
          <span className="wp-home-kicker">Encuentra tu lugar</span>
          <h2>Espacios para hacer realidad tus ideas</h2>
        </div>
        <Link to="/signup" className="wp-home-text-link">Explorar espacios <span aria-hidden="true">↗</span></Link>
      </div>
      {usingCachedData && <p className="wp-home-places__offline" role="status">Mostrando espacios guardados; la información podría no estar actualizada.</p>}
      {places.length > 0 ? (
        <div className="wp-home-places-grid">
          {places.slice(0, 4).map((place) => {
            const palette = cardPalette(place.tipo)
            const reviews = Number(place.review_count)
            const rating = Number(place.average_rating)
            return (
              <article
                className="wp-home-place-card"
                key={place.id}
                style={{ '--place-a': palette.a, '--place-b': palette.b } as React.CSSProperties}
              >
                <div className="wp-home-place-card__art">
                  <span aria-hidden="true">{palette.icon}</span>
                  {place.image_url && <img src={place.image_url} alt="" onError={(event) => { event.currentTarget.hidden = true }} />}
                  {reviews > 0 && <span className="wp-home-place-card__rating">★ {rating.toFixed(1)} · {reviews}</span>}
                </div>
                <div className="wp-home-place-card__body">
                  <span className="wp-home-place-card__type">{place.tipo}</span>
                  <h3>{place.name}</h3>
                  <p className="wp-home-place-card__location">{locationLabel(place)}</p>
                  <p className="wp-home-place-card__detail">{place.caracteristicas || 'Conoce más sobre este espacio publicado.'}</p>
                  <div className="wp-home-place-card__footer">
                    <strong>{place.precio_hora != null && Number(place.precio_hora) > 0 ? <>{formatPesos(Number(place.precio_hora))}<small> / hora</small></> : 'Consulta la tarifa'}</strong>
                    <Link to="/signup" className="wp-home-place-card__link" aria-label={`Explorar ${place.name}`}>Ver espacio <span aria-hidden="true">↗</span></Link>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="wp-home-places__empty" role={loadError ? 'alert' : 'status'}>
          <p>{loading ? 'Cargando espacios publicados…' : loadError ? 'No pudimos cargar los espacios publicados.' : 'Aún no hay espacios publicados para mostrar.'}</p>
          {loadError && <button type="button" className="wp-home-btn wp-home-btn--outline" onClick={retry}>Reintentar</button>}
        </div>
      )}
    </section>
  )
}

function Steps() {
  const [ref, visible] = useInView<HTMLOListElement>()

  return (
    <section className="wp-home-section wp-home-steps" id="como-funciona">
      <div className="wp-home-section__intro">
        <span className="wp-home-kicker">Simple y flexible</span>
        <h2>Un espacio para cada idea</h2>
        <p>Encuentra el lugar que necesitas y organiza tu tiempo de trabajo.</p>
      </div>
      <ol ref={ref} className={`wp-home-steps__list${visible ? ' is-visible' : ''}`}>
        <span className="wp-home-steps__line" aria-hidden="true" />
        {STEPS.map((step, index) => (
          <li className="wp-home-step" key={step.title} style={{ '--step-index': index } as React.CSSProperties}>
            <span className="wp-home-step__number">{String(index + 1).padStart(2, '0')}</span>
            <div className="wp-home-step__body">
              <h3>{step.title}</h3>
              <div className="wp-home-step__items">
                {step.items.map(([title, detail]) => <div key={title}><h4>{title}</h4><p>{detail}</p></div>)}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <section className="wp-home-section wp-home-faq" id="preguntas">
      <span className="wp-home-kicker">¿Tienes dudas?</span>
      <h2>Preguntas frecuentes</h2>
      <div className="wp-home-faq__list">
        {FAQ.map(([question, answer], index) => (
          <article className={`wp-home-faq__item${open === index ? ' is-open' : ''}`} key={question}>
            <button type="button" aria-expanded={open === index} onClick={() => setOpen(open === index ? -1 : index)}>
              {question}<span aria-hidden="true" />
            </button>
            <div className="wp-home-faq__answer"><p>{answer}</p></div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default function LandingHome() {
  const [heroRef, heroVisible] = useInView<HTMLElement>(0.1)
  const publicPlaces = usePublicPlaces()

  return (
    <div className="wp-home">
      <main>
        <section ref={heroRef} className={`wp-home-hero${heroVisible ? ' is-visible' : ''}`} id="inicio">
          <div className="wp-home-hero__glow" aria-hidden="true" />
          <div className="wp-home-hero__copy">
            <span className="wp-home-kicker"><span />Espacios productivos en Colombia</span>
            <h1>El espacio que necesitas, <em>por el tiempo que lo usas.</em></h1>
            <p>Encuentra estudios, cocinas, talleres y otros espacios para llevar tus proyectos más lejos. Explora opciones flexibles y reserva según tus necesidades.</p>
            <div className="wp-home-hero__actions">
              <Link to="/signup" className="wp-home-btn wp-home-btn--primary">Crear cuenta gratis</Link>
              <Link to="/login" className="wp-home-btn wp-home-btn--outline">Iniciar sesión</Link>
            </div>
            <p className="wp-home-hero__owner">¿Tienes un espacio? <Link to="/signup">Publícalo en WorkPalace <span aria-hidden="true">↗</span></Link></p>
          </div>
          <div className="wp-home-hero__preview"><Pila {...publicPlaces} /></div>
          <a className="wp-home-scroll" href="#espacios" aria-label="Desplazarse para explorar">Desliza para explorar <span aria-hidden="true">↓</span></a>
        </section>

        <div className="wp-home-ticker" aria-label="Tipos de espacios">
          <div className="wp-home-ticker__track">
            {[false, true].map((isDuplicate) => (
              <div className="wp-home-ticker__group" aria-hidden={isDuplicate || undefined} key={String(isDuplicate)}>
                {CATEGORIES.map((label) => <span key={label}>{label}</span>)}
              </div>
            ))}
          </div>
        </div>

        <FeaturedPlaces {...publicPlaces} />

        <Steps />

        <section className="wp-home-owner">
          <div className="wp-home-owner__shape" aria-hidden="true"><span>W</span><i /><i /></div>
          <div className="wp-home-owner__copy">
            <span className="wp-home-kicker">Para propietarios</span>
            <h2>Tu espacio también puede impulsar grandes ideas.</h2>
            <p>Comparte tu espacio con profesionales que buscan un lugar para trabajar en sus proyectos.</p>
            <Link to="/signup" className="wp-home-btn wp-home-btn--primary">Conoce WorkPalace <span aria-hidden="true">↗</span></Link>
          </div>
        </section>

        <Faq />

        <section className="wp-home-section wp-home-about" id="about">
          <div><span className="wp-home-kicker">Nuestra razón de ser</span><h2>Conectamos talento con espacios en Colombia.</h2></div>
          <div className="wp-home-about__copy">
            <p>WorkPalace acerca a quienes necesitan un espacio especializado y a quienes pueden compartirlo. Queremos hacer más accesibles los lugares y recursos que ayudan a convertir ideas en proyectos.</p>
            <p>Creemos en una forma flexible de trabajar: usar un espacio cuando se necesita, descubrir nuevas posibilidades y fortalecer la comunidad creativa y productiva.</p>
          </div>
        </section>

        <ContactDock />
      </main>
      <footer className="wp-home-footer">
        <Link to="/" className="wp-home-footer__logo">Work<span>Palace</span></Link>
        <p>Conectando talento con espacios en Colombia</p>
        <span>© {new Date().getFullYear()} WorkPalace</span>
      </footer>
    </div>
  )
}

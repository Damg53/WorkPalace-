import '../App.css'
import './Dashboard.css'
import PageHeader from './PageHeader'
import WorkPalaceSelect from './WorkPalaceSelect'
import { type CSSProperties, useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { API_BASE_URL, API_UNAVAILABLE_MESSAGE, cancelReservation } from '../services/api'
import { formatReadableTime } from '../utils/dateFormatting'

interface DashboardProps {
  user: { id?: number; username: string; role?: string; fullName?: string; email?: string }
  onLogout: () => void
  isDark: boolean
  setIsDark: (value: boolean) => void
}

type EstadoReserva = 'confirmada' | 'pendiente' | 'cancelada' | 'completada'

interface Reserva {
  id: number
  hotel: string
  tipo: string
  ubicacion: string
  checkIn: string
  checkOut: string
  checkInRaw: string
  checkOutRaw: string
  isHourly: boolean
  huespedes: number
  estado: EstadoReserva
  cancellationReason: string | null
  placeId: number | null
  reviewRating: number | null
  reviewComment: string | null
}

interface ReservaApiRecord {
  id: number
  hotel: string
  tipo_alojamiento: string
  ubicacion: string
  check_in: string
  check_out: string
  check_in_time?: string | null
  check_out_time?: string | null
  huespedes: number
  estado: string
  cancellation_reason?: string | null
  place_id?: number | null
  review_id?: number | null
  review_rating?: number | null
  review_comment?: string | null
}

interface NotificationItem {
  id: number
  reservation_id: number | null
  title: string
  detail: string
  tone: string
  is_read: boolean
  created_at: string
}

interface PlaceCardData {
  id: number
  name: string
  ciudad: string | null
  tipo: string | null
  precio_hora: number | string | null
  average_rating: number | string | null
  review_count: number
  image_url: string | null
  active?: boolean
}

interface FavoriteSpace {
  id: number
  place_id: number
  place_name: string
  place_city: string | null
  tipo?: string | null
  precio_hora?: number | string | null
  average_rating?: number | string | null
  review_count?: number
  image_url?: string | null
}

const API = API_BASE_URL
const PREFERENCES_KEY = 'workpalace-user-preferences'
const notificationTimeFormatter = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  hour: 'numeric',
  minute: '2-digit',
})
const notificationDateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const favoritePriceFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

function notificationGroup(createdAt: string) {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return 'Anteriores'
  const todayKey = notificationDateKeyFormatter.format(new Date())
  const notificationKey = notificationDateKeyFormatter.format(date)
  const daysAgo = (Date.parse(`${todayKey}T00:00:00Z`) - Date.parse(`${notificationKey}T00:00:00Z`)) / 86400000
  if (daysAgo <= 0) return 'Hoy'
  if (daysAgo === 1) return 'Ayer'
  if (daysAgo < 7) return 'Esta semana'
  return 'Anteriores'
}

function notificationAge(createdAt: string) {
  const timestamp = new Date(createdAt).getTime()
  if (Number.isNaN(timestamp)) return ''
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000))
  if (elapsedMinutes < 1) return 'Ahora'
  if (elapsedMinutes < 60) return `hace ${elapsedMinutes} min`
  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) return `hace ${elapsedHours} h`
  const elapsedDays = Math.floor(elapsedHours / 24)
  return elapsedDays === 1 ? 'Ayer' : `hace ${elapsedDays} días`
}

function placeAccent(tipo: string | null) {
  const normalized = (tipo || '').toLowerCase()
  if (normalized.includes('cocin')) return ['#f0803c', '#e0457b']
  if (normalized.includes('taller')) return ['#2fa37a', '#3b73ff']
  if (normalized.includes('foto')) return ['#7c6cff', '#e0457b']
  return ['#3b73ff', '#7c6cff']
}

function PlaceArtwork({ place }: { place: PlaceCardData }) {
  if (place.image_url) {
    return <img src={place.image_url} alt="" loading="lazy" />
  }
  const type = (place.tipo || '').toLowerCase()
  return (
    <svg viewBox="0 0 200 120" fill="#fff" aria-hidden="true">
      {type.includes('cocin') ? (
        <><rect x="55" y="62" width="90" height="38" rx="8" /><rect x="48" y="54" width="104" height="9" rx="4" /><rect x="92" y="46" width="16" height="8" rx="4" /></>
      ) : type.includes('grab') ? (
        [18, 34, 52, 28, 62, 40, 24].map((height, index) => (
          <rect key={index} x={40 + index * 17} y={60 - height / 2} width="9" height={height} rx="4.5" />
        ))
      ) : type.includes('taller') ? (
        <><rect x="40" y="82" width="120" height="14" rx="3" /><circle cx="100" cy="46" r="24" fill="none" stroke="#fff" strokeWidth="6" strokeDasharray="7 5" /></>
      ) : (
        <><rect x="45" y="36" width="110" height="64" rx="12" /><circle cx="100" cy="68" r="22" fill="none" stroke="#fff" strokeWidth="5" /><circle cx="148" cy="48" r="4" /></>
      )}
    </svg>
  )
}

function NotificationIcon({ tone }: { tone: string }) {
  if (tone === 'success') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
  }
  if (tone === 'warning') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 9h18" /></svg>
}

function loadUserPreferences() {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY)
    if (!raw) {
      return {
        phone: '',
        city: '',
        preferences: 'Trabajo remoto, reuniones y sesiones creativas',
        notificationsEnabled: true,
      }
    }
    const parsed = JSON.parse(raw)
    return {
      phone: typeof parsed.phone === 'string' ? parsed.phone : '',
      city: typeof parsed.city === 'string' ? parsed.city : '',
      preferences: typeof parsed.preferences === 'string' ? parsed.preferences : 'Trabajo remoto, reuniones y sesiones creativas',
      notificationsEnabled: typeof parsed.notificationsEnabled === 'boolean' ? parsed.notificationsEnabled : true,
    }
  } catch {
    return {
      phone: '',
      city: '',
      preferences: 'Trabajo remoto, reuniones y sesiones creativas',
      notificationsEnabled: true,
    }
  }
}

function saveUserPreferences(preferences: ReturnType<typeof loadUserPreferences>) {
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function mapReservation(reservation: ReservaApiRecord): Reserva {
  return {
    id: Number(reservation.id),
    hotel: reservation.hotel,
    tipo: reservation.tipo_alojamiento,
    ubicacion: reservation.ubicacion,
    checkIn: `${formatDate(reservation.check_in)}${reservation.check_in_time ? ` · ${formatReadableTime(reservation.check_in_time)}` : ''}`,
    checkOut: `${formatDate(reservation.check_out)}${reservation.check_out_time ? ` · ${formatReadableTime(reservation.check_out_time)}` : ''}`,
    checkInRaw: reservation.check_in,
    checkOutRaw: reservation.check_out,
    isHourly: Boolean(reservation.check_in_time),
    huespedes: reservation.huespedes,
    estado: reservation.estado as EstadoReserva,
    cancellationReason: reservation.cancellation_reason ?? null,
    placeId: reservation.place_id == null ? null : Number(reservation.place_id),
    reviewRating: reservation.review_rating == null ? null : Number(reservation.review_rating),
    reviewComment: reservation.review_comment ?? null,
  }
}

function isoDateOnly(date: Date): string {
  // YYYY-MM-DD in local time (avoids timezone shifting issues for comparisons)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getCancellationPolicy(r: Reserva) {
  if (!r.checkInRaw) {
    return { label: 'Política estándar', detail: 'Cancelación libre hasta 48 horas antes del inicio.', refund: 'reembolso total' }
  }

  const start = new Date(`${r.checkInRaw}T00:00:00`)
  const today = new Date()
  const diffMs = start.getTime() - today.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays >= 2) {
    return { label: 'Reembolso completo', detail: 'Puedes cancelar sin costo y te devolvemos el valor total.', refund: '100%' }
  }

  if (diffDays >= 1) {
    return { label: 'Reembolso parcial', detail: 'Se aplica una penalidad por cancelación cercana al inicio.', refund: '50%' }
  }

  return { label: 'Sin reembolso', detail: 'La cancelación está sujeta a condiciones del espacio y la fecha.', refund: '0%' }
}

export default function Dashboard({ user }: DashboardProps) {
  const location = useLocation()
  const dashboardView = location.hash === '#favorites-and-notifications' ? 'favorites' : 'reservations'
  useEffect(() => {
    const targetId = location.hash.slice(1)
    if (!targetId) return
    const frameId = window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ block: 'start' })
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [location.hash])

  const todayIso = isoDateOnly(new Date())
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [availableFilter, setAvailableFilter] = useState<'todas' | EstadoReserva>('todas')
  const [reservationView, setReservationView] = useState<'todas' | 'activas' | 'pendientes' | 'historial'>('todas')
  const [cancelling, setCancelling] = useState<number | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [selectedReservation, setSelectedReservation] = useState<Reserva | null>(null)
  const [reservationToCancel, setReservationToCancel] = useState<Reserva | null>(null)
  const [preferences] = useState(loadUserPreferences)
  const [favoriteSpaces, setFavoriteSpaces] = useState<FavoriteSpace[]>([])
  const [notificationItems, setNotificationItems] = useState<NotificationItem[]>([])
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread'>('all')
  const [notificationError, setNotificationError] = useState<string | null>(null)
  const [clearingNotifications, setClearingNotifications] = useState(false)
  const [restoringNotifications, setRestoringNotifications] = useState(false)
  const [notificationToast, setNotificationToast] = useState<{ message: string; restoreItems: NotificationItem[] } | null>(null)
  const [showClearNotificationsDialog, setShowClearNotificationsDialog] = useState(false)
  const [suggestedPlaces, setSuggestedPlaces] = useState<PlaceCardData[]>([])
  const [reviewingReservation, setReviewingReservation] = useState<number | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [submittingReview, setSubmittingReview] = useState(false)

  const prioritizeSuggestedPlaces = (places: PlaceCardData[], userCity: string) => {
    const normalizedCity = userCity.trim().toLowerCase()

    return [...places]
      .filter((place) => place.name && place.active !== false)
      .sort((a, b) => {
        const cityA = (a.ciudad || '').trim().toLowerCase()
        const cityB = (b.ciudad || '').trim().toLowerCase()

        const cityScoreA = cityA && normalizedCity && (cityA.includes(normalizedCity) || normalizedCity.includes(cityA)) ? 100 : 0
        const cityScoreB = cityB && normalizedCity && (cityB.includes(normalizedCity) || normalizedCity.includes(cityB)) ? 100 : 0

        const aPrice = Number(a.precio_hora || 0)
        const bPrice = Number(b.precio_hora || 0)

        if (cityScoreA !== cityScoreB) return cityScoreB - cityScoreA
        if (aPrice !== bPrice) return aPrice - bPrice
        return (a.name || '').localeCompare(b.name || '')
      })
      .slice(0, 4)
  }

  useEffect(() => {
    saveUserPreferences(preferences)
  }, [preferences])

  useEffect(() => {
    if (!user.id) return

    async function fetchUserExtras() {
      try {
        const [favoritesRes, placesRes] = await Promise.all([
          fetch(`${API}/api/users/${user.id}/favorites`, {
            headers: { 'x-user-id': String(user.id) },
          }),
          fetch(`${API}/api/places?date=${encodeURIComponent(todayIso)}`, {
            headers: { 'x-user-id': String(user.id) },
          }),
        ])

        if (favoritesRes.ok) {
          const favoritesData = await favoritesRes.json() as { favorites?: FavoriteSpace[] }
          setFavoriteSpaces(favoritesData.favorites || [])
        }

        if (placesRes.ok) {
          const placesData = await placesRes.json() as { places?: PlaceCardData[] }
          const places = Array.isArray(placesData.places) ? placesData.places : []
          const ranked = prioritizeSuggestedPlaces(places, preferences.city || '')
          setSuggestedPlaces(ranked)
        }
      } catch (error) {
        console.error('Error cargando datos complementarios del panel:', error)
      }
    }

    fetchUserExtras()
  }, [user.id, todayIso, preferences.city])

  useEffect(() => {
    if (!user.id) return

    let active = true
    let requestInProgress = false

    const fetchNotifications = async () => {
      if (requestInProgress) return
      requestInProgress = true
      try {
        const response = await fetch(`${API}/api/users/${user.id}/notifications`, {
          headers: { 'x-user-id': String(user.id) },
        })
        if (!response.ok) {
          throw new Error('No se pudieron cargar las notificaciones.')
        }

        const data = await response.json()
        if (active) {
          setNotificationItems(Array.isArray(data.notifications) ? data.notifications : [])
          setNotificationError(null)
        }
      } catch (error) {
        if (active) {
          setNotificationError(error instanceof Error ? error.message : 'No se pudieron cargar las notificaciones.')
        }
      } finally {
        requestInProgress = false
      }
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void fetchNotifications()
    }

    void fetchNotifications()
    const intervalId = window.setInterval(fetchNotifications, 60000)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      active = false
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [user.id])

  useEffect(() => {
    if (!notificationToast) return
    const timeoutId = window.setTimeout(() => setNotificationToast(null), 5500)
    return () => window.clearTimeout(timeoutId)
  }, [notificationToast])

  const toggleFavorite = async (place: PlaceCardData) => {
    if (!user.id) return

    const exists = favoriteSpaces.some((item) => item.place_id === place.id)

    try {
      if (exists) {
        const res = await fetch(`${API}/api/users/${user.id}/favorites/${place.id}`, {
          method: 'DELETE',
          headers: { 'x-user-id': String(user.id) },
        })
        if (res.ok) {
          setFavoriteSpaces((prev) => prev.filter((item) => item.place_id !== place.id))
        }
        return
      }

      const res = await fetch(`${API}/api/users/${user.id}/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user.id),
        },
        body: JSON.stringify({
          placeId: place.id,
          placeName: place.name,
          placeCity: place.ciudad || '',
        }),
      })

      if (!res.ok) return
      const data = await res.json()
      setFavoriteSpaces((prev) => [
        {
          id: data.favorite.id,
          place_id: data.favorite.place_id,
          place_name: data.favorite.place_name,
          place_city: data.favorite.place_city,
          tipo: place.tipo,
          precio_hora: place.precio_hora,
          average_rating: place.average_rating,
          review_count: place.review_count,
          image_url: place.image_url,
        },
        ...prev,
      ])
    } catch (error) {
      console.error('Error actualizando favorito:', error)
    }
  }

  const markNotificationRead = async (notificationId: number) => {
    if (!user.id) return

    try {
      const res = await fetch(`${API}/api/users/${user.id}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'x-user-id': String(user.id) },
      })

      if (!res.ok) {
        setNotificationError('No se pudo marcar la notificación como leída.')
        return
      }

      setNotificationItems((prev) => prev.map((item) =>
        item.id === notificationId ? { ...item, is_read: true } : item
      ))
      setNotificationError(null)
      window.dispatchEvent(new Event('workpalace-notifications-updated'))
    } catch {
      setNotificationError('No se pudo marcar la notificación como leída.')
    }
  }

  const markAllNotificationsRead = async () => {
    if (!user.id || !notificationItems.some((item) => !item.is_read)) return

    try {
      const response = await fetch(`${API}/api/users/${user.id}/notifications/read`, {
        method: 'PUT',
        headers: { 'x-user-id': String(user.id) },
      })
      const data = await response.json() as { error?: string }
      if (!response.ok) throw new Error(data.error || 'No se pudieron marcar las notificaciones como leídas.')

      setNotificationItems((current) => current.map((item) => ({ ...item, is_read: true })))
      setNotificationError(null)
      window.dispatchEvent(new Event('workpalace-notifications-updated'))
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'No se pudieron marcar las notificaciones como leídas.')
    }
  }

  const clearNotifications = async () => {
    if (!user.id || clearingNotifications || notificationItems.length === 0) return

    setClearingNotifications(true)
    try {
      const response = await fetch(`${API}/api/users/${user.id}/notifications`, {
        method: 'DELETE',
        headers: { 'x-user-id': String(user.id) },
      })
      const data: { error?: string; notifications?: NotificationItem[] } = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(
          response.status === 503
            ? 'La base de datos no está disponible. Revisa que el servidor de base de datos esté iniciado y vuelve a intentar.'
            : data.error || `No se pudieron limpiar las notificaciones (error ${response.status}).`
        )
      }

      setNotificationItems([])
      setNotificationError(null)
      setShowClearNotificationsDialog(false)
      const removedItems = data.notifications || []
      if (removedItems.length > 0) {
        setNotificationToast({ message: `${removedItems.length} notificaciones eliminadas`, restoreItems: removedItems })
      }
      window.dispatchEvent(new Event('workpalace-notifications-updated'))
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'No se pudieron limpiar las notificaciones.')
    } finally {
      setClearingNotifications(false)
    }
  }

  const deleteNotification = async (notificationId: number) => {
    if (!user.id) return

    try {
      const response = await fetch(`${API}/api/users/${user.id}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': String(user.id) },
      })
      const data = await response.json() as { notification?: NotificationItem; error?: string }
      if (!response.ok || !data.notification) {
        throw new Error(data.error || 'No se pudo eliminar la notificación.')
      }

      setNotificationItems((current) => current.filter((item) => item.id !== notificationId))
      setNotificationError(null)
      setNotificationToast({ message: 'Notificación eliminada', restoreItems: [data.notification] })
      window.dispatchEvent(new Event('workpalace-notifications-updated'))
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'No se pudo eliminar la notificación.')
    }
  }

  const restoreNotifications = async () => {
    if (!user.id || !notificationToast || restoringNotifications) return

    setRestoringNotifications(true)
    try {
      const response = await fetch(`${API}/api/users/${user.id}/notifications/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user.id),
        },
        body: JSON.stringify({ notifications: notificationToast.restoreItems }),
      })
      const data = await response.json() as { notifications?: NotificationItem[]; error?: string }
      if (!response.ok) throw new Error(data.error || 'No se pudieron restaurar las notificaciones.')

      setNotificationItems((current) => [...current, ...(data.notifications || [])]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      setNotificationError(null)
      setNotificationToast(null)
      window.dispatchEvent(new Event('workpalace-notifications-updated'))
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'No se pudieron restaurar las notificaciones.')
    } finally {
      setRestoringNotifications(false)
    }
  }

  const openNotificationReservation = async (item: NotificationItem) => {
    if (!user.id || item.reservation_id == null) return

    try {
      const response = await fetch(`${API}/api/reservations`, {
        headers: { 'x-user-id': String(user.id) },
      })
      const data: { reservations?: ReservaApiRecord[]; error?: string } = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo cargar la reserva.')
      }

      const rows = Array.isArray(data.reservations) ? data.reservations : []
      const matchingReservation = rows.find((reservation) => Number(reservation.id) === item.reservation_id)
      if (!matchingReservation) {
        setNotificationError('La reserva asociada ya no está disponible.')
        return
      }

      const updatedReservations = rows.map(mapReservation)
      setReservas(updatedReservations)
      setSelectedReservation(updatedReservations.find((reservation) => reservation.id === item.reservation_id) ?? null)
      await markNotificationRead(item.id)
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'No se pudo abrir la reserva.')
    }
  }

  useEffect(() => {
    if (user.id == null) {
      setLoading(false)
      return
    }
    let cancelled = false
    async function fetchReservations() {
      try {
        const res = await fetch(`${API}/api/reservations`, {
          headers: { 'x-user-id': String(user.id) },
        })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setError(data.error || 'Error al cargar reservas')
          return
        }
        const rows = (data.reservations || []).map(mapReservation)
        setReservas(rows)
      } catch {
        if (!cancelled) setError(API_UNAVAILABLE_MESSAGE)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void fetchReservations()
    const intervalId = window.setInterval(() => void fetchReservations(), 30000)
    window.addEventListener('focus', fetchReservations)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener('focus', fetchReservations)
    }
  }, [user.id])

  useEffect(() => {
    if (!selectedReservation) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedReservation(null)
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [selectedReservation])

  useEffect(() => {
    if (!showClearNotificationsDialog || clearingNotifications) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowClearNotificationsDialog(false)
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showClearNotificationsDialog, clearingNotifications])

  useEffect(() => {
    if (!reservationToCancel || cancelling != null) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setReservationToCancel(null)
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [reservationToCancel, cancelling])

  const reservasDisponiblesBase = reservas.filter((r) => {
    // "Disponibles" = próximas (desde hoy) y activas (pendiente/confirmada)
    if (r.checkInRaw && r.checkInRaw < todayIso) return false
    return r.estado === 'pendiente' || r.estado === 'confirmada'
  })
  const reservasDisponibles = reservasDisponiblesBase.filter((r) => {
    if (availableFilter === 'todas') return true
    return r.estado === availableFilter
  })

  const activeReservations = reservas.filter((r) => r.estado === 'pendiente' || r.estado === 'confirmada')
  const pendingReservations = reservas.filter((r) => r.estado === 'pendiente')
  const historialReservations = reservas.filter((r) => r.estado === 'cancelada' || r.estado === 'completada')

  const visibleReservations = (() => {
    switch (reservationView) {
      case 'activas':
        return activeReservations
      case 'pendientes':
        return pendingReservations
      case 'historial':
        return historialReservations
      default:
        return reservas
    }
  })()

  const nextReservation = [...reservas]
    .filter((r) => r.estado === 'pendiente' || r.estado === 'confirmada')
    .sort((a, b) => new Date(a.checkInRaw).getTime() - new Date(b.checkInRaw).getTime())[0]
  const pageHeader = dashboardView === 'favorites'
    ? {
        eyebrow: 'Tu cuenta',
        title: 'Favoritos y notificaciones',
        description: 'Consulta tus espacios guardados y mantente al tanto de la actividad de tus reservas.',
        badge: 'Actividad personal',
      }
    : {
        eyebrow: 'Área personal',
        title: `Hola, ${user.fullName || user.username}`,
        description: 'Consulta tus reservas, revisa su estado y organiza tu próxima visita.',
        badge: 'Mis reservas',
      }
  const favoriteListings = favoriteSpaces.map((favorite): PlaceCardData => {
    return {
      id: favorite.place_id,
      name: favorite.place_name,
      ciudad: favorite.place_city,
      tipo: favorite.tipo ?? null,
      precio_hora: favorite.precio_hora ?? null,
      average_rating: favorite.average_rating ?? null,
      review_count: favorite.review_count ?? 0,
      image_url: favorite.image_url ?? null,
    }
  })
  const unsavedSuggestions = suggestedPlaces.filter((place) => (
    !favoriteSpaces.some((favorite) => favorite.place_id === place.id)
  ))
  const unreadNotificationCount = notificationItems.filter((item) => !item.is_read).length
  const visibleNotificationItems = notificationItems
    .filter((item) => notificationFilter === 'all' || !item.is_read)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const notificationGroups = ['Hoy', 'Ayer', 'Esta semana', 'Anteriores']
    .map((label) => ({
      label,
      items: visibleNotificationItems.filter((item) => notificationGroup(item.created_at) === label),
    }))
    .filter((group) => group.items.length > 0)

  const handleCancelReservation = async (reservaId: number) => {
    setCancelling(reservaId)
    setCancelError(null)

    try {
      if (!user.id) {
        throw new Error('Usuario no identificado')
      }
      await cancelReservation(reservaId, user.id)
      // Actualizar la lista de reservaciones
      setReservas((prev) => 
        prev.map((r) => 
          r.id === reservaId
            ? { ...r, estado: 'cancelada' as EstadoReserva, cancellationReason: 'Cancelada por el usuario.' }
            : r
        )
      )
      setSelectedReservation(null)
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Error al cancelar la reservación'
      setCancelError(errorMsg)
      console.error('Error cancelando reservación:', e)
    } finally {
      setCancelling(null)
    }
  }

  const requestCancelReservation = (reservaId: number) => {
    const reservation = reservas.find((item) => item.id === reservaId)
    if (reservation) setReservationToCancel(reservation)
  }

  const confirmCancelReservation = async () => {
    if (!reservationToCancel) return
    const reservationId = reservationToCancel.id
    setReservationToCancel(null)
    await handleCancelReservation(reservationId)
  }

  const submitReview = async (reservation: Reserva) => {
    if (!user.id || reservation.placeId == null) return
    setSubmittingReview(true)
    setReviewError(null)
    try {
      const response = await fetch(`${API}/api/places/${reservation.placeId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user.id),
        },
        body: JSON.stringify({
          reservationId: reservation.id,
          rating: reviewRating,
          comment: reviewComment,
        }),
      })
      const data = await response.json() as { error?: string; review?: { rating: number; comment: string | null } }
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la reseña.')
      setReservas((current) => current.map((item) => item.id === reservation.id
        ? { ...item, reviewRating: data.review?.rating ?? reviewRating, reviewComment: data.review?.comment ?? reviewComment }
        : item))
      setReviewingReservation(null)
      setReviewComment('')
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'No se pudo guardar la reseña.')
    } finally {
      setSubmittingReview(false)
    }
  }

  function renderReservationsTable(rows: Reserva[], emptyText: string, showActions: boolean = false) {
    return (
      <div className="dashboard-reservations">
        <div className="reservations-table-wrap">
          <table className="reservations-table">
            <thead>
              <tr>
                <th>Alojamiento</th>
                <th>Ubicación</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Huéspedes / horas</th>
                <th>Estado</th>
                {showActions && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={showActions ? 7 : 6} style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                    {emptyText}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Espacio">
                      <span className="reservation-hotel">{r.hotel}</span>
                      <div className="reservation-type">{r.tipo}</div>
                    </td>
                    <td data-label="Ubicación">{r.ubicacion}</td>
                    <td data-label="Check-in">{r.checkIn}</td>
                    <td data-label="Check-out">{r.checkOut}</td>
                    <td data-label={r.isHourly ? 'Duración' : 'Huéspedes'}>
                      {r.huespedes}{r.isHourly ? ' horas' : ''}
                    </td>
                    <td data-label="Estado">
                      <span className={`reservation-badge ${r.estado}`}>
                        {r.estado.charAt(0).toUpperCase() + r.estado.slice(1)}
                      </span>
                    </td>
                    {showActions && (
                      <td data-label="Acciones">
                        {(r.estado === 'pendiente' || r.estado === 'confirmada') ? (
                          <button
                            className="cancel-btn"
                            onClick={() => requestCancelReservation(r.id)}
                            disabled={cancelling === r.id}
                            title="Cancelar esta reservación"
                          >
                            {cancelling === r.id ? 'Cancelando...' : 'Cancelar'}
                          </button>
                        ) : (
                          <span style={{ color: '#999', fontSize: '0.9rem' }}>-</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  function renderReservationCards(rows: Reserva[], emptyText: string) {
    return (
      <div className="reservation-card-list">
        {rows.length === 0 ? (
          <div className="reservation-empty-state">{emptyText}</div>
        ) : (
          rows.map((r) => (
            <article key={r.id} className={`reservation-card reservation-card--${r.estado}`}>
              <div className="reservation-card__top">
                <div>
                  <p className="reservation-card__eyebrow">Espacio</p>
                  <h3>{r.hotel}</h3>
                  <span className="reservation-card__type">{r.tipo}</span>
                </div>
                <span className={`reservation-badge ${r.estado}`}>
                  {r.estado.charAt(0).toUpperCase() + r.estado.slice(1)}
                </span>
              </div>

              <div className="reservation-card__meta">
                <div>
                  <span className="reservation-card__label">Ubicación</span>
                  <strong>{r.ubicacion}</strong>
                </div>
                <div>
                  <span className="reservation-card__label">{r.isHourly ? 'Duración' : 'Huéspedes'}</span>
                  <strong>{r.huespedes}{r.isHourly ? ' horas' : ''}</strong>
                </div>
              </div>

              <div className="reservation-card__dates">
                <div>
                  <span className="reservation-card__label">Check-in</span>
                  <strong>{r.checkIn}</strong>
                </div>
                <div>
                  <span className="reservation-card__label">Check-out</span>
                  <strong>{r.checkOut}</strong>
                </div>
              </div>

              <div className="reservation-card__footer">
                <button
                  type="button"
                  className="reservation-card__ghost"
                  onClick={() => setSelectedReservation(r)}
                  aria-label={`Ver detalles de la reserva de ${r.hotel}`}
                >
                  Ver detalle
                </button>
                {(r.estado === 'pendiente' || r.estado === 'confirmada') && (
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => requestCancelReservation(r.id)}
                    disabled={cancelling === r.id}
                  >
                    {cancelling === r.id ? 'Cancelando...' : 'Cancelar'}
                  </button>
                )}
              </div>
              {r.estado === 'completada' && r.placeId != null && (
                <div className="reservation-review">
                  {r.reviewRating != null ? (
                    <p className="reservation-review__submitted">
                      Reseña verificada · {'★'.repeat(r.reviewRating)}
                      {r.reviewComment && <span>{r.reviewComment}</span>}
                    </p>
                  ) : reviewingReservation === r.id ? (
                    <form
                      className="reservation-review__form"
                      onSubmit={(event) => {
                        event.preventDefault()
                        void submitReview(r)
                      }}
                    >
                      <label>
                        Tu calificación
                        <WorkPalaceSelect value={String(reviewRating)} onChange={(value) => setReviewRating(Number(value))} ariaLabel="Tu calificación" options={[
                          { value: '5', label: '★★★★★ · Excelente' },
                          { value: '4', label: '★★★★ · Muy bueno' },
                          { value: '3', label: '★★★ · Bueno' },
                          { value: '2', label: '★★ · Regular' },
                          { value: '1', label: '★ · Malo' },
                        ]} />
                      </label>
                      <label>
                        Cuéntale a otras personas (opcional)
                        <textarea maxLength={1000} value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} />
                      </label>
                      {reviewError && <p role="alert">{reviewError}</p>}
                      <button type="submit" className="btn btn-primary" disabled={submittingReview}>
                        {submittingReview ? 'Enviando...' : 'Publicar reseña verificada'}
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="reservation-card__ghost"
                      onClick={() => {
                        setReviewingReservation(r.id)
                        setReviewRating(5)
                        setReviewComment('')
                        setReviewError(null)
                      }}
                    >
                      Calificar espacio
                    </button>
                  )}
                </div>
              )}
            </article>
          ))
        )}
      </div>
    )
  }

  return (
    <div className="with-sidebar" data-dashboard-view={dashboardView}>
      <PageHeader
        eyebrow={pageHeader.eyebrow}
        title={pageHeader.title}
        description={pageHeader.description}
        badge={pageHeader.badge}
      />

      <section className="features" id="user-overview">
        <div className="features-container">
          <div className="section-title-row">
            <h2 className="section-title">Mi cuenta</h2>
          </div>

          <div className="user-overview-grid">
            <div className="user-panel-card user-panel-card--primary">
              <span className="user-panel-label">Perfil</span>
              <strong>{user.fullName || user.username}</strong>
              <p>{preferences.city} · {preferences.phone || 'Sin teléfono registrado'}</p>
            </div>
            <div className="user-panel-card">
              <span className="user-panel-label">Preferencias</span>
              <strong>{preferences.notificationsEnabled ? 'Notificaciones activas' : 'Notificaciones pausadas'}</strong>
              <p>{preferences.preferences}</p>
            </div>
            <div className="user-panel-card">
              <span className="user-panel-label">Reservas</span>
              <strong>{activeReservations.length} activas</strong>
              <p>{pendingReservations.length} pendientes y {historialReservations.length} en historial</p>
            </div>
            <div className="user-panel-card">
              <span className="user-panel-label">Próxima reserva</span>
              <strong>{nextReservation ? nextReservation.hotel : 'Sin reservas'}</strong>
              <p>{nextReservation ? `${nextReservation.checkIn} · ${nextReservation.estado}` : 'Explora espacios y crea tu siguiente agenda'}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="ac" id="favorites-and-notifications">
        <section className="ac-col" aria-labelledby="favorites-title">
          <header className="ac-head">
            <h2 id="favorites-title">Favoritos</h2>
            <div className="ac-head__acc">
              <span className="ac-count">{favoriteListings.length}</span>
            </div>
          </header>

          {favoriteListings.length > 0 ? (
            <ul className="ac-lista">
              {favoriteListings.map((place) => {
                const [accent, accentAlt] = placeAccent(place.tipo)
                const price = Number(place.precio_hora)
                const rating = Number(place.average_rating)
                return (
                  <li
                    className="ac-fav"
                    key={place.id}
                    style={{ '--a': accent, '--b': accentAlt } as CSSProperties}
                  >
                    <span className="ac-fav__art"><PlaceArtwork place={place} /></span>
                    <div className="ac-fav__info">
                      <b>{place.name}</b>
                      <small>
                        {place.ciudad || 'Ciudad no indicada'} ·{' '}
                        {rating > 0 ? (
                          <span className="ac-star">
                            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L2.9 9.4l6.3-.9L12 2.8Z" /></svg>
                            {rating.toFixed(1)}
                          </span>
                        ) : 'Aún sin reseñas'}
                      </small>
                      <small className="ac-fav__precio">
                        {Number.isFinite(price) && price > 0 ? `${favoritePriceFormatter.format(price)} por hora` : 'Precio por consultar'}
                      </small>
                    </div>
                    <div className="ac-fav__acc">
                      <Link className="ac-btn ac-btn--solid" to={`/checkout/${place.id}`}>Reservar</Link>
                      <button
                        type="button"
                        className="ac-heart is-on"
                        aria-label={`Quitar ${place.name} de favoritos`}
                        aria-pressed="true"
                        onClick={() => void toggleFavorite(place)}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z" /></svg>
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="ac-vacio ac-vacio--fav">
              <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z" /></svg></span>
              <b>Aún no tienes favoritos</b>
              <p>Guarda los espacios que te gustan para reservarlos más rápido.</p>
            </div>
          )}

          {unsavedSuggestions.length > 0 && (
            <>
              <h3 className="ac-sub">Sugeridos para ti</h3>
              <ul className="ac-lista">
                {unsavedSuggestions.map((place) => {
                  const [accent, accentAlt] = placeAccent(place.tipo)
                  const price = Number(place.precio_hora)
                  const rating = Number(place.average_rating)
                  return (
                    <li
                      className="ac-fav"
                      key={place.id}
                      style={{ '--a': accent, '--b': accentAlt } as CSSProperties}
                    >
                      <span className="ac-fav__art"><PlaceArtwork place={place} /></span>
                      <div className="ac-fav__info">
                        <b>{place.name}</b>
                        <small>
                          {place.ciudad || 'Ciudad no indicada'} ·{' '}
                          {rating > 0 ? `${rating.toFixed(1)} ★` : 'Aún sin reseñas'}
                        </small>
                        <small className="ac-fav__precio">
                          {Number.isFinite(price) && price > 0 ? `${favoritePriceFormatter.format(price)} por hora` : 'Precio por consultar'}
                        </small>
                      </div>
                      <button
                        type="button"
                        className="ac-save"
                        aria-label={`Guardar ${place.name} en favoritos`}
                        onClick={() => void toggleFavorite(place)}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z" /></svg>
                        Guardar
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </section>

        <section className="ac-col ac-col--not" aria-labelledby="notifications-title">
          <header className="ac-head">
            <h2 id="notifications-title">Notificaciones</h2>
            <div className="ac-head__acc">
              {unreadNotificationCount > 0 && (
                <span className="ac-count ac-count--new">
                  {unreadNotificationCount} {unreadNotificationCount === 1 ? 'nueva' : 'nuevas'}
                </span>
              )}
              <button
                type="button"
                className="ac-text"
                disabled={unreadNotificationCount === 0}
                onClick={() => void markAllNotificationsRead()}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2 12 5 5L18 6M13 17l1 1 8-9" /></svg>
                Marcar todo como leído
              </button>
              <button
                type="button"
                className="ac-text ac-text--bad"
                disabled={notificationItems.length === 0 || clearingNotifications}
                onClick={() => setShowClearNotificationsDialog(true)}
              >
                Limpiar
              </button>
            </div>
          </header>

          {notificationError && <p className="ac-error" role="alert">{notificationError}</p>}

          <div className="ac-tabs" role="tablist" aria-label="Filtrar notificaciones">
            <span aria-hidden="true" className={notificationFilter === 'unread' ? 'is-unread' : ''} />
            <button
              type="button"
              role="tab"
              aria-selected={notificationFilter === 'all'}
              onClick={() => setNotificationFilter('all')}
            >
              Todas
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={notificationFilter === 'unread'}
              onClick={() => setNotificationFilter('unread')}
            >
              Sin leer{unreadNotificationCount > 0 && <em>{unreadNotificationCount}</em>}
            </button>
          </div>

          {notificationGroups.length > 0 ? (
            <div className="ac-grupos" key={notificationFilter}>
              {notificationGroups.map((group) => (
                <div key={group.label}>
                  <h3 className="ac-sub">{group.label}</h3>
                  <ul className="ac-lista">
                    {group.items.map((item, index) => {
                      const tone = ['success', 'warning', 'info'].includes(item.tone) ? item.tone : 'info'
                      return (
                        <li
                          key={item.id}
                          className={`ac-n${item.is_read ? '' : ' is-new'}`}
                          data-tone={tone}
                          style={{ '--n': index } as CSSProperties}
                        >
                          <span className="ac-n__ico"><NotificationIcon tone={tone} /></span>
                          <div className="ac-n__body">
                            <div className="ac-n__top">
                              <b>{item.title}</b>
                              <time dateTime={item.created_at}>{notificationAge(item.created_at) || notificationTimeFormatter.format(new Date(item.created_at))}</time>
                            </div>
                            <p>{item.detail}</p>
                            {item.reservation_id != null ? (
                              <button type="button" className="ac-link" onClick={() => void openNotificationReservation(item)}>
                                Ver reserva
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                              </button>
                            ) : !item.is_read && (
                              <button type="button" className="ac-link" onClick={() => void markNotificationRead(item.id)}>
                                Marcar como leída
                              </button>
                            )}
                          </div>
                          {!item.is_read && (
                            <button
                              type="button"
                              className="ac-n__dot"
                              aria-label={`Marcar como leída: ${item.title}`}
                              onClick={() => void markNotificationRead(item.id)}
                            />
                          )}
                          <button
                            type="button"
                            className="ac-n__x"
                            aria-label={`Eliminar notificación: ${item.title}`}
                            onClick={() => void deleteNotification(item.id)}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12" /></svg>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="ac-vacio">
              <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg></span>
              <b>{notificationFilter === 'unread' ? 'No tienes nada sin leer' : 'Estás al día'}</b>
              <p>{notificationFilter === 'unread' ? 'Cuando llegue algo nuevo, lo verás aquí.' : 'Te avisaremos cuando haya novedades de tus reservas.'}</p>
            </div>
          )}
        </section>
        <div className={`ac-toast${notificationToast ? ' is-on' : ''}`} role="status" aria-live="polite">
          <span>{notificationToast?.message}</span>
          {notificationToast && (
            <button type="button" onClick={() => void restoreNotifications()} disabled={restoringNotifications}>
              {restoringNotifications ? 'Restaurando...' : 'Deshacer'}
            </button>
          )}
        </div>
      </section>

      {/* Reservas disponibles - próximas y activas */}
      <section className="features" id="available-reservations">
        <div className="features-container">
          <div className="section-title-row">
            <h2 className="section-title">Reservas disponibles</h2>
            <div className="reservations-actions">
              <label className="reservations-filter">
                <span>Estado</span>
                <WorkPalaceSelect
                  className="wp-select--reservation"
                  value={availableFilter}
                  onChange={(value) => setAvailableFilter(value as ('todas' | EstadoReserva))}
                  options={[
                    { value: 'todas', label: 'Todas' },
                    { value: 'pendiente', label: 'Pendiente', color: '#f0a951' },
                    { value: 'confirmada', label: 'Confirmada', color: '#3b73ff' },
                  ]}
                />
              </label>
            </div>
          </div>

          <div className="reservation-summary reservation-summary--compact">
            <div className="reservation-summary__item">
              <span>Próximas</span>
              <strong>{reservasDisponibles.length}</strong>
            </div>
            <div className="reservation-summary__item">
              <span>Activas</span>
              <strong>{activeReservations.length}</strong>
            </div>
          </div>

          {error && <p className="reservations-error">{error}</p>}
          {loading ? (
            <p className="settings-loading">Cargando reservas...</p>
          ) : reservasDisponibles.length === 0 ? (
            <div className="reservation-empty-state reservation-empty-state--featured">
              <div>
                <p className="reservation-empty-state__eyebrow">Sin reservas próximas</p>
                <h3>No tienes reservas disponibles por el momento.</h3>
                <p>Explora otros espacios y encuentra el ideal para tu siguiente reserva.</p>
              </div>
              <Link to="/places" className="btn btn-primary reservation-empty-state__button">
                Buscar espacio
              </Link>
            </div>
          ) : (
            renderReservationsTable(
              reservasDisponibles,
              'No hay reservas disponibles (próximas) por el momento.',
              false
            )
          )}
        </div>
      </section>

      {/* Reservas - experiencia tipo dashboard */}
      <section className="features" id="stats">
        <div className="features-container">
          <div className="section-title-row">
            <h2 className="section-title">Mis reservas</h2>
            <div className="reservations-tabs" aria-label="Filtros de reservas">
              {[
                { key: 'todas', label: 'Todas' },
                { key: 'activas', label: 'Activas' },
                { key: 'pendientes', label: 'Pendientes' },
                { key: 'historial', label: 'Historial' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`reservation-tab ${reservationView === tab.key ? 'active' : ''}`}
                  onClick={() => setReservationView(tab.key as 'todas' | 'activas' | 'pendientes' | 'historial')}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="reservation-summary">
            <div className="reservation-summary__item">
              <span>Activas</span>
              <strong>{activeReservations.length}</strong>
            </div>
            <div className="reservation-summary__item">
              <span>Pendientes</span>
              <strong>{pendingReservations.length}</strong>
            </div>
            <div className="reservation-summary__item">
              <span>Historial</span>
              <strong>{historialReservations.length}</strong>
            </div>
          </div>

          {cancelError && <p className="reservations-error">{cancelError}</p>}
          {error && <p className="reservations-error">{error}</p>}
          {loading ? (
            <p className="settings-loading">Cargando reservas...</p>
          ) : (
            renderReservationCards(
              visibleReservations,
              reservationView === 'historial'
                ? 'Todavía no tienes reservas finalizadas o canceladas.'
                : reservationView === 'pendientes'
                  ? 'No tienes reservas pendientes.'
                  : reservationView === 'activas'
                    ? 'No tienes reservas activas en este momento.'
                    : 'No tienes reservas aún.'
            )
          )}
        </div>
      </section>

      {selectedReservation && (
        <div
          className="reservation-detail-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedReservation(null)
          }}
        >
          <section
            className="reservation-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reservation-detail-title"
          >
            <div className="reservation-detail-modal__header">
              <div>
                <p className="reservation-card__eyebrow">Detalle de reserva</p>
                <h2 id="reservation-detail-title">{selectedReservation.hotel}</h2>
              </div>
              <button
                type="button"
                className="reservation-detail-modal__close"
                onClick={() => setSelectedReservation(null)}
                aria-label="Cerrar detalles"
              >
                ×
              </button>
            </div>

            <span className={`reservation-badge ${selectedReservation.estado}`}>
              {selectedReservation.estado.charAt(0).toUpperCase() + selectedReservation.estado.slice(1)}
            </span>

            <dl className="reservation-detail-list">
              <div>
                <dt>Número de reserva</dt>
                <dd>#{selectedReservation.id}</dd>
              </div>
              <div>
                <dt>Tipo de espacio</dt>
                <dd>{selectedReservation.tipo}</dd>
              </div>
              <div>
                <dt>Ubicación</dt>
                <dd>{selectedReservation.ubicacion || 'No especificada'}</dd>
              </div>
              <div>
                <dt>Check-in</dt>
                <dd>{selectedReservation.checkIn}</dd>
              </div>
              <div>
                <dt>Check-out</dt>
                <dd>{selectedReservation.checkOut}</dd>
              </div>
              <div>
                <dt>{selectedReservation.isHourly ? 'Duración' : 'Huéspedes'}</dt>
                <dd>{selectedReservation.huespedes}{selectedReservation.isHourly ? ' horas' : ''}</dd>
              </div>
            </dl>

            <div className="reservation-policy-box">
              <strong>{getCancellationPolicy(selectedReservation).label}</strong>
              <span>{getCancellationPolicy(selectedReservation).detail}</span>
            </div>

            {selectedReservation.estado === 'cancelada' && selectedReservation.cancellationReason && (
              <div className="reservation-cancellation-reason">
                <strong>Motivo de cancelación</strong>
                <span>{selectedReservation.cancellationReason}</span>
              </div>
            )}

            <div className="reservation-detail-modal__footer">
              {(selectedReservation.estado === 'pendiente' || selectedReservation.estado === 'confirmada') && (
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => requestCancelReservation(selectedReservation.id)}
                  disabled={cancelling === selectedReservation.id}
                >
                  {cancelling === selectedReservation.id ? 'Cancelando...' : 'Cancelar reserva'}
                </button>
              )}
              <button type="button" className="reservation-detail-modal__done" onClick={() => setSelectedReservation(null)}>
                Cerrar
              </button>
            </div>
          </section>
        </div>
      )}

      {showClearNotificationsDialog && (
        <div
          className="notification-confirm-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !clearingNotifications) {
              setShowClearNotificationsDialog(false)
            }
          }}
        >
          <section
            className="notification-confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="notification-confirm-title"
            aria-describedby="notification-confirm-description"
          >
            <div className="notification-confirm-dialog__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                <path d="M12 9v4M12 17h.01" />
              </svg>
            </div>
            <h2 id="notification-confirm-title">Limpiar notificaciones</h2>
            <p id="notification-confirm-description">
              Se eliminarán todas tus notificaciones. Esta acción no se puede deshacer.
            </p>
            <div className="notification-confirm-dialog__actions">
              <button
                type="button"
                className="notification-confirm-dialog__cancel"
                onClick={() => setShowClearNotificationsDialog(false)}
                disabled={clearingNotifications}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="notification-confirm-dialog__confirm"
                onClick={clearNotifications}
                disabled={clearingNotifications}
              >
                {clearingNotifications ? 'Limpiando...' : 'Sí, limpiar'}
              </button>
            </div>
          </section>
        </div>
      )}

      {reservationToCancel && (
        <div
          className="notification-confirm-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && cancelling == null) setReservationToCancel(null)
          }}
        >
          <section
            className="notification-confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reservation-cancel-title"
            aria-describedby="reservation-cancel-description"
          >
            <div className="notification-confirm-dialog__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M16 3v4M8 3v4M3 10h18M9 14l6 5M15 14l-6 5" />
              </svg>
            </div>
            <h2 id="reservation-cancel-title">Cancelar reserva</h2>
            <p id="reservation-cancel-description">
              ¿Quieres cancelar la reserva de {reservationToCancel.hotel}?{' '}
              {getCancellationPolicy(reservationToCancel).label}: {getCancellationPolicy(reservationToCancel).detail}
            </p>
            <div className="notification-confirm-dialog__actions">
              <button
                type="button"
                className="notification-confirm-dialog__cancel"
                onClick={() => setReservationToCancel(null)}
                disabled={cancelling != null}
              >
                Volver
              </button>
              <button
                type="button"
                className="notification-confirm-dialog__confirm"
                onClick={() => void confirmCancelReservation()}
                disabled={cancelling != null}
              >
                {cancelling != null ? 'Cancelando...' : 'Sí, cancelar reserva'}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Footer reuse landing footer */}
      <footer id="site-footer">
        <p>&copy; 2026 WorkPalace. Todos los derechos reservados.</p>
        <p>Panel de usuario</p>
      </footer>
    </div>
  )
}

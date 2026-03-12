import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from './Navbar'
import './Landing.css'

const API = 'http://localhost:3001'

interface CheckoutProps {
  user: { id?: number; username: string; fullName?: string; email?: string; role?: string }
  isDark: boolean
  setIsDark: (value: boolean) => void
}

interface Place {
  id: number
  name: string
  tipo: string
  barrio: string | null
  ciudad: string | null
}

export default function Checkout({ user, isDark, setIsDark }: CheckoutProps) {
  const { placeId } = useParams()
  const navigate = useNavigate()

  const [place, setPlace] = useState<Place | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)

  const [checkIn, setCheckIn] = useState<string>(today.toISOString().slice(0, 10))
  const [checkOut, setCheckOut] = useState<string>(tomorrow.toISOString().slice(0, 10))
  const [guests, setGuests] = useState(1)

  // Solo autocompletar con datos reales del usuario (tabla users)
  const [cardName, setCardName] = useState(user.fullName || user.username || '')
  const [cardEmail, setCardEmail] = useState(user.email || '')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    if (!placeId) {
      setError('Espacio no especificado')
      setLoading(false)
      return
    }
    let cancelled = false
    async function fetchPlace() {
      try {
        const res = await fetch(`${API}/api/places`, {
          headers: {
            'x-user-id': String(user.id),
          },
        })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setError(data.error || 'Error al cargar el espacio')
          return
        }
        const found = (data.places || []).find((p: Place) => String(p.id) === String(placeId))
        if (!found) {
          setError('Espacio no encontrado')
        } else {
          setPlace(found)
        }
      } catch (_e) {
        if (!cancelled) setError('No se pudo cargar la información del espacio.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchPlace()
    return () => { cancelled = true }
  }, [placeId])

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!place || !user.id) return
    if (!checkIn || !checkOut) {
      setError('Debes seleccionar fechas de entrada y salida.')
      return
    }
    setError(null)
    setPaying(true)
    try {
      const res = await fetch(`${API}/api/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user.id),
        },
        body: JSON.stringify({
          placeId: place.id,
          checkIn,
          checkOut,
          huespedes: guests,
          payment: {
            name: cardName,
            email: cardEmail,
            last4: cardNumber.slice(-4),
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'No se pudo completar la reserva.')
        return
      }
      // Redirigir al panel correspondiente según rol
      const target = user.role === 'admin' ? '/admin' : '/dashboard'
      navigate(target, { replace: true })
    } catch (_e) {
      setError('Error de conexión al procesar el pago simulado.')
    } finally {
      setPaying(false)
    }
  }

  return (
    <>
      <Navbar isDark={isDark} setIsDark={setIsDark} user={user} />

      <section className="features" style={{ paddingTop: '6rem' }}>
        <div className="features-container">
          <h2 className="section-title">Confirmar reserva</h2>

          {loading ? (
            <p className="settings-loading">Cargando información del espacio...</p>
          ) : error ? (
            <p className="reservations-error">{error}</p>
          ) : place ? (
            <div className="checkout-layout">
              <div className="checkout-summary">
                <h3>{place.name}</h3>
                <p className="checkout-place-type">{place.tipo}</p>
                <p className="checkout-place-location">
                  {[place.barrio, place.ciudad].filter(Boolean).join(', ')}
                </p>

                <div className="checkout-box">
                  <h4>Detalle de la reserva</h4>
                  <div className="checkout-row">
                    <label htmlFor="checkin">Check-in</label>
                    <input
                      id="checkin"
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                    />
                  </div>
                  <div className="checkout-row">
                    <label htmlFor="checkout">Check-out</label>
                    <input
                      id="checkout"
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                    />
                  </div>
                  <div className="checkout-row">
                    <label htmlFor="guests">Huéspedes</label>
                    <input
                      id="guests"
                      type="number"
                      min={1}
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value) || 1)}
                    />
                  </div>
                </div>
              </div>

              <form className="checkout-payment" onSubmit={handlePay}>
                <h3>Simulación de pago</h3>
                <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                  Esta es una pasarela de pago simulada. No se realizará ningún cobro real, pero se usará la información
                  para crear tu reserva en el sistema.
                </p>

                <div className="checkout-box">
                  <div className="checkout-row">
                    <label htmlFor="card-name">Nombre en la tarjeta</label>
                    <input
                      id="card-name"
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder={user.fullName || user.username || 'Nombre Apellido'}
                      required
                    />
                  </div>
                  <div className="checkout-row">
                    <label htmlFor="card-email">Correo de contacto</label>
                    <input
                      id="card-email"
                      type="email"
                      value={cardEmail}
                      onChange={(e) => setCardEmail(e.target.value)}
                      placeholder={user.email || 'correo@ejemplo.com'}
                      required
                    />
                  </div>
                  <div className="checkout-row">
                    <label htmlFor="card-number">Número de tarjeta</label>
                    <input
                      id="card-number"
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4111 1111 1111 1111"
                      required
                    />
                  </div>
                  <div className="checkout-row checkout-row-inline">
                    <div>
                      <label htmlFor="card-expiry">Vencimiento</label>
                      <input
                        id="card-expiry"
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="12/28"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="card-cvv">CVV</label>
                      <input
                        id="card-cvv"
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="123"
                        required
                      />
                    </div>
                  </div>
                </div>

                {error && <p className="reservations-error" style={{ marginTop: '0.5rem' }}>{error}</p>}

                <button className="btn btn-primary" type="submit" disabled={paying}>
                  {paying ? 'Procesando pago...' : 'Confirmar y reservar'}
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </section>
    </>
  )
}


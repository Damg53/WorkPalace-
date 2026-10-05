import { useEffect, useMemo, useState } from 'react'
import type { AdminAuditLog, AdminBlock, AdminCoupon, AdminPlace, AdminReservation, AdminUser } from './adminTypes'

const API = 'http://localhost:3001'

export function useAdminData(userId?: number) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [reservations, setReservations] = useState<AdminReservation[]>([])
  const [places, setPlaces] = useState<AdminPlace[]>([])
  const [coupons, setCoupons] = useState<AdminCoupon[]>([])
  const [blocks, setBlocks] = useState<AdminBlock[]>([])
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([])
  const [error, setError] = useState('')

  const adminHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    'x-user-id': String(userId ?? ''),
  }), [userId])

  useEffect(() => {
    async function loadData() {
      try {
        const [usersResponse, reservationsResponse, placesResponse, couponsResponse, blocksResponse, auditResponse] = await Promise.all([
          fetch(`${API}/api/users`, { headers: adminHeaders }),
          fetch(`${API}/api/admin/reservations`, { headers: adminHeaders }),
          fetch(`${API}/api/admin/places`, { headers: adminHeaders }),
          fetch(`${API}/api/admin/coupons`, { headers: adminHeaders }),
          fetch(`${API}/api/admin/blocks`, { headers: adminHeaders }),
          fetch(`${API}/api/admin/audit`, { headers: adminHeaders }),
        ])
        const usersData = await usersResponse.json()
        const reservationsData = await reservationsResponse.json()
        const placesData = await placesResponse.json()
        const couponsData = await couponsResponse.json()
        const blocksData = await blocksResponse.json()
        const auditData = await auditResponse.json()
        if (!usersResponse.ok) throw new Error(usersData.error || 'No se pudieron cargar los usuarios')
        if (!reservationsResponse.ok) throw new Error(reservationsData.error || 'No se pudieron cargar las reservas')
        if (!placesResponse.ok) throw new Error(placesData.error || 'No se pudieron cargar los lugares')
        setUsers(usersData.users || [])
        setReservations(reservationsData.reservations || [])
        setPlaces(placesData.places || [])
        setCoupons(couponsData.coupons || [])
        setBlocks(blocksData.blocks || [])
        setAuditLogs(auditData.logs || [])
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los datos')
      }
    }
    loadData()
  }, [adminHeaders, userId])

  async function updateRole(id: number, role: string) {
    const response = await fetch(`${API}/api/users/${id}/role`, { method: 'PUT', headers: adminHeaders, body: JSON.stringify({ role }) })
    if (!response.ok) return setError('Error al actualizar rol')
    const data = await response.json()
    setUsers((current) => current.map((item) => item.id === data.user.id ? data.user : item))
  }

  async function toggleUserActive(id: number, active: boolean) {
    const response = await fetch(`${API}/api/users/${id}/active`, { method: 'PUT', headers: adminHeaders, body: JSON.stringify({ active }) })
    if (!response.ok) return setError('Error al actualizar estado del usuario')
    const data = await response.json()
    setUsers((current) => current.map((item) => item.id === id ? { ...item, ...data.user, active } : item))
  }

  async function deleteUser(id: number) {
    if (!window.confirm(`¿Eliminar usuario #${id}? Esto también eliminará sus reservas.`)) return
    const response = await fetch(`${API}/api/users/${id}`, { method: 'DELETE', headers: adminHeaders })
    if (!response.ok && response.status !== 204) return setError('Error al eliminar usuario')
    window.location.reload()
  }

  async function updateReservation(id: number, payload: Partial<AdminReservation>) {
    const response = await fetch(`${API}/api/admin/reservations/${id}`, { method: 'PUT', headers: adminHeaders, body: JSON.stringify(payload) })
    const data = await response.json()
    if (!response.ok) return setError('Error al actualizar reserva')
    setReservations((current) => current.map((item) => item.id === data.reservation.id ? data.reservation : item))
  }

  async function deleteReservation(id: number) {
    if (!window.confirm(`¿Eliminar reserva #${id}?`)) return
    const response = await fetch(`${API}/api/admin/reservations/${id}`, { method: 'DELETE', headers: adminHeaders })
    if (!response.ok && response.status !== 204) return setError('Error al eliminar reserva')
    window.location.reload()
  }

  async function updatePlace(id: number, payload: Partial<AdminPlace>) {
    const response = await fetch(`${API}/api/admin/places/${id}`, { method: 'PUT', headers: adminHeaders, body: JSON.stringify(payload) })
    const data = await response.json()
    if (!response.ok) return setError('Error al actualizar lugar')
    setPlaces((current) => current.map((item) => item.id === data.place.id ? data.place : item))
  }

  async function togglePlaceActive(id: number, active: boolean) {
    await updatePlace(id, { active })
    window.location.reload()
  }

  async function deletePlace(id: number) {
    if (!window.confirm(`¿Eliminar lugar #${id}?`)) return
    const response = await fetch(`${API}/api/admin/places/${id}`, { method: 'DELETE', headers: adminHeaders })
    if (!response.ok && response.status !== 204) return setError('Error al eliminar lugar')
    window.location.reload()
  }

  async function createPlace(place: Omit<AdminPlace, 'id' | 'active'>) {
    const response = await fetch(`${API}/api/admin/places`, { method: 'POST', headers: adminHeaders, body: JSON.stringify(place) })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Error al crear lugar')
    setPlaces((current) => [...current, data.place])
  }

  async function createCoupon(payload: { code: string; label: string; discount: number; maxUses: number | null; startsAt: string; endsAt: string }) {
    const response = await fetch(`${API}/api/admin/coupons`, { method: 'POST', headers: adminHeaders, body: JSON.stringify(payload) })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Error al crear cupón')
    setCoupons((current) => [data.coupon, ...current])
  }

  async function toggleCoupon(id: number, active: boolean) {
    const response = await fetch(`${API}/api/admin/coupons/${id}`, { method: 'PUT', headers: adminHeaders, body: JSON.stringify({ active }) })
    const data = await response.json()
    if (!response.ok) return setError(data.error || 'Error al actualizar cupón')
    setCoupons((current) => current.map((item) => item.id === id ? data.coupon : item))
  }

  async function deleteCoupon(id: number) {
    if (!window.confirm(`¿Eliminar cupón #${id}?`)) return
    const response = await fetch(`${API}/api/admin/coupons/${id}`, { method: 'DELETE', headers: adminHeaders })
    if (!response.ok && response.status !== 204) return setError('Error al eliminar cupón')
    setCoupons((current) => current.filter((item) => item.id !== id))
  }

  async function createBlock(payload: { placeId: number; startsAt: string; endsAt: string; reason: string }) {
    const response = await fetch(`${API}/api/admin/blocks`, { method: 'POST', headers: adminHeaders, body: JSON.stringify(payload) })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Error al crear bloqueo')
    setBlocks((current) => [...current, data.block])
  }

  async function deleteBlock(id: number) {
    const response = await fetch(`${API}/api/admin/blocks/${id}`, { method: 'DELETE', headers: adminHeaders })
    if (!response.ok && response.status !== 204) return setError('Error al eliminar bloqueo')
    setBlocks((current) => current.filter((item) => item.id !== id))
  }

  return { users, reservations, places, coupons, blocks, auditLogs, error, updateRole, toggleUserActive, deleteUser, updateReservation, deleteReservation, updatePlace, togglePlaceActive, deletePlace, createPlace, createCoupon, toggleCoupon, deleteCoupon, createBlock, deleteBlock }
}

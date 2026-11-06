export interface AdminPlace {
  id: number
  created_at?: string
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
}

export interface AdminReservation {
  id: number
  created_at?: string
  [key: string]: unknown
}

export interface AdminUser {
  id: number
  created_at?: string
  username: string
  role?: string
  [key: string]: unknown
}

export interface AdminCoupon {
  id: number
  code: string
  label: string
  discount: number
  max_uses: number | null
  used_count: number
  starts_at: string | null
  ends_at: string | null
  active: boolean
  created_at?: string
}

export interface AdminBlock {
  id: number
  place_id: number
  place_name?: string
  starts_at: string
  ends_at: string
  reason: string | null
}

export interface AdminAuditLog {
  id: number
  action: string
  entity_type: string
  entity_id: number | null
  details: Record<string, unknown>
  created_at: string
  admin_username: string | null
}

export interface NewPlaceForm {
  name: string
  tipo: string
  direccion: string
  barrio: string
  ciudad: string
  capacidad: string
  precio_hora: string
  modalidad: string
  caracteristicas: string
  nivel_ruido: string
  image_url: string
}

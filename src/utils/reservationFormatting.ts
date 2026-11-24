const RESERVATION_UNITS: Record<string, [string, string]> = {
  day: ['día', 'días'],
  night: ['noche', 'noches'],
  week: ['semana', 'semanas'],
  fortnight: ['quincena', 'quincenas'],
  month: ['mes', 'meses'],
  appointment: ['cita', 'citas'],
}

export function formatReservationQuantity(mode: string | null | undefined, quantity: number, isTimed: boolean) {
  const unit = mode ? RESERVATION_UNITS[mode] : undefined
  if (unit) return `${quantity} ${quantity === 1 ? unit[0] : unit[1]}`
  return isTimed ? `${quantity} ${quantity === 1 ? 'hora' : 'horas'}` : String(quantity)
}

export function formatReadableDate(value: unknown) {
  if (typeof value !== 'string') return value == null ? '' : String(value)
  const datePart = value.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return value

  const date = new Date(`${datePart}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== datePart) return value

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export function formatReadableTime(value: unknown) {
  if (typeof value !== 'string') return ''
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/.exec(value)
  if (!match) return value

  const hour = Number(match[1])
  const period = hour < 12 ? 'a. m.' : 'p. m.'
  return `${hour % 12 || 12}:${match[2]} ${period}`
}

export function formatAvailableFrom(value: unknown) {
  if (typeof value !== 'string') return ''
  const date = formatReadableDate(value.slice(0, 10))
  const time = /T(\d{2}:\d{2})/.exec(value)?.[1]
  return time ? `${date} a las ${formatReadableTime(time)}` : date
}

export type TimePeriod = 'AM' | 'PM'

export interface TimeInputValue {
  time: string
  period: TimePeriod
}

export const emptyTimeInput = (period: TimePeriod = 'AM'): TimeInputValue => ({ time: '', period })

export function to12HourTime(value: string): TimeInputValue {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)
  if (!match) return emptyTimeInput()

  const hour = Number(match[1])
  return {
    time: `${String(hour % 12 || 12).padStart(2, '0')}:${match[2]}`,
    period: hour >= 12 ? 'PM' : 'AM',
  }
}

export function to24HourTime(value: TimeInputValue): string {
  const match = /^(0[1-9]|1[0-2]):([0-5]\d)$/.exec(value.time)
  if (!match) return ''

  const hour12 = Number(match[1])
  const hour24 = (hour12 % 12) + (value.period === 'PM' ? 12 : 0)
  return `${String(hour24).padStart(2, '0')}:${match[2]}`
}

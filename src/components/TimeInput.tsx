import { useRef } from 'react'
import type { TimeInputValue } from '../utils/timeInput'
import { to24HourTime } from '../utils/timeInput'

interface TimeInputProps {
  value: TimeInputValue
  onChange: (value: TimeInputValue) => void
  className: string
  minTime?: string
  maxTime?: string
  minuteStep?: number
  allowedPeriods?: TimeInputValue['period'][]
  required?: boolean
  disabled?: boolean
  placeholder?: string
}

const displayTimePattern = /^(0[1-9]|1[0-2]):([0-5]\d)$/

export default function TimeInput({ value, onChange, className, minTime, maxTime, minuteStep = 1, allowedPeriods = ['AM', 'PM'], required = false, disabled = false, placeholder = 'hh:mm' }: TimeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const displayMatch = displayTimePattern.exec(value.time)
  const canonicalValue = displayMatch ? to24HourTime(value) : ''
  const isValid = Boolean(displayMatch)
    && Number(displayMatch?.[2]) % minuteStep === 0
    && allowedPeriods.includes(value.period)
    && (!minTime || canonicalValue >= minTime)
    && (!maxTime || canonicalValue <= maxTime)

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        enterKeyHint="done"
        autoComplete="off"
        placeholder={placeholder}
        aria-label="Hora y minutos"
        aria-invalid={value.time.length > 0 && !isValid}
        value={value.time}
        maxLength={5}
        required={required}
        disabled={disabled}
        onChange={(event) => {
          const input = event.currentTarget
          const rawValue = input.value
          const cursor = input.selectionStart ?? rawValue.length
          const digitsBeforeCursor = rawValue.slice(0, cursor).replace(/\D/g, '').length
          const digits = rawValue.replace(/\D/g, '').slice(0, 4)
          const nextTime = digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits
          const editingMinutes = cursor >= 3 || (!rawValue.includes(':') && digitsBeforeCursor > 2)
          const nextCursor = editingMinutes
            ? Math.min(nextTime.length, Math.max(3, digitsBeforeCursor + 1))
            : Math.min(2, digitsBeforeCursor)

          onChange({ ...value, time: nextTime })
          requestAnimationFrame(() => {
            if (document.activeElement === inputRef.current) {
              inputRef.current?.setSelectionRange(nextCursor, nextCursor)
            }
          })
        }}
      />
      <div className="time-input-period" role="group" aria-label="Selecciona AM o PM">
        {(['AM', 'PM'] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value.period === option}
            className={value.period === option ? 'is-selected' : ''}
            disabled={disabled || !allowedPeriods.includes(option)}
            onClick={() => {
              onChange({ ...value, period: option })
            }}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

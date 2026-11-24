import './PhoneNumberInput.css'
import { normalizeColombianPhone } from '../utils/phoneValidation'

interface Props {
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  autoComplete?: string
}

export default function PhoneNumberInput({ id, value, onChange, disabled = false, autoComplete = 'tel-national' }: Props) {
  return (
    <span className="wp-phone-input">
      <span className="wp-phone-input__prefix" role="img" aria-label="Colombia, prefijo +57">
        <span className="wp-phone-input__flag" />
        <span>+57</span>
      </span>
      <input
        id={id}
        className="wp-phone-input__control"
        type="tel"
        inputMode="numeric"
        autoComplete={autoComplete}
        placeholder="300 123 4567"
        value={normalizeColombianPhone(value).slice(0, 10)}
        onChange={(event) => onChange(normalizeColombianPhone(event.target.value).slice(0, 10))}
        disabled={disabled}
      />
    </span>
  )
}

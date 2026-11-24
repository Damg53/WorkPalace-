import type { ClipboardEvent, KeyboardEvent } from 'react'

export function removeDigits(value: string) {
  return value.replace(/\d/g, '')
}

export function preventDigitKey(event: KeyboardEvent<HTMLInputElement>) {
  if (event.ctrlKey || event.metaKey) return
  if (event.key.length === 1 && /\d/.test(event.key)) event.preventDefault()
}

export function preventDigitPaste(event: ClipboardEvent<HTMLInputElement>) {
  if (/\d/.test(event.clipboardData.getData('text'))) event.preventDefault()
}

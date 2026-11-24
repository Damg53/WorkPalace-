import type { ClipboardEvent, KeyboardEvent } from 'react'

export function isIntegerInputValue(value: string) {
  return /^\d*$/.test(value)
}

export function preventNonIntegerKey(event: KeyboardEvent<HTMLInputElement>) {
  if (event.ctrlKey || event.metaKey) return
  if (event.key.length === 1 && !/^\d$/.test(event.key)) event.preventDefault()
}

export function preventNonIntegerPaste(event: ClipboardEvent<HTMLInputElement>) {
  if (!isIntegerInputValue(event.clipboardData.getData('text'))) event.preventDefault()
}

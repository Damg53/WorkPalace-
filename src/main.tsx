import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { containsProfanity } from './utils/contentValidation'

document.addEventListener('input', (event) => {
  const field = event.target
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
    field.setCustomValidity('')
  }
}, true)

document.addEventListener('submit', (event) => {
  if (!(event.target instanceof HTMLFormElement)) return

  const fields = event.target.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    'input:not([type]), input[type="text"], input[type="search"], input[type="email"], input[type="url"], input[type="tel"], textarea'
  )
  for (const field of fields) {
    field.setCustomValidity('')
    const fieldMetadata = `${field.name} ${field.id} ${field.autocomplete}`.toLowerCase()
    if (field.type === 'password' || fieldMetadata.includes('password')) continue
    if (!containsProfanity(field.value)) continue
    field.setCustomValidity('No se permiten palabras ofensivas.')
    event.preventDefault()
    event.stopImmediatePropagation()
    field.reportValidity()
    break
  }
}, true)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

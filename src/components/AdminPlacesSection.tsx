import { useEffect, useMemo, useRef, useState } from 'react'
import CapacidadCellInput from './CapacidadCellInput'
import WorkPalaceSelect from './WorkPalaceSelect'
import type { AdminPlace, NewPlaceForm } from './adminTypes'
import { containsProfanity } from '../utils/contentValidation'
import './AdminPlacesSection.css'

interface Props {
  places: AdminPlace[]
  updatePlace: (id: number, payload: Partial<AdminPlace>) => void
  togglePlaceActive: (id: number, active: boolean) => void
  deletePlace: (id: number) => void
  deletePlaces?: (ids: number[]) => void
  createPlace: (place: Omit<AdminPlace, 'id' | 'active'>) => Promise<void>
  withTopSpacing?: boolean
}

const TIPOS = ['Coworking', 'Oficina privada', 'Sala de reuniones', 'Auditorio / salón de eventos', 'Aula / salón de clases', 'Estudio de grabación', 'Estudio de fotografía', 'Sala de ensayo', 'Taller de carpintería', 'Taller / maker space', 'Cocina industrial', 'Cocina oculta (dark kitchen)', 'Consultorio', 'Gimnasio / sala de entrenamiento', 'Cancha / espacio deportivo', 'Terraza / rooftop', 'Patio / jardín', 'Bodega / almacén', 'Local comercial', 'Otro']
const CIUDADES = ['Medellín', 'Bello', 'Envigado', 'Sabaneta', 'Itagüí', 'Bogotá', 'Cali', 'Barranquilla', 'Cartagena', 'Bucaramanga', 'Pereira', 'Manizales', 'Santa Marta', 'Cúcuta', 'Otra']
const MODALIDADES = ['Por hora', 'Media jornada (4 horas)', 'Jornada completa (8 horas)', 'Por día', 'Por noche', 'Por semana', 'Por 15 días', 'Por mes', 'Solo por cita', 'Flexible (acordar con el propietario)']
const RUIDO = ['Silencioso (ideal para concentración)', 'Moderado (conversación normal)', 'Alto (actividad intensa)', 'Muy alto (industrial / eventos)', 'Aislado acústicamente', 'No aplica']
const selectOptions = (values: string[], placeholder?: string) => [
  ...(placeholder ? [{ value: '', label: placeholder }] : []),
  ...values.map((value) => ({ value, label: value })),
]
const BARRIOS: Record<string, string[]> = {
  Medellín: ['El Poblado', 'Laureles - Estadio', 'Belén', 'Robledo', 'Buenos Aires', 'La América', 'San Javier', 'Aranjuez', 'Manrique', 'Castilla', 'Guayabal', 'La Candelaria', 'Centro', 'Otro / No aplica'],
  Bello: ['Centro', 'Niquía', 'Zamora', 'Santa Ana', 'San Félix', 'Otro / No aplica'],
  Envigado: ['Centro', 'El Dorado', 'San Marcos', 'La Magnolia', 'Otro / No aplica'],
  Sabaneta: ['Centro', 'San Joaquín', 'Aliadas', 'Otro / No aplica'],
  Itagüí: ['Centro', 'Ditaires', 'San Pío', 'Santa María', 'Otro / No aplica'],
  Bogotá: ['Chapinero', 'Usaquén', 'Teusaquillo', 'Centro', 'Suba', 'Kennedy', 'Otro / No aplica'],
  Cali: ['San Fernando', 'El Peñón', 'Cristóbal Colón', 'La Flora', 'Centro', 'Otro / No aplica'],
  Barranquilla: ['El Prado', 'Villa Santos', 'Norte-Centro', 'El Laguito', 'Centro', 'Otro / No aplica'],
  Cartagena: ['Getsemaní', 'Castillo Grande', 'Centro', 'La Boquilla', 'Otro / No aplica'],
  Bucaramanga: ['Giron', 'Cabecera', 'Centro', 'El Socorro', 'Otro / No aplica'],
  Pereira: ['Centro', 'San Jorge', 'La Florida', 'El Poblado', 'Otro / No aplica'],
  Manizales: ['Centro', 'La Nubia', 'Villamil', 'Chipre', 'Otro / No aplica'],
  'Santa Marta': ['Centro', 'Rodadero', 'Taganga', 'Gaira', 'Otro / No aplica'],
  'Cúcuta': ['Centro', 'La Libertad', 'San Mateo', 'Guayabal', 'Otro / No aplica'],
  Otra: ['Otro / No aplica'],
}
const EMPTY: NewPlaceForm = { name: '', tipo: '', direccion: '', barrio: '', ciudad: '', capacidad: '', precio_hora: '', modalidad: '', caracteristicas: '', nivel_ruido: '', image_url: '' }
const isValidCapacity = (value: string) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0
const capacityValidationMessage = 'Ingresa un número entero mayor que 0.'
const PLACE_CREATE_STEPS = ['Información básica', 'Ubicación', 'Detalles', 'Precio y foto']
const PAGE_SIZE = 8
const placePriceFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const placeColors = [
  ['#3b73ff', '#7c6cff'],
  ['#7c6cff', '#e0457b'],
  ['#2fa37a', '#3b73ff'],
  ['#f0803c', '#e0457b'],
  ['#f0a951', '#e0457b'],
  ['#e0457b', '#7c6cff'],
  ['#3b73ff', '#2fa37a'],
  ['#6b7280', '#7c6cff'],
]

type PlaceSortKey = 'id' | 'name' | 'capacidad' | 'precio_hora'

interface PlaceImagePickerProps {
  id: string
  value: string
  onChange: (value: string) => void
}

function PlaceImagePicker({ id, value, onChange }: PlaceImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [previewError, setPreviewError] = useState(false)
  const [fileError, setFileError] = useState('')
  const isUploadedImage = value.startsWith('data:image/')

  const handleFile = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setFileError('Selecciona un archivo de imagen válido.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setFileError('No se pudo leer la imagen. Inténtalo de nuevo.')
        return
      }
      onChange(reader.result)
      setFileName(file.name)
      setPreviewError(false)
      setFileError('')
    }
    reader.onerror = () => setFileError('No se pudo leer la imagen. Inténtalo de nuevo.')
    reader.readAsDataURL(file)
  }

  const clearImage = () => {
    onChange('')
    setFileName('')
    setPreviewError(false)
    setFileError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="place-image-picker">
      <div className="place-image-picker__fields">
        <label className="place-image-picker__url-field" htmlFor={`${id}-url`}>
          <span>Enlace de imagen</span>
          <input
            id={`${id}-url`}
            type="text"
            inputMode="url"
            value={isUploadedImage ? '' : value}
            onChange={(event) => {
              onChange(event.target.value)
              setFileName('')
              setPreviewError(false)
              setFileError('')
            }}
            placeholder={isUploadedImage ? 'Usando imagen seleccionada desde tu equipo' : 'https://ejemplo.com/imagen.jpg'}
            autoComplete="off"
          />
        </label>
        <div className="place-image-picker__file-field">
          <span>O selecciona un archivo</span>
          <input
            ref={fileInputRef}
            id={`${id}-file`}
            className="place-image-picker__file-input"
            type="file"
            accept="image/*"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          <label className="place-image-picker__file-button" htmlFor={`${id}-file`}>
            <i className="fa fa-upload" aria-hidden="true" />
            Elegir imagen
          </label>
          <small>{fileName || (isUploadedImage ? 'Imagen cargada desde archivo' : 'JPG, PNG o WEBP')}</small>
        </div>
      </div>

      <div className="place-image-picker__preview" aria-live="polite">
        {value && !previewError ? (
          <img
            src={value}
            alt="Vista previa de la imagen del espacio"
            onError={() => setPreviewError(true)}
          />
        ) : (
          <div className="place-image-picker__empty">
            <i className={`fa ${previewError ? 'fa-exclamation-circle' : 'fa-picture-o'}`} aria-hidden="true" />
            <span>{previewError ? 'No se pudo cargar esta imagen' : 'La vista previa aparecerá aquí'}</span>
          </div>
        )}
      </div>

      {fileError && <p className="place-image-picker__error" role="alert">{fileError}</p>}
      {value && (
        <button type="button" className="place-image-picker__remove" onClick={clearImage}>
          Quitar imagen
        </button>
      )}
    </div>
  )
}

const getSuggestedPrice = (tipo: string, ciudad: string, barrioActual: string, capacidad: string, modalidad: string) => {
  const baseByType: Record<string, number> = {
    'Coworking': 20000,
    'Oficina privada': 28000,
    'Sala de reuniones': 35000,
    'Auditorio / salón de eventos': 70000,
    'Aula / salón de clases': 45000,
    'Estudio de grabación': 90000,
    'Estudio de fotografía': 60000,
    'Sala de ensayo': 55000,
    'Taller de carpintería': 50000,
    'Taller / maker space': 48000,
    'Cocina industrial': 65000,
    'Cocina oculta (dark kitchen)': 60000,
    'Consultorio': 40000,
    'Gimnasio / sala de entrenamiento': 55000,
    'Cancha / espacio deportivo': 75000,
    'Terraza / rooftop': 80000,
    'Patio / jardín': 60000,
    'Bodega / almacén': 35000,
    'Local comercial': 70000,
    'Otro': 30000,
  }

  const cityBasePrice: Record<string, number> = {
    Medellín: 56000,
    Bello: 42000,
    Envigado: 50000,
    Sabaneta: 61000,
    Itagüí: 39000,
    Bogotá: 65000,
    Cali: 47000,
    Barranquilla: 41000,
    Cartagena: 43000,
    Bucaramanga: 40000,
    Pereira: 39000,
    Manizales: 36000,
    'Santa Marta': 42000,
    'Cúcuta': 35000,
    Otra: 30000,
  }

  const capacidadNum = Number(capacidad) || 1
  const capacityFactor = capacidadNum <= 2 ? 0.8 : capacidadNum <= 4 ? 0.95 : capacidadNum <= 8 ? 1.08 : capacidadNum <= 12 ? 1.2 : capacidadNum <= 20 ? 1.5
  : capacidadNum <= 30 ? 1.65 : capacidadNum <= 50 ? 1.8 : capacidadNum <= 100 ? 3 : 3.3

  const modalityFactor: Record<string, number> = {
    'Por hora': 1,
    'Media jornada (4 horas)': 3.2,
    'Jornada completa (8 horas)': 5.5,
    'Por día': 6.5,
    'Por noche': 2.6,
    'Por semana': 18,
    'Por 15 días': 28,
    'Por mes': 42,
    'Solo por cita': 1,
    'Flexible (acordar con el propietario)': 1,
  }

  const base = baseByType[tipo] || 80000
  const cityBase = cityBasePrice[ciudad] || 35000
  const barrioPriceFactor: Record<string, number> = {
    'El Poblado': 1.35,
    'Laureles - Estadio': 1.2,
    Belén: 1.15,
    Centro: 1.08,
    Robledo: 0.96,
    'Buenos Aires': 0.95,
    'La América': 1.02,
    'San Javier': 0.94,
    Manrique: 0.93,
    Castilla: 0.92,
    Niquía: 1.1,
    Zamora: 0.98,
    'Santa Ana': 1,
    'El Dorado': 1.08,
    'San Marcos': 1.04,
    'La Magnolia': 1.02,
    'San Joaquín': 1.08,
    Aliadas: 1.03,
    Ditaires: 0.96,
    'San Pío': 0.98,
    'Santa María': 0.94,
    Chapinero: 1.22,
    Usaquén: 1.18,
    Teusaquillo: 1.14,
    Suba: 1.06,
    Kennedy: 1,
    'San Fernando': 1.1,
    'El Peñón': 1.08,
    'Cristóbal Colón': 1.04,
    'La Flora': 1,
    'El Prado': 1.08,
    'Villa Santos': 0.98,
    'Norte-Centro': 1.05,
    'El Laguito': 1.2,
    Getsemaní: 1.15,
    'Castillo Grande': 1.14,
    'La Boquilla': 0.97,
    Girón: 1.12,
    Cabecera: 1.04,
    'El Socorro': 0.94,
    'San Jorge': 1.02,
    'La Florida': 0.96,
    'La Nubia': 0.96,
    Villamil: 0.92,
    Chipre: 0.94,
    Rodadero: 1.16,
    Taganga: 1.12,
    Gaira: 1.08,
    'La Libertad': 0.96,
    'San Mateo': 0.93,
    Guayabal: 0.9,
    'Otro / No aplica': 0.88,
  }
  const barrioFactor = barrioPriceFactor[barrioActual] || 1
  const modalityValue = modalityFactor[modalidad] || 1

  return Math.round((base * (cityBase / 55000) * barrioFactor * capacityFactor * modalityValue))
}

const formatPriceForModality = (precioHora: number | null, modalidad: string | null) => {
  if (precioHora == null) return 'A convenir'

  const unidades: Record<string, string> = {
    'Por hora': '/ hora',
    'Media jornada (4 horas)': '/ 4 horas',
    'Jornada completa (8 horas)': '/ 8 horas',
    'Por día': '/ día',
    'Por noche': '/ noche',
    'Por semana': '/ semana',
    'Por 15 días': '/ 15 días',
    'Por mes': '/ mes',
    'Solo por cita': ' por cita',
    'Flexible (acordar con el propietario)': '/ tarifa',
  }

  return `$${precioHora.toLocaleString('es-CO')}${unidades[modalidad ?? ''] ?? ''}`
}

export default function AdminPlacesSection({ places, updatePlace, togglePlaceActive, deletePlace, deletePlaces, createPlace, withTopSpacing = false }: Props) {
  const [form, setForm] = useState(EMPTY)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingAddress, setEditingAddress] = useState('')
  const [editingUrl, setEditingUrl] = useState('')
  const [formError, setFormError] = useState('')
  const [createStep, setCreateStep] = useState(0)
  const [maxCreateStep, setMaxCreateStep] = useState(0)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [typeFilter, setTypeFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [sort, setSort] = useState<{ key: PlaceSortKey; direction: 1 | -1 }>({ key: 'id', direction: 1 })
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set())
  const searchRef = useRef<HTMLInputElement>(null)
  const setField = (field: keyof NewPlaceForm, value: string) => setForm((current) => ({ ...current, [field]: value }))
  const stopWheel = (event: React.WheelEvent<HTMLInputElement>) => event.currentTarget.blur()

  const suggestedPrice = getSuggestedPrice(form.tipo, form.ciudad, form.barrio, form.capacidad, form.modalidad)
  const normalizedQuery = query.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const filteredPlaces = useMemo(() => {
    const matches = places.filter((place) => {
      const active = place.active !== false
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? active : !active)
      const searchable = `${place.name} ${place.barrio || ''} ${place.ciudad || ''} ${place.tipo} #${place.id}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()

      return matchesStatus
        && (!typeFilter || place.tipo === typeFilter)
        && (!cityFilter || place.ciudad === cityFilter)
        && (!normalizedQuery || searchable.includes(normalizedQuery))
    })

    return matches.sort((a, b) => {
      if (sort.key === 'name') return a.name.localeCompare(b.name, 'es') * sort.direction
      const valueA = sort.key === 'id' ? a.id : Number(a[sort.key] || 0)
      const valueB = sort.key === 'id' ? b.id : Number(b[sort.key] || 0)
      return (valueA - valueB) * sort.direction
    })
  }, [places, statusFilter, typeFilter, cityFilter, normalizedQuery, sort])
  const pageCount = Math.max(1, Math.ceil(filteredPlaces.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visiblePlaces = filteredPlaces.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const allVisibleSelected = visiblePlaces.length > 0 && visiblePlaces.every((place) => selectedIds.has(place.id))
  const someVisibleSelected = visiblePlaces.some((place) => selectedIds.has(place.id))
  const activeCount = places.filter((place) => place.active !== false).length
  const hourlyPlaces = places.filter((place) => place.modalidad === 'Por hora' && Number(place.precio_hora) > 0)
  const averageHourlyPrice = hourlyPlaces.length
    ? hourlyPlaces.reduce((total, place) => total + Number(place.precio_hora), 0) / hourlyPlaces.length
    : 0
  const hasFilters = Boolean(query || typeFilter || cityFilter || statusFilter !== 'all')

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName
      if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag || '')) {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  function changeQuery(value: string) {
    setQuery(value)
    setPage(1)
  }

  function changeStatusFilter(value: 'all' | 'active' | 'inactive') {
    setStatusFilter(value)
    setPage(1)
  }

  function changeTypeFilter(value: string) {
    setTypeFilter(value)
    setPage(1)
  }

  function changeCityFilter(value: string) {
    setCityFilter(value)
    setPage(1)
  }

  function toggleSort(key: PlaceSortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 1 ? -1 : 1,
    }))
  }

  function togglePageSelection() {
    setSelectedIds((current) => {
      const next = new Set(current)
      visiblePlaces.forEach((place) => {
        if (allVisibleSelected) next.delete(place.id)
        else next.add(place.id)
      })
      return next
    })
  }

  async function setSelectedPlacesActive(active: boolean) {
    await Promise.all([...selectedIds].map((id) => updatePlace(id, { active })))
    setSelectedIds(new Set())
  }

  function clearFilters() {
    setQuery('')
    setStatusFilter('all')
    setTypeFilter('')
    setCityFilter('')
    setPage(1)
  }

  function goToCreateStep(nextStep: number) {
    setCreateStep(nextStep)
    setFormError('')
  }

  function handleCreateStepSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (createStep === 0) {
      if (!form.name.trim()) {
        setFormError('Escribe el nombre del espacio.')
        return
      }
      if (!form.tipo) {
        setFormError('Elige el tipo de espacio.')
        return
      }
      if (!isValidCapacity(form.capacidad)) {
        setFormError(capacityValidationMessage)
        return
      }
    }

    if (createStep < PLACE_CREATE_STEPS.length - 1) {
      const nextStep = createStep + 1
      setMaxCreateStep((current) => Math.max(current, nextStep))
      goToCreateStep(nextStep)
      return
    }

    void handleCreate()
  }

  async function handleCreate() {
    const textFields = [form.name, form.tipo, form.direccion, form.barrio, form.ciudad, form.modalidad, form.caracteristicas, form.nivel_ruido]
    if (textFields.some(containsProfanity)) {
      setFormError('No se permiten palabras ofensivas en los campos del espacio.')
      return
    }
    if (!form.name.trim() || !form.tipo) {
      goToCreateStep(0)
      setFormError('Completa el nombre y el tipo de espacio.')
      return
    }
    if (!isValidCapacity(form.capacidad)) {
      goToCreateStep(0)
      setFormError(capacityValidationMessage)
      return
    }
    const finalPrice = Number(form.precio_hora || suggestedPrice)
    if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
      setFormError('Ingresa un precio mayor que cero.')
      return
    }
    setFormError('')
    try {
      await createPlace({ ...form, direccion: form.direccion.trim() || null, barrio: form.barrio || null, ciudad: form.ciudad || null, capacidad: form.capacidad || null, precio_hora: Number.isFinite(finalPrice) ? finalPrice : null, modalidad: form.modalidad || null, caracteristicas: form.caracteristicas || null, nivel_ruido: form.nivel_ruido || null, image_url: form.image_url || null })
      setForm(EMPTY)
      setCreateStep(0)
      setMaxCreateStep(0)
      setShowForm(false)
    } catch {
      // El hook informa los errores de red al panel principal.
    }
  }

  function toggleCreateForm() {
    if (showForm) {
      setForm(EMPTY)
      setFormError('')
      setCreateStep(0)
      setMaxCreateStep(0)
    }
    setShowForm((current) => !current)
  }

  return <section className="users-section ad" id="places" style={{ marginTop: withTopSpacing ? '3rem' : 0 }}>
    <div className="ad-top ad-top--actions">
      <button className="ad-btn ad-btn--solid" type="button" onClick={toggleCreateForm}>{showForm ? 'Cancelar' : '+ Nuevo espacio'}</button>
    </div>
    <div className="ad-kpis">
      <article className="ad-kpi" style={{ '--n': 0, '--c': '#7c6cff' } as React.CSSProperties}>
        <span>Total de espacios</span><strong>{places.length}</strong>
      </article>
      <article className="ad-kpi" style={{ '--n': 1, '--c': '#3ccf82' } as React.CSSProperties}>
        <span>Activos</span><strong>{activeCount}</strong>
        <div className="ad-kpi__bar"><i style={{ width: `${places.length ? (activeCount / places.length) * 100 : 0}%` }} /></div>
      </article>
      <article className="ad-kpi" style={{ '--n': 2, '--c': '#f0a951' } as React.CSSProperties}>
        <span>Inactivos</span><strong>{places.length - activeCount}</strong>
      </article>
      <article className="ad-kpi" style={{ '--n': 3, '--c': '#3b73ff' } as React.CSSProperties}>
        <span>Precio promedio por hora</span><strong>{placePriceFormatter.format(averageHourlyPrice)}</strong>
      </article>
    </div>
    {showForm && <form onSubmit={handleCreateStepSubmit} className="form-create-place place-create-wizard" autoComplete="off">
      <header className="place-create-heading">
        <div>
          <span className="place-create-eyebrow">Publicación de espacio</span>
          <h3>Cuéntanos sobre tu espacio</h3>
          <p>Completa estos pasos para agregarlo a WorkPalace.</p>
        </div>
        <span className="place-create-step-count">Paso {createStep + 1} de {PLACE_CREATE_STEPS.length}</span>
      </header>

      <ol className="place-create-steps" aria-label="Progreso de creación del espacio">
        {PLACE_CREATE_STEPS.map((title, index) => (
          <li key={title} className={index === createStep ? 'is-current' : index < createStep ? 'is-complete' : ''}>
            <button type="button" disabled={index > maxCreateStep} aria-current={index === createStep ? 'step' : undefined} onClick={() => goToCreateStep(index)}>
              <span>{index < createStep ? <i className="fa fa-check" aria-hidden="true" /> : index + 1}</span>
              <em>{title}</em>
            </button>
          </li>
        ))}
      </ol>
      <div className="place-create-progress" aria-hidden="true"><span style={{ width: `${(createStep / (PLACE_CREATE_STEPS.length - 1)) * 100}%` }} /></div>

      <div className="place-create-layout">
        <section className="place-create-panel" aria-live="polite">
          <div className="place-create-panel-heading">
            <span>0{createStep + 1}</span>
            <h4>{PLACE_CREATE_STEPS[createStep]}</h4>
          </div>

          {createStep === 0 && <div className="place-create-fields">
            <label className="place-create-field place-create-field--full" htmlFor="create-place-name">
              <span>Nombre del espacio <b>*</b></span>
              <input id="create-place-name" className="form-create-place-input" value={form.name} onChange={(event) => setField('name', event.target.value)} maxLength={255} autoComplete="off" required />
              <small>Elige un nombre claro y fácil de recordar.</small>
            </label>
            <label className="place-create-field" htmlFor="create-place-type">
              <span>Tipo de espacio <b>*</b></span>
              <WorkPalaceSelect inputId="create-place-type" className="wp-select--place-form" value={form.tipo} options={selectOptions(TIPOS, 'Selecciona un tipo')} onChange={(value) => setField('tipo', value)} required />
            </label>
            <label className="place-create-field" htmlFor="create-place-capacity">
              <span>Capacidad máxima <b>*</b></span>
              <input
                id="create-place-capacity"
                className="form-create-place-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]+"
                value={form.capacidad}
                onChange={(event) => {
                  const value = event.target.value
                  setField('capacidad', value)
                  event.currentTarget.setCustomValidity(isValidCapacity(value) ? '' : capacityValidationMessage)
                }}
                onInvalid={(event) => event.currentTarget.setCustomValidity(capacityValidationMessage)}
                aria-describedby="create-place-capacity-hint"
                required
              />
              <small id="create-place-capacity-hint">Ingresa un número entero mayor que cero.</small>
            </label>
          </div>}

          {createStep === 1 && <div className="place-create-fields">
            <label className="place-create-field" htmlFor="create-place-city">
              <span>Ciudad</span>
              <WorkPalaceSelect inputId="create-place-city" className="wp-select--place-form" value={form.ciudad} options={selectOptions(CIUDADES, 'Selecciona una ciudad')} onChange={(value) => {
                setField('ciudad', value)
                setField('barrio', '')
              }} />
            </label>
            <label className="place-create-field" htmlFor="create-place-neighborhood">
              <span>Barrio</span>
              <WorkPalaceSelect inputId="create-place-neighborhood" className="wp-select--place-form" value={form.barrio} options={selectOptions(BARRIOS[form.ciudad] || [], form.ciudad ? 'Selecciona un barrio' : 'Primero elige una ciudad')} onChange={(value) => setField('barrio', value)} disabled={!form.ciudad} />
            </label>
            <label className="place-create-field place-create-field--full" htmlFor="create-place-address">
              <span>Dirección</span>
              <input id="create-place-address" className="form-create-place-input" value={form.direccion} onChange={(event) => setField('direccion', event.target.value)} autoComplete="off" />
              <small>Podrás completar o cambiar la dirección más adelante.</small>
            </label>
          </div>}

          {createStep === 2 && <div className="place-create-fields">
            <label className="place-create-field" htmlFor="create-place-modality">
              <span>Modalidad de precio</span>
              <WorkPalaceSelect inputId="create-place-modality" className="wp-select--place-form" value={form.modalidad} options={selectOptions(MODALIDADES, 'Selecciona una modalidad')} onChange={(value) => setField('modalidad', value)} />
            </label>
            <label className="place-create-field" htmlFor="create-place-noise">
              <span>Nivel de ruido</span>
              <WorkPalaceSelect inputId="create-place-noise" className="wp-select--place-form" value={form.nivel_ruido} options={selectOptions(RUIDO, 'Selecciona un nivel')} onChange={(value) => setField('nivel_ruido', value)} />
            </label>
            <label className="place-create-field place-create-field--full" htmlFor="create-place-details">
              <span>Características del espacio</span>
              <textarea id="create-place-details" className="form-create-place-textarea" value={form.caracteristicas} onChange={(event) => setField('caracteristicas', event.target.value)} maxLength={2000} rows={5} />
              <small>{form.caracteristicas.length}/2000 caracteres.</small>
            </label>
          </div>}

          {createStep === 3 && <div className="place-create-fields">
            <label className="place-create-field place-create-field--full" htmlFor="create-place-price">
              <span>Precio base en pesos colombianos <b>*</b></span>
              <div className="form-create-place-price">
                <span aria-hidden="true">$</span>
                <input id="create-place-price" className="form-create-place-input" type="number" min="1" step="1" value={form.precio_hora || String(Math.round(suggestedPrice))} onChange={(event) => setField('precio_hora', event.target.value)} onWheel={stopWheel} required />
              </div>
              {form.tipo && form.ciudad && form.modalidad && <small>Precio sugerido: <strong>{formatPriceForModality(suggestedPrice, form.modalidad)}</strong></small>}
            </label>
            <div className="place-create-field place-create-field--full">
              <span>Foto principal</span>
              <small>Elige una imagen que represente tu espacio. Puedes subir un archivo o pegar un enlace.</small>
              <PlaceImagePicker id="create-place-image" value={form.image_url} onChange={(value) => setField('image_url', value)} />
            </div>
          </div>}

          {formError && <p className="place-create-error" role="alert">{formError}</p>}
          <div className="place-create-actions">
            {createStep > 0
              ? <button type="button" className="place-create-button place-create-button--secondary" onClick={() => goToCreateStep(createStep - 1)}><i className="fa fa-arrow-left" aria-hidden="true" /> Atrás</button>
              : <span />}
            <button type="submit" className="place-create-button place-create-button--primary">
              {createStep === PLACE_CREATE_STEPS.length - 1 ? 'Crear espacio' : <>Continuar <i className="fa fa-arrow-right" aria-hidden="true" /></>}
            </button>
          </div>
        </section>

        <aside className="place-create-preview" aria-label="Vista previa del espacio">
          <p className="place-create-preview__eyebrow">Vista previa</p>
          <article className="place-create-preview__card">
            <div className="place-create-preview__cover">
              {form.image_url
                ? <img src={form.image_url} alt="" />
                : <i className="fa fa-building-o" aria-hidden="true" />}
              <span>Nuevo</span>
              {form.tipo && <b>{form.tipo}</b>}
            </div>
            <div className="place-create-preview__body">
              <h5>{form.name.trim() || 'Nombre de tu espacio'}</h5>
              <p>{[form.barrio, form.ciudad].filter(Boolean).join(', ') || 'Ubicación por completar'}</p>
              <span>{form.capacidad ? `Hasta ${form.capacidad} personas` : 'Capacidad por definir'}</span>
              <div>{form.precio_hora || (form.tipo && form.ciudad && form.modalidad)
                ? formatPriceForModality(Number(form.precio_hora || suggestedPrice), form.modalidad || 'Por hora')
                : 'Precio por definir'}</div>
            </div>
          </article>
          <p className="place-create-preview__note">La información de esta vista previa se actualizará mientras completas el formulario.</p>
        </aside>
      </div>
    </form>}
    <div className="ad-tabla-wrap">
      <div className="ad-barra">
        <label className="ad-buscar">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          <input ref={searchRef} value={query} onChange={(event) => changeQuery(event.target.value)} placeholder="Buscar por nombre, barrio o ID" aria-label="Buscar espacios" />
          {query
            ? <button type="button" onClick={() => changeQuery('')} aria-label="Borrar búsqueda"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12" /></svg></button>
            : <kbd>/</kbd>}
        </label>
        <div className="ad-seg" role="group" aria-label="Filtrar por estado">
          {([
            ['all', 'Todos'],
            ['active', 'Activos'],
            ['inactive', 'Inactivos'],
          ] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={statusFilter === value} onClick={() => changeStatusFilter(value)}>
              {label}
            </button>
          ))}
        </div>
        <WorkPalaceSelect className="wp-select--admin-filter" value={typeFilter} options={selectOptions(TIPOS, 'Todos los tipos')} onChange={changeTypeFilter} ariaLabel="Filtrar por tipo" />
        <WorkPalaceSelect className="wp-select--admin-filter" value={cityFilter} options={selectOptions(CIUDADES, 'Todas las ciudades')} onChange={changeCityFilter} ariaLabel="Filtrar por ciudad" />
        {hasFilters && <button className="ad-link" type="button" onClick={clearFilters}>Limpiar filtros</button>}
      </div>

      {visiblePlaces.length > 0 ? (
        <div className="ad-scroll" role="region" aria-label="Tabla de espacios" tabIndex={0}>
          <table className="ad-tabla">
            <thead>
              <tr>
                <th className="ad-chk">
                  <input
                    type="checkbox"
                    aria-label="Seleccionar todos los espacios de esta página"
                    checked={allVisibleSelected}
                    ref={(element) => {
                      if (element) element.indeterminate = someVisibleSelected && !allVisibleSelected
                    }}
                    onChange={togglePageSelection}
                  />
                </th>
                <th aria-sort={sort.key === 'name' ? (sort.direction === 1 ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className={`ad-sort${sort.key === 'name' ? ' is-on' : ''}`} onClick={() => toggleSort('name')}>Espacio <span>{sort.key === 'name' ? (sort.direction === 1 ? '↑' : '↓') : ''}</span></button>
                </th>
                <th>Tipo</th><th>Barrio</th><th>Ciudad</th>
                <th aria-sort={sort.key === 'capacidad' ? (sort.direction === 1 ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className={`ad-sort${sort.key === 'capacidad' ? ' is-on' : ''}`} onClick={() => toggleSort('capacidad')}>Capacidad <span>{sort.key === 'capacidad' ? (sort.direction === 1 ? '↑' : '↓') : ''}</span></button>
                </th>
                <th aria-sort={sort.key === 'precio_hora' ? (sort.direction === 1 ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className={`ad-sort${sort.key === 'precio_hora' ? ' is-on' : ''}`} onClick={() => toggleSort('precio_hora')}>Precio base <span>{sort.key === 'precio_hora' ? (sort.direction === 1 ? '↑' : '↓') : ''}</span></button>
                </th>
                <th>Modalidad</th><th>Estado</th><th className="ad-acc-th">Acciones</th>
              </tr>
            </thead>
            <tbody key={`${currentPage}-${normalizedQuery}-${statusFilter}-${typeFilter}-${cityFilter}-${sort.key}-${sort.direction}`}>
              {visiblePlaces.map((place, index) => {
                const [accent, accentAlt] = placeColors[Math.max(0, TIPOS.indexOf(place.tipo)) % placeColors.length]
                const active = place.active !== false
                return (
                  <tr key={place.id} className={`${active ? '' : 'is-off'}${selectedIds.has(place.id) ? ' is-sel' : ''}`} style={{ '--a': accent, '--b': accentAlt, '--n': index } as React.CSSProperties}>
                    <td className="ad-chk"><input type="checkbox" aria-label={`Seleccionar ${place.name}`} checked={selectedIds.has(place.id)} onChange={() => setSelectedIds((current) => {
                      const next = new Set(current)
                      if (next.has(place.id)) next.delete(place.id)
                      else next.add(place.id)
                      return next
                    })} /></td>
                    <td data-label="Espacio">
                      <div className="ad-esp">
                        <span className="ad-tile">{place.name.trim().charAt(0).toUpperCase() || '?'}</span>
                        <div>
                          <input className="ad-name" aria-label={`Nombre de ${place.name}`} defaultValue={place.name} onBlur={(event) => {
                            if (event.target.value.trim() && event.target.value.trim() !== place.name) void updatePlace(place.id, { name: event.target.value.trim() })
                          }} />
                          <small>#{place.id}</small>
                        </div>
                      </div>
                    </td>
                    <td data-label="Tipo">
                      <WorkPalaceSelect className="wp-select--inline wp-select--inline-wide" ariaLabel={`Tipo de ${place.name}`} defaultValue={place.tipo || ''} options={selectOptions(TIPOS)} onChange={(value) => void updatePlace(place.id, { tipo: value })} />
                    </td>
                    <td data-label="Barrio">
                      <WorkPalaceSelect
                        className="wp-select--inline"
                        ariaLabel={`Barrio de ${place.name}`}
                        defaultValue={place.barrio || ''}
                        options={selectOptions([
                          ...(place.barrio && !(BARRIOS[place.ciudad || 'Medellín'] || []).includes(place.barrio) ? [place.barrio] : []),
                          ...(BARRIOS[place.ciudad || 'Medellín'] || []),
                        ], 'Sin barrio')}
                        onChange={(value) => void updatePlace(place.id, { barrio: value })}
                      />
                    </td>
                    <td data-label="Ciudad">
                      <WorkPalaceSelect
                        className="wp-select--inline"
                        ariaLabel={`Ciudad de ${place.name}`}
                        defaultValue={place.ciudad || ''}
                        options={selectOptions([
                          ...(place.ciudad && !CIUDADES.includes(place.ciudad) ? [place.ciudad] : []),
                          ...CIUDADES,
                        ], 'Sin ciudad')}
                        onChange={(value) => void updatePlace(place.id, { ciudad: value })}
                      />
                    </td>
                    <td data-label="Capacidad"><span className="ad-cap"><i className="fa fa-users" aria-hidden="true" /><CapacidadCellInput value={place.capacidad || ''} onSave={(value) => updatePlace(place.id, { capacidad: value })} /></span></td>
                    <td data-label="Precio base"><strong className="ad-precio">{place.precio_hora == null ? 'A convenir' : placePriceFormatter.format(Number(place.precio_hora))}</strong><small>{place.modalidad || 'Modalidad no definida'}</small></td>
                    <td data-label="Modalidad">
                      <WorkPalaceSelect className="wp-select--inline" ariaLabel={`Modalidad de ${place.name}`} defaultValue={place.modalidad || ''} options={selectOptions(MODALIDADES)} onChange={(value) => void updatePlace(place.id, { modalidad: value })} />
                    </td>
                    <td data-label="Estado"><div className="ad-estado">
                      <button type="button" role="switch" aria-checked={active} aria-label={`${active ? 'Desactivar' : 'Activar'} ${place.name}`} className={`ad-switch${active ? ' is-on' : ''}`} onClick={() => togglePlaceActive(place.id, !active)}><i /></button>
                      <span>{active ? 'Activo' : 'Inactivo'}</span>
                    </div></td>
                    <td data-label="Acciones" className="ad-acc">
                      <button type="button" className="ad-icon" onClick={() => { setEditingId(place.id); setEditingAddress(place.direccion || ''); setEditingUrl(place.image_url || '') }} aria-label={`Editar dirección e imagen de ${place.name}`} data-tip="Editar">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></svg>
                      </button>
                      <button type="button" className="ad-icon ad-icon--bad" onClick={() => deletePlace(place.id)} aria-label={`Eliminar ${place.name}`} data-tip="Eliminar">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="ad-vacio"><span><i className="fa fa-search" aria-hidden="true" /></span><b>{places.length ? 'No encontramos espacios' : 'No hay lugares registrados'}</b><p>{places.length ? 'Prueba con otra búsqueda o quita algunos filtros.' : 'Cuando se publiquen espacios, aparecerán aquí.'}</p>{hasFilters && <button className="ad-btn ad-btn--ghost" type="button" onClick={clearFilters}>Limpiar filtros</button>}</div>
      )}

      <footer className="ad-pie">
        <span>Mostrando {visiblePlaces.length} de {filteredPlaces.length} {filteredPlaces.length === 1 ? 'espacio' : 'espacios'}</span>
        {pageCount > 1 && <nav className="ad-pager" aria-label="Paginación de espacios">
          <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="Página anterior">‹</button>
          {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
            <button key={pageNumber} type="button" className={currentPage === pageNumber ? 'is-on' : ''} aria-current={currentPage === pageNumber ? 'page' : undefined} onClick={() => setPage(pageNumber)}>{pageNumber}</button>
          ))}
          <button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} aria-label="Página siguiente">›</button>
        </nav>}
      </footer>
    </div>

    {selectedIds.size > 0 && <div className="ad-bulk" role="status">
      <b>{selectedIds.size} {selectedIds.size === 1 ? 'seleccionado' : 'seleccionados'}</b>
      <button type="button" className="ad-btn ad-btn--ghost" onClick={() => void setSelectedPlacesActive(true)}>Activar</button>
      <button type="button" className="ad-btn ad-btn--ghost" onClick={() => void setSelectedPlacesActive(false)}>Desactivar</button>
      {deletePlaces && <button type="button" className="ad-btn ad-btn--danger" onClick={() => deletePlaces([...selectedIds])}>Eliminar</button>}
      <button type="button" className="ad-icon" onClick={() => setSelectedIds(new Set())} aria-label="Quitar selección"><i className="fa fa-times" aria-hidden="true" /></button>
    </div>}
    {editingId !== null && (
      <div
        className="admin-image-modal"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setEditingId(null)
        }}
      >
        <section className="admin-image-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-place-title">
          <div className="admin-image-dialog__heading">
            <div>
              <span className="admin-image-dialog__eyebrow">Lugares publicados</span>
              <h3 id="edit-place-title">Editar lugar</h3>
              <p>Actualiza la dirección y la imagen del espacio.</p>
            </div>
            <button type="button" className="admin-image-dialog__close" onClick={() => setEditingId(null)} aria-label="Cerrar">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m18 6-12 12M6 6l12 12" />
              </svg>
            </button>
          </div>
          <label className="place-image-picker__url-field" htmlFor="edit-place-address">
            <span>Dirección</span>
            <input
              id="edit-place-address"
              className="form-create-place-input"
              type="text"
              autoComplete="street-address"
              value={editingAddress}
              onChange={(event) => setEditingAddress(event.target.value)}
            />
          </label>
          <PlaceImagePicker id="edit-place-image" value={editingUrl} onChange={setEditingUrl} />
          <div className="admin-image-dialog__actions">
            <button className="btn btn-secondary" type="button" onClick={() => setEditingId(null)}>Cancelar</button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={async () => {
                await updatePlace(editingId, { direccion: editingAddress.trim() || null, image_url: editingUrl })
                setEditingId(null)
              }}
            >
              Guardar cambios
            </button>
          </div>
        </section>
      </div>
    )}
  </section>
}

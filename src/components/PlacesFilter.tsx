import React, { useState } from 'react'
import '../places-filter.css'
import WorkPalaceSelect from './WorkPalaceSelect'

interface Filters {
  search: string
  tipo: string
  ciudad: string
  barrio: string
  capacidad: string
  modalidad: string
  precioMin: string
  precioMax: string
  orden: string
}

interface PlacesFilterProps {
  onFilter: (filters: Filters) => void
  tipos?: string[]
  ciudades: string[]
  barrios: string[]
  modalidades: string[]
}


const PlacesFilter: React.FC<PlacesFilterProps> = ({ onFilter, tipos = [], ciudades, barrios, modalidades }) => {
  const [filters, setFilters] = useState<Filters>({
    search: '',
    tipo: '',
    ciudad: '',
    barrio: '',
    capacidad: '',
    modalidad: '',
    precioMin: '',
    precioMax: '',
    orden: 'recomendados',
  })
  const [showAdvanced, setShowAdvanced] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    const updated = { ...filters, [name]: value }
    setFilters(updated)
    onFilter(updated)
  }

  function handleSelectChange(name: keyof Filters, value: string) {
    const updated = { ...filters, [name]: value }
    setFilters(updated)
    onFilter(updated)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onFilter(filters)
  }

  function clearFilters() {
    const empty: Filters = { search: '', tipo: '', ciudad: '', barrio: '', capacidad: '', modalidad: '', precioMin: '', precioMax: '', orden: 'recomendados' }
    setFilters(empty)
    onFilter(empty)
  }

  const activeFilterCount = [filters.tipo, filters.ciudad, filters.barrio, filters.capacidad, filters.modalidad, filters.precioMin, filters.precioMax]
    .filter(Boolean).length
  const hasActiveFilters = Boolean(filters.search || activeFilterCount)

  return (
    <form className="places-filter-form" onSubmit={handleSubmit}>
      <div className="places-filter-controls">
        <div className="google-search-bar">
          <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="11" cy="11" r="5.5" />
            <path d="M16 16L21 21" />
          </svg>
          <input
            type="text"
            name="search"
            placeholder="Buscar espacio..."
            value={filters.search}
            onChange={handleChange}
            autoComplete="off"
          />
        </div>
        <div className="places-filter-actions">
          <button
            type="button"
            className="btn btn-secondary"
            aria-expanded={showAdvanced}
            aria-controls="places-advanced-filters"
            onClick={() => setShowAdvanced(v => !v)}
          >
            {showAdvanced ? 'Ocultar filtros' : 'Filtros'}
            {activeFilterCount > 0 && <span className="places-filter-count">{activeFilterCount}</span>}
          </button>
          <button type="submit" className="btn btn-primary places-filter-search">Buscar espacios</button>
          <button type="button" className="btn btn-secondary places-filter-clear-desktop" onClick={clearFilters}>Limpiar</button>
        </div>
      </div>
      {hasActiveFilters && (
        <button type="button" className="places-filter-clear-mobile" onClick={clearFilters}>
          Limpiar búsqueda
        </button>
      )}
      {showAdvanced && (
        <div id="places-advanced-filters" className="advanced-filters">
          <WorkPalaceSelect className="wp-select--places-filter" value={filters.tipo} options={[{ value: '', label: 'Tipo de espacio' }, ...tipos.map((tipo) => ({ value: tipo, label: tipo }))]} onChange={(value) => handleSelectChange('tipo', value)} ariaLabel="Tipo de espacio" />
          <WorkPalaceSelect className="wp-select--places-filter" value={filters.ciudad} options={[{ value: '', label: 'Ciudad' }, ...ciudades.map((city) => ({ value: city, label: city }))]} onChange={(value) => handleSelectChange('ciudad', value)} ariaLabel="Ciudad" />
          <WorkPalaceSelect className="wp-select--places-filter" value={filters.barrio} options={[{ value: '', label: 'Barrio' }, ...barrios.map((neighborhood) => ({ value: neighborhood, label: neighborhood }))]} onChange={(value) => handleSelectChange('barrio', value)} ariaLabel="Barrio" />
          <input
            type="number"
            name="capacidad"
            placeholder="Capacidad"
            value={filters.capacidad}
            onChange={handleChange}
            style={{ flex: 1, minWidth: 100 }}
            min={1}
          />
          <WorkPalaceSelect className="wp-select--places-filter" value={filters.modalidad} options={[{ value: '', label: 'Modalidad' }, ...modalidades.map((modality) => ({ value: modality, label: modality }))]} onChange={(value) => handleSelectChange('modalidad', value)} ariaLabel="Modalidad" />
          <input type="number" name="precioMin" min={0} placeholder="Precio mínimo" value={filters.precioMin} onChange={handleChange} />
          <input type="number" name="precioMax" min={0} placeholder="Precio máximo" value={filters.precioMax} onChange={handleChange} />
          <WorkPalaceSelect className="wp-select--places-filter" value={filters.orden} options={[
            { value: 'recomendados', label: 'Orden recomendado' },
            { value: 'precio-asc', label: 'Menor precio' },
            { value: 'precio-desc', label: 'Mayor precio' },
            { value: 'calificacion', label: 'Mejor calificados' },
          ]} onChange={(value) => handleSelectChange('orden', value)} ariaLabel="Ordenar espacios" />
        </div>
      )}
    </form>
  )
}

export default PlacesFilter

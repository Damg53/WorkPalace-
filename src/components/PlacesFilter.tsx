import React, { useState } from 'react'
import '../places-filter.css'

interface Filters {
  search: string
  tipo?: string
  ciudad: string
  barrio: string
  capacidad: string
  modalidad: string
}

interface PlacesFilterProps {
  onFilter: (filters: Filters) => void
  tipos?: string[]
  ciudades: string[]
  barrios: string[]
  modalidades: string[]
}


const PlacesFilter: React.FC<PlacesFilterProps> = ({ onFilter, /*tipos,*/ ciudades, barrios, modalidades }) => {
  const [filters, setFilters] = useState<Filters>({
    search: '',
    // tipo: '',
    ciudad: '',
    barrio: '',
    capacidad: '',
    modalidad: '',
  })
  const [showAdvanced, setShowAdvanced] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    const updated = { ...filters, [name]: value }
    setFilters(updated)
    onFilter(updated)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onFilter(filters)
  }

  function clearFilters() {
    const empty: Filters = { search: '', ciudad: '', barrio: '', capacidad: '', modalidad: '' }
    setFilters(empty)
    onFilter(empty)
  }

  const activeFilterCount = [filters.ciudad, filters.barrio, filters.capacidad, filters.modalidad]
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
          <select name="ciudad" value={filters.ciudad} onChange={handleChange} style={{ flex: 1, minWidth: 120 }}>
            <option value="">Ciudad</option>
            {ciudades.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select name="barrio" value={filters.barrio} onChange={handleChange} style={{ flex: 1, minWidth: 120 }}>
            <option value="">Barrio</option>
            {barrios.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <input
            type="number"
            name="capacidad"
            placeholder="Capacidad"
            value={filters.capacidad}
            onChange={handleChange}
            style={{ flex: 1, minWidth: 100 }}
            min={1}
          />
          <select name="modalidad" value={filters.modalidad} onChange={handleChange} style={{ flex: 1, minWidth: 120 }}>
            <option value="">Modalidad</option>
            {modalidades.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      )}
    </form>
  )
}

export default PlacesFilter

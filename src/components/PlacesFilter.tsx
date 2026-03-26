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
    setFilters(prev => {
      const updated = { ...prev, [name]: value }
      onFilter(updated)
      return updated
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onFilter(filters)
  }

  return (
    <form className="places-filter-form" onSubmit={handleSubmit} style={{ flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <div className="google-search-bar" style={{ flex: 1 }}>
          <span className="search-icon" role="img" aria-label="Buscar">🔍</span>
          <input
            type="text"
            name="search"
            placeholder="Buscar espacio..."
            value={filters.search}
            onChange={handleChange}
            autoComplete="off"
          />
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ marginLeft: '1rem', minWidth: 100 }}
          onClick={() => setShowAdvanced(v => !v)}
        >
          {showAdvanced ? 'Ocultar filtros' : 'Filtros'}
        </button>
        <button type="submit" className="btn btn-primary" style={{ marginLeft: '1rem', minWidth: 100 }}>Buscar</button>
      </div>
      {showAdvanced && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem', width: '100%' }}>
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

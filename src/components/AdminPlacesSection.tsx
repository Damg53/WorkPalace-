import { useState } from 'react'
import CapacidadCellInput from './CapacidadCellInput'
import type { AdminPlace, NewPlaceForm } from './adminTypes'

interface Props {
  places: AdminPlace[]
  updatePlace: (id: number, payload: Partial<AdminPlace>) => void
  togglePlaceActive: (id: number, active: boolean) => void
  deletePlace: (id: number) => void
  createPlace: (place: Omit<AdminPlace, 'id' | 'active'>) => Promise<void>
}

const TIPOS = ['Coworking', 'Oficina privada', 'Sala de reuniones', 'Auditorio / salón de eventos', 'Aula / salón de clases', 'Estudio de grabación', 'Estudio de fotografía', 'Sala de ensayo', 'Taller de carpintería', 'Taller / maker space', 'Cocina industrial', 'Cocina oculta (dark kitchen)', 'Consultorio', 'Gimnasio / sala de entrenamiento', 'Cancha / espacio deportivo', 'Terraza / rooftop', 'Patio / jardín', 'Bodega / almacén', 'Local comercial', 'Otro']
const CIUDADES = ['Medellín', 'Bello', 'Envigado', 'Sabaneta', 'Itagüí', 'Bogotá', 'Cali', 'Barranquilla', 'Cartagena', 'Bucaramanga', 'Pereira', 'Manizales', 'Santa Marta', 'Cúcuta', 'Otra']
const MODALIDADES = ['Por hora', 'Media jornada (4 horas)', 'Jornada completa (8 horas)', 'Por día', 'Por noche', 'Por semana', 'Por 15 días', 'Por mes', 'Solo por cita', 'Flexible (acordar con el propietario)']
const RUIDO = ['Silencioso (ideal para concentración)', 'Moderado (conversación normal)', 'Alto (actividad intensa)', 'Muy alto (industrial / eventos)', 'Aislado acústicamente', 'No aplica']
const BARRIOS: Record<string, string[]> = {
  Medellín: ['El Poblado', 'Laureles - Estadio', 'Belén', 'Robledo', 'Buenos Aires', 'La América', 'San Javier', 'Aranjuez', 'Manrique', 'Castilla', 'Centro', 'Otro / No aplica'],
  Bello: ['Centro', 'Niquía', 'Zamora', 'Santa Ana', 'Otro / No aplica'],
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
const EMPTY: NewPlaceForm = { name: '', tipo: '', barrio: '', ciudad: '', capacidad: '', precio_hora: '', modalidad: '', caracteristicas: '', nivel_ruido: '', image_url: '' }

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

  const barrioPriceFactor: Record<string, number> = {
    'El Poblado': 1.35,
    'Laureles - Estadio': 1.2,
    Belén: 1.15,
    'Centro': 1.08,
    'Robledo': 0.96,
    'Buenos Aires': 0.95,
    'La América': 1.02,
    'San Javier': 0.94,
    'Manrique': 0.93,
    'Castilla': 0.92,
    'Niquía': 1.1,
    'Zamora': 0.98,
    'Santa Ana': 1,
    'El Dorado': 1.08,
    'San Marcos': 1.04,
    'La Magnolia': 1.02,
    'San Joaquín': 1.08,
    'Aliadas': 1.03,
    'Ditaires': 0.96,
    'San Pío': 0.98,
    'Santa María': 0.94,
    'Chapinero': 1.22,
    'Usaquén': 1.18,
    'Teusaquillo': 1.14,
    'Suba': 1.06,
    'Kennedy': 1,
    'San Fernando': 1.1,
    'El Peñón': 1.08,
    'Cristóbal Colón': 1.04,
    'La Flora': 1,
    'El Prado': 1.08,
    'Villa Santos': 0.98,
    'Norte-Centro': 1.05,
    'El Laguito': 1.2,
    'Getsemaní': 1.15,
    'Castillo Grande': 1.14,
    'La Boquilla': 0.97,
    'Girón': 1.12,
    'Cabecera': 1.04,
    'El Socorro': 0.94,
    'San Jorge': 1.02,
    'La Florida': 0.96,
    'La Nubia': 0.96,
    'Villamil': 0.92,
    'Chipre': 0.94,
    'Rodadero': 1.16,
    'Taganga': 1.12,
    'Gaira': 1.08,
    'La Libertad': 0.96,
    'San Mateo': 0.93,
    'Guayabal': 0.9,
    'Otro / No aplica': 0.88,
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

export default function AdminPlacesSection({ places, updatePlace, togglePlaceActive, deletePlace, createPlace }: Props) {
  const [form, setForm] = useState(EMPTY)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingUrl, setEditingUrl] = useState('')
  const setField = (field: keyof NewPlaceForm, value: string) => setForm((current) => ({ ...current, [field]: value }))
  const stopWheel = (event: React.WheelEvent<HTMLInputElement>) => event.currentTarget.blur()
  const readImage = (file: File | undefined, onRead: (value: string) => void) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => onRead(String(event.target?.result || ''))
    reader.readAsDataURL(file)
  }

  const suggestedPrice = getSuggestedPrice(form.tipo, form.ciudad, form.barrio, form.capacidad, form.modalidad)

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    if (!form.name || !form.tipo) return
    const finalPrice = Number(form.precio_hora || suggestedPrice)
    try {
      await createPlace({ ...form, barrio: form.barrio || null, ciudad: form.ciudad || null, capacidad: form.capacidad || null, precio_hora: Number.isFinite(finalPrice) ? finalPrice : null, modalidad: form.modalidad || null, caracteristicas: form.caracteristicas || null, nivel_ruido: form.nivel_ruido || null, image_url: form.image_url || null })
      setForm(EMPTY)
      setShowForm(false)
    } catch {
      // El hook informa los errores de red al panel principal.
    }
  }

  return <section className="users-section" id="places" style={{ marginTop: '3rem' }}>
    <div className="admin-section-heading"><h2>Lugares publicados</h2><button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancelar' : '+ Crear nuevo lugar'}</button></div>
    {showForm && <form onSubmit={handleCreate} className="form-create-place"><h3>Crear Nuevo Lugar</h3><div className="form-create-place-grid">
      <input className="form-create-place-input" placeholder="Nombre *" value={form.name} onChange={(e) => setField('name', e.target.value)} required />
      <select className="form-create-place-input" value={form.tipo} onChange={(e) => setField('tipo', e.target.value)} required><option value="">Tipo *</option>{TIPOS.map((item) => <option key={item}>{item}</option>)}</select>
      <select className="form-create-place-input" value={form.ciudad} onChange={(e) => setField('ciudad', e.target.value)}><option value="">Ciudad</option>{CIUDADES.map((item) => <option key={item}>{item}</option>)}</select>
      <select className="form-create-place-input" value={form.barrio} onChange={(e) => setField('barrio', e.target.value)} disabled={!form.ciudad}><option value="">Barrio</option>{(BARRIOS[form.ciudad] || []).map((item) => <option key={item}>{item}</option>)}</select>
      <input className="form-create-place-input" placeholder="Capacidad" value={form.capacidad} onChange={(e) => setField('capacidad', e.target.value)} />
      <input
        className="form-create-place-input"
        type="number"
        placeholder="Precio sugerido"
        value={form.precio_hora || String(Math.round(suggestedPrice))}
        onChange={(e) => setField('precio_hora', e.target.value)}
        onWheel={stopWheel}
      />
      <select className="form-create-place-input" value={form.modalidad} onChange={(e) => setField('modalidad', e.target.value)}><option value="">Modalidad</option>{MODALIDADES.map((item) => <option key={item}>{item}</option>)}</select>
      <select className="form-create-place-input" value={form.nivel_ruido} onChange={(e) => setField('nivel_ruido', e.target.value)}><option value="">Nivel de ruido</option>{RUIDO.map((item) => <option key={item}>{item}</option>)}</select>
      <textarea className="form-create-place-textarea form-create-place-full-width" placeholder="Características" value={form.caracteristicas} onChange={(e) => setField('caracteristicas', e.target.value)} />
      {form.tipo && form.ciudad && form.modalidad && (
        <div className="form-create-place-full-width" style={{ color: '#dfe7ff', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          Precio sugerido: <strong>{formatPriceForModality(suggestedPrice, form.modalidad)}</strong>
        </div>
      )}
      <div className="form-create-place-full-width"><input className="form-create-place-input" placeholder="URL de imagen" value={form.image_url} onChange={(e) => setField('image_url', e.target.value)} /><input type="file" accept="image/*" onChange={(e) => readImage(e.target.files?.[0], (value) => setField('image_url', value))} /></div>
    </div><button type="submit" className="btn btn-primary">Crear Lugar</button></form>}
    {places.length === 0 ? <p className="admin-empty-state">No hay lugares registrados.</p> : <div className="users-table-wrapper"><table className="users-table"><thead><tr><th>ID</th><th>Nombre</th><th>Tipo</th><th>Barrio</th><th>Ciudad</th><th>Capacidad</th><th>Precio base</th><th>Modalidad</th><th>Activo</th><th>Acciones</th></tr></thead><tbody>
      {places.map((place) => <tr key={place.id}><td>#{place.id}</td><td><input className="table-input" defaultValue={place.name}
       onBlur={(e) => updatePlace(place.id, { name: e.target.value })} 
       /></td><td><select className="table-select" defaultValue={place.tipo || ''} onChange={(e) => updatePlace(place.id, { tipo: e.target.value })}>{TIPOS.map((item) => 
       <option key={item}>{item}</option>)}</select></td><td><select className="table-select" defaultValue={place.barrio || ''} onChange={(e) => updatePlace(place.id, { barrio: e.target.value })}>{(BARRIOS[place.ciudad || 'Medellín'] || []).map((item) => 
       <option key={item}>{item}</option>)}</select></td><td><select className="table-select" defaultValue={place.ciudad || ''} onChange={(e) => updatePlace(place.id, { ciudad: e.target.value })}>{CIUDADES.map((item) => 
       <option key={item}>{item}</option>)}</select></td><td><CapacidadCellInput value={place.capacidad || ''} onSave={(value) => updatePlace(place.id, { capacidad: value })} /></td><td><div style={{ fontWeight: 600, color: '#374151' }}>{formatPriceForModality(place.precio_hora, place.modalidad)}
       </div></td><td><select className="table-select" defaultValue={place.modalidad || ''} onChange={(e) => updatePlace(place.id, { modalidad: e.target.value })}>{MODALIDADES.map((item) => <option key={item}>{item}</option>)}</select></td><td><input type="checkbox" checked={place.active !== false} onChange={(e) => togglePlaceActive(place.id, e.target.checked)} 
       /></td><td><button className="btn btn-secondary" onClick={() => { setEditingId(place.id); setEditingUrl(place.image_url || '') }}>Imagen</button> <button className="user-delete-button" onClick={() => deletePlace(place.id)}>Eliminar</button></td></tr>)}
    </tbody></table></div>}
    {editingId !== null && <div className="admin-image-modal"><div className="admin-image-dialog"><h3>Editar imagen del lugar</h3><input value={editingUrl} onChange={(e) => setEditingUrl(e.target.value)} placeholder="URL de la imagen" /><input type="file" accept="image/*" onChange={(e) => readImage(e.target.files?.[0], setEditingUrl)} />{editingUrl && <img src={editingUrl} alt="Vista previa" />}<div><button className="btn btn-secondary" onClick={() => setEditingId(null)}>Cancelar</button><button className="btn btn-primary" onClick={async () => { await updatePlace(editingId, { image_url: editingUrl }); setEditingId(null) }}>Guardar</button></div></div></div>}
  </section>
}

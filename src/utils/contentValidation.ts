const PROFANITY_TERMS = [
  'asshole', 'bastardo', 'bitch', 'cabron', 'cagada', 'carechimba',
  'chucha', 'cono', 'fuck', 'gonorrea', 'gonorreas', 'hijueputa',
  'hijueputas', 'hp', 'idiota', 'malparida', 'malparidas', 'malparido',
  'malparidos', 'marica', 'maricas', 'maricon', 'maricones', 'mierda',
  'mierdas', 'pendeja', 'pendejas', 'pendejo', 'pendejos', 'perra',
  'perras', 'puta', 'putas', 'puto', 'putos', 'verga', 'vergas','zorra', 'zorras',
  'culo', 'culos', 'culo', 'culos', 'cagada', 'picha', 'pichas', 'pichula', 'pichulas', 'pichulita', 'pichulitas',
  'cuca','triple hp','triple hijueeputa','pene','penes','vagina','vaginas','polla','pollas','monda','semen'
  
]

export function containsProfanity(value: string) {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  return PROFANITY_TERMS.some((term) => {
    const pattern = term.split('').join('[^a-z0-9]*')
    return new RegExp(`(^|[^a-z0-9])${pattern}($|[^a-z0-9])`).test(normalized)
  })
}

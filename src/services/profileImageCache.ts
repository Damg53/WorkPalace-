const DATABASE_NAME = 'workpalace-profile-cache'
const STORE_NAME = 'profile-images'
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir la caché local de imágenes.'))
  })
}

export async function saveCachedProfileImage(userId: number, image: Blob): Promise<void> {
  if (!image.type.startsWith('image/') || image.size === 0 || image.size > MAX_IMAGE_BYTES) {
    throw new Error('La imagen local no es válida o supera el límite de 5 MB.')
  }

  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(image, userId)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('No se pudo guardar la copia local de la foto.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Se canceló el guardado local de la foto.'))
  })
  database.close()
}

export async function loadCachedProfileImage(userId: number): Promise<string | null> {
  const database = await openDatabase()
  const image = await new Promise<Blob | undefined>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(userId)
    request.onsuccess = () => resolve(request.result as Blob | undefined)
    request.onerror = () => reject(request.error ?? new Error('No se pudo leer la copia local de la foto.'))
  })
  database.close()

  if (!image) return null
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('No se pudo recuperar la copia local de la foto.'))
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer la copia local de la foto.'))
    reader.readAsDataURL(image)
  })
}

export async function cacheProfileImageFromUrl(userId: number, url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`No se pudo descargar la foto de perfil (${response.status}).`)
  const image = await response.blob()
  await saveCachedProfileImage(userId, image)
  return loadCachedProfileImage(userId).then((cachedImage) => {
    if (!cachedImage) throw new Error('No se pudo recuperar la foto guardada localmente.')
    return cachedImage
  })
}

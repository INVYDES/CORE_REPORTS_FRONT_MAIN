/**
 * Prepara una foto para enviarla como data URL base64 al backend.
 *
 * El backend solo guarda JPEG, PNG y WEBP de hasta ~5 MB: cualquier otro
 * formato (HEIC de iPhone, GIF, BMP…) se descartaba sin avisar. Aquí se
 * convierte a JPEG (y se reduce si pesa demasiado) para que la foto llegue.
 */

const FORMATOS_SOPORTADOS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
/** Tamaño máximo del archivo de imagen que acepta el backend. */
export const MAX_IMAGEN_BYTES = 5 * 1024 * 1024
const LADO_MAXIMO = 2560

export class ImagenNoSoportadaError extends Error {}

const leerComoDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = evt => resolve(String(evt.target?.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

const cargarImagen = (blob: Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new ImagenNoSoportadaError('El navegador no pudo leer la imagen.'))
    }
    img.src = url
  })

/** Bytes aproximados del contenido de una data URL base64. */
const bytesDeDataUrl = (dataUrl: string) =>
  Math.ceil(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4)

/**
 * HEIC/HEIF (fotos de iPhone). En Windows/Chrome el navegador a menudo deja
 * `type` vacío, así que también se revisa la extensión.
 */
export const esHeic = (file: Blob): boolean => {
  const tipo = (file.type || '').toLowerCase()
  const nombre = 'name' in file ? String((file as File).name).toLowerCase() : ''
  return (
    tipo === 'image/heic' ||
    tipo === 'image/heif' ||
    tipo === 'image/heic-sequence' ||
    tipo === 'image/heif-sequence' ||
    /\.(heic|heif)$/.test(nombre)
  )
}

/**
 * Decodifica un HEIC a JPEG con libheif (WebAssembly). Solo Safari lee HEIC de
 * forma nativa; Chrome, Edge y Firefox necesitan este decodificador. Se carga
 * bajo demanda (~3 MB) para no pesar en la carga normal de la app. Se usa la
 * variante `csp`, que no requiere 'unsafe-eval'.
 */
async function heicAJpeg(file: Blob): Promise<Blob> {
  const { heicTo } = await import('heic-to/csp')
  return heicTo({ blob: file, type: 'image/jpeg', quality: 0.9 })
}

/**
 * Devuelve una data URL JPEG/PNG/WEBP de como máximo MAX_IMAGEN_BYTES.
 * Lanza ImagenNoSoportadaError si la imagen no se puede decodificar.
 */
export async function imagenADataUrl(file: Blob): Promise<string> {
  const tipo = (file.type || '').toLowerCase()
  if (FORMATOS_SOPORTADOS.includes(tipo) && file.size <= MAX_IMAGEN_BYTES) {
    return leerComoDataUrl(file)
  }

  let fuente: Blob = file
  if (esHeic(file)) {
    try {
      fuente = await heicAJpeg(file)
    } catch {
      // Último intento con el decodificador nativo (Safari).
      fuente = file
    }
    if (fuente.type === 'image/jpeg' && fuente.size <= MAX_IMAGEN_BYTES) {
      return leerComoDataUrl(fuente)
    }
  }

  const img = await cargarImagen(fuente)
  let escala = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth || 1, img.naturalHeight || 1))
  let calidad = 0.85

  for (let intento = 0; intento < 6; intento++) {
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * escala))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * escala))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new ImagenNoSoportadaError('No se pudo procesar la imagen.')
    // Fondo blanco: JPEG no tiene transparencia.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    const dataUrl = canvas.toDataURL('image/jpeg', calidad)
    if (dataUrl.startsWith('data:image/jpeg') && bytesDeDataUrl(dataUrl) <= MAX_IMAGEN_BYTES) {
      return dataUrl
    }
    escala *= 0.75
    calidad = Math.max(0.6, calidad - 0.1)
  }

  throw new ImagenNoSoportadaError('La imagen es demasiado grande.')
}

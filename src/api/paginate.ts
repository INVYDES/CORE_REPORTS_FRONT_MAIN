import client from './client'

/** Tamaño de página máximo que acepta el backend (per_page se limita a 100). */
const PER_PAGE = 100
/** Tope de seguridad: 50 páginas = 5 000 registros. */
const MAX_PAGES = 50
/** Páginas pedidas en paralelo tras la primera. */
const CONCURRENCIA = 4

export interface ListaCompleta<T> {
  data: T[]
  total: number
  /** true si se alcanzó MAX_PAGES y quedaron registros sin cargar. */
  truncado: boolean
}

const extraer = <T>(payload: any): T[] => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

/**
 * Descarga todas las páginas de un endpoint paginado de Laravel.
 *
 * El backend nunca devuelve más de 100 registros por página, así que pedir
 * per_page=500 y leer solo la primera respuesta deja fuera el resto.
 * Devuelve la misma forma `{ data }` que un paginador, para que las vistas
 * que hacen `res.data || res` sigan funcionando.
 */
export async function getAllPages<T = any>(
  url: string,
  params: Record<string, unknown> = {},
  http: { get: typeof client.get } = client
): Promise<ListaCompleta<T>> {
  const base = { ...params, per_page: PER_PAGE }
  const primera = await http.get(url, { params: { ...base, page: 1 } }).then(r => r.data)

  const items = extraer<T>(primera)
  const lastPage = Number(primera?.last_page ?? primera?.meta?.last_page ?? 1) || 1
  const total = Number(primera?.total ?? primera?.meta?.total ?? items.length) || items.length
  const hasta = Math.min(lastPage, MAX_PAGES)

  for (let inicio = 2; inicio <= hasta; inicio += CONCURRENCIA) {
    const paginas = []
    for (let page = inicio; page < inicio + CONCURRENCIA && page <= hasta; page++) {
      paginas.push(http.get(url, { params: { ...base, page } }).then(r => extraer<T>(r.data)))
    }
    for (const lote of await Promise.all(paginas)) items.push(...lote)
  }

  return { data: items, total, truncado: lastPage > MAX_PAGES }
}

import { computed, ref, watch, type Ref } from 'vue'

/**
 * Paginación en pantalla de una lista ya filtrada.
 *
 * Las listas descargan todos los registros (los filtros y el estatus
 * "resuelto" se calculan en el navegador), pero pintar miles de filas a la vez
 * hacía lenta la vista. Aquí solo se renderiza la página actual.
 */
export function usePaginacion<T>(items: Ref<T[]>, porPagina = 25) {
  const pagina = ref(1)

  const total = computed(() => items.value.length)
  const totalPaginas = computed(() => Math.max(1, Math.ceil(total.value / porPagina)))
  const desde = computed(() => (total.value === 0 ? 0 : (pagina.value - 1) * porPagina + 1))
  const hasta = computed(() => Math.min(pagina.value * porPagina, total.value))
  const visibles = computed(() =>
    items.value.slice((pagina.value - 1) * porPagina, pagina.value * porPagina)
  )

  // Un filtro nuevo (o recargar datos) devuelve a la primera página.
  watch(items, () => {
    pagina.value = 1
  })

  const irA = (n: number) => {
    pagina.value = Math.min(Math.max(1, Math.floor(n)), totalPaginas.value)
  }

  return { pagina, total, totalPaginas, desde, hasta, visibles, irA }
}

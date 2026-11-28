import { describe, it, expect } from 'vitest'
import { nextTick, ref } from 'vue'
import { usePaginacion } from './usePaginacion'

describe('usePaginacion', () => {
  it('muestra solo la página actual y calcula el rango', () => {
    const items = ref(Array.from({ length: 60 }, (_, i) => i + 1))
    const p = usePaginacion(items, 25)

    expect(p.visibles.value).toHaveLength(25)
    expect(p.totalPaginas.value).toBe(3)

    p.irA(3)
    expect(p.visibles.value).toEqual(Array.from({ length: 10 }, (_, i) => i + 51))
    expect(p.desde.value).toBe(51)
    expect(p.hasta.value).toBe(60)
  })

  it('limita la página al rango válido', () => {
    const p = usePaginacion(ref([1, 2, 3]), 2)
    p.irA(99)
    expect(p.pagina.value).toBe(2)
    p.irA(-4)
    expect(p.pagina.value).toBe(1)
  })

  it('vuelve a la primera página cuando cambia la lista filtrada', async () => {
    const items = ref(Array.from({ length: 50 }, (_, i) => i))
    const p = usePaginacion(items, 10)
    p.irA(4)

    items.value = items.value.filter(n => n % 2 === 0)
    await nextTick()

    expect(p.pagina.value).toBe(1)
    expect(p.total.value).toBe(25)
  })

  it('con lista vacía reporta 0 registros', () => {
    const p = usePaginacion(ref<number[]>([]))
    expect(p.total.value).toBe(0)
    expect(p.desde.value).toBe(0)
    expect(p.totalPaginas.value).toBe(1)
  })
})

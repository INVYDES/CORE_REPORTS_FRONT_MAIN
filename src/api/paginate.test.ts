import { describe, it, expect, vi } from 'vitest'
import { getAllPages } from './paginate'

vi.mock('./client', () => ({ default: { get: vi.fn() } }))

const pagina = (page: number, lastPage: number, ids: number[]) => ({
  data: { data: ids.map(id => ({ id })), current_page: page, last_page: lastPage, total: 250 },
})

describe('getAllPages', () => {
  it('descarga todas las páginas con per_page=100', async () => {
    const http = {
      get: vi.fn((_url: string, { params }: any) =>
        Promise.resolve(
          pagina(params.page, 3, params.page === 3 ? [201, 202] : [params.page * 100])
        )
      ),
    }

    const res = await getAllPages('/tickets', { area_id: 5, per_page: 500 }, http as any)

    expect(res.data.map(x => (x as any).id)).toEqual([100, 200, 201, 202])
    expect(res.total).toBe(250)
    expect(res.truncado).toBe(false)
    expect(http.get).toHaveBeenCalledTimes(3)
    for (const call of http.get.mock.calls) {
      expect(call[1].params.per_page).toBe(100)
      expect(call[1].params.area_id).toBe(5)
    }
  })

  it('acepta respuestas sin paginar (arreglo plano)', async () => {
    const http = { get: vi.fn().mockResolvedValue({ data: [{ id: 1 }, { id: 2 }] }) }

    const res = await getAllPages('/x', {}, http as any)

    expect(res.data).toHaveLength(2)
    expect(http.get).toHaveBeenCalledTimes(1)
  })
})

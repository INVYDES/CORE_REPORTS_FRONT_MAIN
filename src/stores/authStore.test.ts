import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore, ROLES } from './authStore'

vi.mock('../api/client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    defaults: { headers: { common: {} } },
  },
}))

describe('authStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
    localStorage.clear()
  })

  it('fetchMe no cierra la sesión por un error de red o 500', async () => {
    const client = (await import('../api/client')).default as any
    sessionStorage.setItem('token', 'tok')
    sessionStorage.setItem('user', JSON.stringify({ id: 1, rol: 1, email: 'a@b.com' }))
    const store = useAuthStore()

    client.get.mockRejectedValueOnce({ response: { status: 500 } })
    await store.fetchMe()
    expect(store.isAuthenticated).toBe(true)

    client.get.mockRejectedValueOnce({ response: { status: 401 } })
    await store.fetchMe()
    expect(store.isAuthenticated).toBe(false)
  })

  it('inicia sin usuario', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)
    expect(store.currentUser).toBeNull()
  })

  it('login establece token, usuario y cookie, y logout la limpia', async () => {
    const client = (await import('../api/client')).default as any
    client.post.mockResolvedValue({
      data: {
        user: {
          id: 1,
          dependencia_id: 1,
          rol: 1,
          nombre: 'Admin',
          apellidos: 'Tec',
          email: 'a@b.com',
          estado: true,
        },
        token: 'abc123',
      },
    })
    const store = useAuthStore()
    const user = await store.login('a@b.com', 'password')
    expect(user.email).toBe('a@b.com')
    expect(store.isAuthenticated).toBe(true)
    expect(sessionStorage.getItem('token')).toBe('abc123')
    expect(sessionStorage.getItem('user')).toContain('a@b.com')
    // Cookie indicadora para el worker: existe pero no contiene el token
    expect(document.cookie).toContain('jwt=1')
    expect(document.cookie).not.toContain('abc123')
    // Ahora logout
    await store.logout()
    expect(store.isAuthenticated).toBe(false)
    expect(sessionStorage.getItem('token')).toBeNull()
    // La cookie JWT debe haber sido eliminada
    expect(document.cookie).not.toContain('jwt=')
  })

  it('migra token legacy de localStorage', () => {
    localStorage.setItem('jwt', 'legacy-token')
    const store = useAuthStore()
    expect(store.token).toBe('legacy-token')
    expect(sessionStorage.getItem('token')).toBe('legacy-token')
  })

  it('hasRole e isAdmin reflejan el rol del usuario', async () => {
    const client = (await import('../api/client')).default as any
    client.post.mockResolvedValue({
      data: {
        user: {
          id: 2,
          dependencia_id: 1,
          rol: ROLES.ADMIN_COM,
          nombre: 'A',
          apellidos: 'C',
          email: 'ac@b.com',
          estado: true,
        },
        token: 't2',
      },
    })
    const store = useAuthStore()
    await store.login('ac@b.com', 'password')

    expect(store.hasRole(ROLES.ADMIN_COM)).toBe(true)
    expect(store.isAdmin).toBe(true)
    expect(store.isTecnico).toBe(false)
  })

  it('logout limpia la sesión', async () => {
    const client = (await import('../api/client')).default as any
    client.post.mockResolvedValueOnce({
      data: {
        user: {
          id: 3,
          dependencia_id: 1,
          rol: 3,
          nombre: 'T',
          apellidos: 'U',
          email: 't@b.com',
          estado: true,
        },
        token: 't3',
      },
    })
    client.post.mockResolvedValueOnce({ data: {} })
    const store = useAuthStore()
    await store.login('t@b.com', 'password')
    expect(store.isAuthenticated).toBe(true)

    await store.logout()
    expect(store.isAuthenticated).toBe(false)
    expect(sessionStorage.getItem('token')).toBeNull()
  })
})

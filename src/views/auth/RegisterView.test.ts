import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const { toast, push, getMock, postMock } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  push: vi.fn(),
  getMock: vi.fn(),
  postMock: vi.fn(),
}))

vi.mock('vue-toastification', () => ({ useToast: () => toast }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('../../api/client', () => ({
  default: {
    // El authStore escribe el token en este objeto al aplicar la sesión.
    defaults: { headers: { common: {} as Record<string, string> } },
    get: (...args: any[]) => getMock(...args),
    post: (...args: any[]) => postMock(...args),
  },
}))

import RegisterView from './RegisterView.vue'

// Dos planes con el mismo `codigo` (como el catálogo de respaldo del backend):
// la selección debe distinguirlos por `token`, no colapsarlos.
const planes = [
  {
    codigo: 'trial',
    nombre: 'Gratis',
    tipo: 'trial',
    max_usuarios: 2,
    max_reportes_mensuales: 999999,
    precio: 0,
    precio_anual: null,
    dias_prueba: 0,
    descripcion: 'Plan gratuito para 2 usuarios',
    token: 'tok-trial',
  },
  {
    codigo: 'mensual',
    nombre: '5 usuarios - Mensual',
    tipo: 'mensual',
    max_usuarios: 5,
    max_reportes_mensuales: 999999,
    precio: 399,
    precio_anual: null,
    dias_prueba: 30,
    descripcion: '5 usuarios · $399 MXN al mes',
    token: 'tok-5m',
  },
  {
    codigo: 'mensual',
    nombre: '10 usuarios - Mensual',
    tipo: 'mensual',
    max_usuarios: 10,
    max_reportes_mensuales: 999999,
    precio: 699,
    precio_anual: null,
    dias_prueba: 30,
    descripcion: '10 usuarios · $699 MXN al mes',
    token: 'tok-10m',
  },
]

const usuario = {
  id: 1,
  dependencia_id: 1,
  numero_empleado: 'ADM-777',
  rol: 2,
  nombre: 'Ana',
  apellidos: 'Pérez',
  email: 'ana@empresa.mx',
  estado: true,
}

const montar = async () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(RegisterView, {
    global: {
      plugins: [pinia],
      stubs: {
        RouterLink: { template: '<a><slot /></a>' },
        'router-link': { template: '<a><slot /></a>' },
      },
    },
  })
  await flushPromises()
  return wrapper
}

const llenarFormulario = async (wrapper: ReturnType<typeof mount>) => {
  await wrapper.find('input[placeholder^="MATERIALES"]').setValue('Materiales del Norte S.A.')
  await wrapper.find('input[placeholder="ADM-001"]').setValue('ADM-777')
  await wrapper.find('input[type="email"]').setValue('ana@empresa.mx')
  await wrapper.find('input[autocomplete="new-password"]').setValue('secreto-123')
}

const payloadEnviado = () => postMock.mock.calls[0]![1] as Record<string, any>

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  getMock.mockResolvedValue({ data: { success: true, data: planes } })
})

describe('RegisterView', () => {
  it('carga los planes y preselecciona el gratuito', async () => {
    const wrapper = await montar()
    const select = wrapper.find('[data-test="plan-select"]')

    expect(getMock).toHaveBeenCalledWith('/licencias/disponibles')
    expect(select.findAll('option')).toHaveLength(planes.length + 1)
    expect(wrapper.text()).toContain('5 usuarios - Mensual')
    expect(wrapper.text()).toContain('10 usuarios - Mensual')
    expect((select.element as HTMLSelectElement).value).toBe('tok-trial')
  })

  it('envía el plan elegido por token aunque dos planes compartan codigo', async () => {
    postMock.mockResolvedValue({
      data: { requiere_pago: true, token: 'sesion', user: usuario, licencia: planes[2] },
    })
    const wrapper = await montar()

    await wrapper.find('[data-test="plan-select"]').setValue('tok-10m')
    await llenarFormulario(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(postMock).toHaveBeenCalledTimes(1)
    expect(postMock.mock.calls[0]![0]).toBe('/public/register-compania')
    expect(payloadEnviado()).toMatchObject({
      companyName: 'Materiales del Norte S.A.',
      numeroEmpleado: 'ADM-777',
      email: 'ana@empresa.mx',
      password: 'secreto-123',
      licenciaToken: 'tok-10m',
    })
    expect(payloadEnviado()).not.toHaveProperty('invoiceRequired')
    expect(wrapper.text()).toContain('Tu mes gratis está activo')
  })

  it('usa el catálogo de respaldo si la API de planes falla', async () => {
    getMock.mockRejectedValue(new Error('sin conexión'))
    postMock.mockResolvedValue({ data: { requiere_pago: true, licencia: planes[2] } })
    const wrapper = await montar()
    const select = wrapper.find('[data-test="plan-select"]')

    expect(select.findAll('option')).toHaveLength(8)
    await select.setValue('usuarios_10_mensual')
    await llenarFormulario(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(payloadEnviado()).toMatchObject({ licenciaId: 4 })
    expect(payloadEnviado().licenciaToken).toBeUndefined()
  })

  it('muestra el primer error de validación en vez del JSON crudo', async () => {
    postMock.mockRejectedValue({
      response: {
        status: 422,
        data: {
          message: 'The email has already been taken.',
          errors: { email: ['Ese correo ya está registrado.'] },
        },
      },
    })
    const wrapper = await montar()

    await llenarFormulario(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(toast.error).toHaveBeenCalledWith('Ese correo ya está registrado.')
    expect(toast.error).not.toHaveBeenCalledWith(expect.stringContaining('{'))
    expect(push).not.toHaveBeenCalled()
  })

  it('explica el límite de intentos cuando el backend responde 429', async () => {
    postMock.mockRejectedValue({
      response: { status: 429, headers: { 'retry-after': '60' }, data: {} },
    })
    const wrapper = await montar()

    await llenarFormulario(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(toast.error).toHaveBeenCalledWith(
      'Demasiados intentos. Espera 60 segundos e intenta de nuevo.'
    )
  })
})

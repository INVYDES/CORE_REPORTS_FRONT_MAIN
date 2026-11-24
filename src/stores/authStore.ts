import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import client from '../api/client'
import { getToken, getUser, setSession, clearSession } from '../api/session'

export interface UsuarioReal {
  id: number
  dependencia_id: number | null
  numero_empleado: string | null
  rol: number
  nombre: string
  apellidos: string
  email: string
  estado: boolean
  dependencia?: any
}

export interface VerificacionPendiente {
  requiere_verificacion: true
  email: string
  correo_enviado: boolean
  reenviar_en_segundos: number
  expira_en?: string | null
  message: string
}

export type LoginResponse = UsuarioReal | VerificacionPendiente

export const esVerificacionPendiente = (respuesta: LoginResponse): respuesta is VerificacionPendiente =>
  'requiere_verificacion' in respuesta

/** Roles del dominio (espejo del enum RolUsuario del backend). */
export const ROLES = {
  CLIENTE: 0,
  ADMIN_TEC: 1,
  ADMIN_COM: 2,
  TECNICO: 3,
  SUPER_ADMIN: 4,
} as const

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(getToken())
  const currentUser = ref<UsuarioReal | null>(getUser())
  const currentUserCompat = computed(() => {
    if (!currentUser.value) return null as any
    const u = currentUser.value
    return {
      ...u,
      idUsuario: u.id,
      idDependencia: u.dependencia_id,
      correo: u.email,
    }
  })

  const isAuthenticated = computed(() => !!token.value && !!currentUser.value)

  // Helpers de rol
  const hasRole = (...roles: number[]) =>
    !!currentUser.value && roles.includes(currentUser.value.rol)
  const isAdmin = computed(() => hasRole(ROLES.ADMIN_TEC, ROLES.ADMIN_COM))
  const isTecnico = computed(() => hasRole(ROLES.TECNICO))
  const isCliente = computed(() => hasRole(ROLES.CLIENTE))
  const isSuperAdmin = computed(() => hasRole(ROLES.SUPER_ADMIN))
  const isLicenciaVencida = computed(() => {
    if (!currentUser.value || isSuperAdmin.value) return false
    const dep = currentUser.value.dependencia
    if (!dep) return false
    if (dep.activa === false) return true
    if (!dep.fecha_expiracion) return false
    const fin = new Date(`${String(dep.fecha_expiracion).slice(0, 10)}T23:59:59`)
    return !Number.isNaN(fin.getTime()) && fin.getTime() < Date.now()
  })

  if (token.value) client.defaults.headers.common['Authorization'] = `Bearer ${token.value}`

  const setTokenHeader = (tkn: string | null) => {
    if (tkn) {
      client.defaults.headers.common['Authorization'] = `Bearer ${tkn}`
    } else {
      delete client.defaults.headers.common['Authorization']
    }
  }

  const applySession = (user: UsuarioReal, tkn: string) => {
    currentUser.value = user
    token.value = tkn
    setSession(tkn, user)
    setTokenHeader(tkn)
    // Set JWT cookie for edge workers detection (Secure, SameSite=Strict)
    try {
      const secure = window.location.protocol === 'https:' ? '; Secure' : ''
      document.cookie = `jwt=${tkn}; Path=/; SameSite=Strict${secure}`
    } catch (e) {
      console.warn('Unable to set JWT cookie', e)
    }
  }

  const login = async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await client.post('/login', { email, password })

    if (data.requiere_verificacion) {
      return {
        requiere_verificacion: true,
        email: data.email,
        correo_enviado: Boolean(data.correo_enviado),
        reenviar_en_segundos: Number(data.reenviar_en_segundos || 0),
        expira_en: data.expira_en,
        message: data.message,
      }
    }

    applySession(data.user, data.token)
    return data.user as UsuarioReal
  }

  const verificarCodigo = async (email: string, codigo: string) => {
    const { data } = await client.post('/auth/verificar-codigo', { email, codigo })
    applySession(data.user, data.token)
    return data.user as UsuarioReal
  }

  const verificarEnlace = async (token: string) => {
    const { data } = await client.post('/auth/verificar-enlace', { token })
    applySession(data.user, data.token)
    return data.user as UsuarioReal
  }

  const reenviarVerificacion = async (email: string) => {
    const { data } = await client.post('/auth/reenviar-verificacion', { email })
    return data as {
      message: string
      correo_enviado: boolean
      reenviar_en_segundos?: number
      expira_en?: string | null
    }
  }

  const olvidePassword = async (email: string) => {
    const { data } = await client.post('/auth/olvide-password', { email })
    return data as { message: string }
  }

  const resetPassword = async (payload: {
    email: string
    token: string
    password: string
    password_confirmation: string
  }) => {
    const { data } = await client.post('/auth/reset-password', payload)
    return data as { message: string }
  }

  /**
   * Limpia el estado local de sesión (token, usuario, storage, header y cookie)
   * sin llamar a la API. Necesario para que el guard de rutas no siga viendo la
   * sesión como activa cuando el token ya expiró (401).
   */
  const clearAuth = () => {
    token.value = null
    currentUser.value = null
    clearSession()
    setTokenHeader(null)
    // Remove JWT cookie
    try {
      const secure = window.location.protocol === 'https:' ? '; Secure' : ''
      document.cookie = `jwt=; Path=/; Max-Age=0; SameSite=Strict${secure}`
    } catch (e) {
      console.warn('Unable to delete JWT cookie', e)
    }
  }

  const fetchMe = async () => {
    if (!token.value) return null
    try {
      const { data } = await client.get('/me')
      currentUser.value = data
      setSession(token.value, data)
      return data
    } catch {
      clearAuth()
      return null
    }
  }

  const logout = async () => {
    try {
      if (token.value) await client.post('/logout')
    } catch {
      /* el token ya no es válido */
    }
    clearAuth()
  }

  const changeUser = (_idUsuario: number) => {
    console.warn('changeUser legacy no-op, use login con otro email')
  }

  return {
    token,
    currentUser,
    currentUserCompat,
    isAuthenticated,
    hasRole,
    isAdmin,
    isTecnico,
    isCliente,
    isSuperAdmin,
    isLicenciaVencida,
    login,
    verificarCodigo,
    verificarEnlace,
    reenviarVerificacion,
    olvidePassword,
    resetPassword,
    logout,
    fetchMe,
    changeUser,
    applySession,
    clearAuth,
    get currentUserValue() {
      return currentUserCompat.value
    },
  }
})

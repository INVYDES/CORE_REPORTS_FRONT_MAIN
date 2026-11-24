<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import {
    useAuthStore,
    ROLES,
    esVerificacionPendiente,
    type UsuarioReal,
  } from '../../stores/authStore'
  import { useToast } from 'vue-toastification'
  import { Eye, EyeOff, ArrowLeft } from 'lucide-vue-next'
  import loginImageUrl from '../../assets/login-image.png'

  const router = useRouter()
  const auth = useAuthStore()
  const toast = useToast()

  const email = ref('')
  const password = ref('')
  const showPassword = ref(false)
  const rememberMe = ref(false)
  const isLoading = ref(false)
  const errorMsg = ref('')

  const step = ref<'credentials' | 'verification'>('credentials')
  const verificationEmail = ref('')
  const verificationCode = ref('')
  const verificationMessage = ref('')
  const correoEnviado = ref(false)
  const resendSeconds = ref(0)
  let resendTimer: ReturnType<typeof setInterval> | null = null

  const canResend = computed(() => resendSeconds.value <= 0)

  const detenerContador = () => {
    if (resendTimer) {
      clearInterval(resendTimer)
      resendTimer = null
    }
  }

  const iniciarContador = (seconds: number) => {
    detenerContador()
    resendSeconds.value = Math.max(0, Math.floor(Number(seconds) || 0))
    if (resendSeconds.value === 0) return

    resendTimer = setInterval(() => {
      resendSeconds.value -= 1
      if (resendSeconds.value <= 0) {
        resendSeconds.value = 0
        detenerContador()
      }
    }, 1000)
  }

  const irAlPanel = (user: UsuarioReal) => {
    const redirect = router.currentRoute.value.query.redirect as string | undefined
    const dest =
      user.rol === ROLES.SUPER_ADMIN
        ? '/app/plataforma'
        : redirect && redirect.startsWith('/') && !redirect.startsWith('/login')
          ? redirect
          : '/app/dashboard'
    window.location.assign(router.resolve(dest).href)
  }

  const procesarError = (e: any) => {
    const status = e?.response?.status
    if (status === 419) {
      errorMsg.value =
        'Sesión expirada. Recarga la página (F5) e intenta de nuevo. Si persiste, limpia cookies del sitio.'
    } else if (status === 422 || status === 401) {
      errorMsg.value =
        e?.response?.data?.errors?.codigo?.[0] ||
        e?.response?.data?.errors?.email?.[0] ||
        e?.response?.data?.message ||
        'Credenciales incorrectas. Verifica tu correo y contraseña.'
    } else if (status === 403) {
      errorMsg.value =
        e?.response?.data?.message || 'Usuario desactivado. Contacta al administrador.'
    } else if (status === 429) {
      const retry =
        e?.response?.data?.reenviar_en_segundos ?? e?.response?.headers?.['retry-after']
      errorMsg.value = retry
        ? `Demasiados intentos. Espera ${retry} segundos e intenta de nuevo.`
        : 'Demasiados intentos de acceso. Espera un minuto e intenta de nuevo.'
    } else {
      errorMsg.value =
        e?.response?.data?.message || 'No se pudo conectar con el servidor. Intenta de nuevo.'
    }
    if (errorMsg.value.includes('CSRF token mismatch')) {
      errorMsg.value = 'Sesión expirada (CSRF). Recarga la página e intenta de nuevo.'
    }
    toast.error(errorMsg.value)
  }

  const handleLogin = async () => {
    isLoading.value = true
    errorMsg.value = ''
    try {
      const result = await auth.login(email.value, password.value)

      if (esVerificacionPendiente(result)) {
        verificationEmail.value = result.email
        verificationMessage.value = result.message
        correoEnviado.value = result.correo_enviado
        step.value = 'verification'
        iniciarContador(result.reenviar_en_segundos)
        if (result.correo_enviado) {
          toast.info('Revisa tu correo: enviamos un código y un enlace de verificación.')
        } else {
          toast.warning(result.message)
        }
        return
      }

      toast.success('Bienvenido')
      irAlPanel(result)
    } catch (e: any) {
      procesarError(e)
    } finally {
      isLoading.value = false
    }
  }

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(verificationCode.value.trim())) {
      errorMsg.value = 'Ingresa el código de 6 dígitos que enviamos a tu correo.'
      return
    }

    isLoading.value = true
    errorMsg.value = ''
    try {
      const user = await auth.verificarCodigo(verificationEmail.value, verificationCode.value.trim())
      toast.success('Correo verificado. Bienvenido.')
      irAlPanel(user)
    } catch (e: any) {
      procesarError(e)
    } finally {
      isLoading.value = false
    }
  }

  const handleResend = async () => {
    if (!canResend.value || isLoading.value) return

    isLoading.value = true
    errorMsg.value = ''
    try {
      const data = await auth.reenviarVerificacion(verificationEmail.value)
      verificationMessage.value = data.message
      iniciarContador(data.reenviar_en_segundos ?? 60)
      if (data.correo_enviado) {
        correoEnviado.value = true
        toast.success('Enviamos un nuevo código y enlace de verificación.')
      } else {
        toast.warning(data.message)
      }
    } catch (e: any) {
      const seconds = Number(e?.response?.data?.reenviar_en_segundos)
      if (seconds > 0) iniciarContador(seconds)
      procesarError(e)
    } finally {
      isLoading.value = false
    }
  }

  const usarOtroCorreo = () => {
    detenerContador()
    step.value = 'credentials'
    verificationCode.value = ''
    verificationMessage.value = ''
    errorMsg.value = ''
  }

  onMounted(() => {
    const query = router.currentRoute.value.query
    if (typeof query.email === 'string' && query.email) email.value = query.email

    if (query.verificar === '1' && email.value) {
      verificationEmail.value = email.value
      correoEnviado.value = query.enviado !== '0'
      verificationMessage.value =
        correoEnviado.value
          ? 'Te enviamos un código de 6 dígitos y un enlace de verificación. Revisa tu correo.'
          : 'Tu cuenta fue creada, pero no pudimos enviar el correo. Solicita un nuevo código.'
      step.value = 'verification'
      iniciarContador(60)
    }
  })

  onBeforeUnmount(detenerContador)
</script>

<!------------------------------------------------------------------------------------------------------------------>

<template>
  <div class="split-screen-login">
    <!-- Panel izquierdo -->
    <div class="left-pane">
      <div class="form-container">
        <!------------ Header ------------>
        <div class="brand">
          <div class="logo-placeholder">coreReport</div>

          <h2>Bienvenido de vuelta!</h2>
          <p class="subtitle">Ingrese sus datos para continuar.</p>
        </div>
        <!------------ Formulario ------------>
        <form v-if="step === 'credentials'" @submit.prevent="handleLogin">
          <div class="form-group">
            <label>Correo electrónico o ID de Empleado</label>
            <input
              v-model="email"
              type="text"
              placeholder="correo@ejemplo.com o EMP-1001"
              autocomplete="username"
              required
            />
          </div>

          <div class="form-group">
            <label>Contraseña</label>
            <div class="password-wrap">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                class="password-toggle"
                :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" :size="18" />
                <Eye v-else :size="18" />
              </button>
            </div>
          </div>

          <div class="form-actions">
            <label class="checkbox-label">
              <input type="checkbox" v-model="rememberMe" />
              <span>Recordarme</span>
            </label>
            <router-link :to="{ name: 'forgot-password' }" class="forgot-link">
              ¿Olvidaste tu contraseña?
            </router-link>
          </div>

          <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
          <button type="submit" :disabled="isLoading" class="btn-primary">
            {{ isLoading ? 'Ingresando...' : 'Ingresar' }}
          </button>
        </form>

        <div v-else class="verification-panel">
          <button type="button" class="back-link" @click="usarOtroCorreo">
            <ArrowLeft :size="15" />
            Usar otro correo
          </button>

          <h2>Verifica tu correo</h2>
          <p class="subtitle">
            Enviamos un código de 6 dígitos y un enlace de verificación a
            <strong>{{ verificationEmail }}</strong>.
          </p>

          <p v-if="verificationMessage" class="info-msg">{{ verificationMessage }}</p>

          <form @submit.prevent="handleVerify">
            <div class="form-group">
              <label>Código de 6 dígitos</label>
              <input
                v-model="verificationCode"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6"
                placeholder="000000"
                class="code-input"
                required
              />
            </div>

            <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

            <button type="submit" :disabled="isLoading" class="btn-primary">
              {{ isLoading ? 'Verificando...' : 'Verificar y entrar' }}
            </button>
          </form>

          <div class="resend-row">
            <span>¿No recibiste el correo?</span>
            <button
              type="button"
              class="resend-button"
              :disabled="!canResend || isLoading"
              @click="handleResend"
            >
              {{ canResend ? 'Reenviar' : `Reenviar en ${resendSeconds}s` }}
            </button>
          </div>

          <p class="verification-hint">
            También puedes abrir el enlace del correo en este mismo dispositivo.
          </p>
        </div>

        <p v-if="step === 'credentials'" class="signup-text">
          ¿No tienes una cuenta?
          <router-link :to="{ name: 'register' }">Regístrate aquí</router-link>
        </p>
      </div>
    </div>

    <!-- Panel derecho -->
    <div class="right-pane">
      <img :src="loginImageUrl" alt="Login Visual" class="login-image" />
    </div>
  </div>
</template>

<!------------------------------------------------------------------------------------------------------------------>

<style scoped>
  /* --------- LAYOUT ---------*/
  .split-screen-login {
    display: flex;
    min-height: 100vh;
    width: 100vw;
    font-family: 'Inter', sans-serif;
  }
  .left-pane {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #ffffff;
    padding: 2rem;
  }

  .right-pane {
    flex: 1;
    background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    position: relative;
    overflow: hidden;
  }

  .login-image {
    width: 100%;
    height: 100%;
    opacity: 0.7;
    object-fit: cover;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
  }

  @media (max-width: 768px) {
    .right-pane {
      display: none;
    }
  }

  /* --------- FORM --------- */
  .form-container {
    width: 100%;
    max-width: 380px;
  }

  .brand {
    margin-bottom: 2.5rem;
  }

  .logo-placeholder {
    font-weight: 900;
    font-size: 1.5rem;
    color: #1e3a8a;
    margin-bottom: 0.5rem;
  }

  h2 {
    font-size: 1.8rem;
    color: #111827;
    margin: 0 0 0.5rem 0;
  }

  .subtitle {
    color: #6b7280;
    font-size: 0.95rem;
  }

  .form-group {
    margin-bottom: 1.2rem;
  }

  label {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.4rem;
  }

  input[type='email'],
  input[type='password'],
  input[type='text'] {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 1rem;
    box-sizing: border-box;
    transition: all 0.2s;
  }

  input:focus {
    border-color: #1e3a8a;
    box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.1);
    outline: none;
  }

  /* --------- MOSTRAR/OCULTAR CONTRASEÑA --------- */
  .password-wrap {
    position: relative;
  }

  .password-wrap input {
    padding-right: 2.6rem;
  }

  .password-toggle {
    position: absolute;
    right: 0.6rem;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    color: #6b7280;
  }

  .password-toggle:hover {
    color: #1e3a8a;
  }

  /* ------------ ACTIONS --------- */
  .form-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    font-size: 0.9rem;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #374151;
    cursor: pointer;
  }

  .forgot-link {
    color: #1e3a8a;
    font-weight: 600;
    text-decoration: none;
  }

  .btn-primary {
    width: 100%;
    padding: 0.9rem;
    background-color: #1e3a8a;
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.3s;
  }

  .btn-primary:hover {
    background-color: #172554;
  }

  .btn-primary:disabled {
    background-color: #93c5fd;
    cursor: not-allowed;
  }

  /* --------- SIGN UP --------- */
  .signup-text {
    text-align: center;
    margin-top: 2rem;
    color: #6b7280;
    font-size: 0.9rem;
  }

  .signup-text a {
    color: #1e3a8a;
    font-weight: 600;
    text-decoration: none;
  }
  .error-msg {
    color: #dc2626;
    background: #fee2e2;
    padding: 0.6rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  .verification-panel {
    display: flex;
    flex-direction: column;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    align-self: flex-start;
    margin-bottom: 1.4rem;
    padding: 0;
    border: 0;
    background: transparent;
    color: #475569;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
  }

  .back-link:hover {
    color: #1e3a8a;
  }

  .info-msg {
    color: #1e40af;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    padding: 0.7rem 0.8rem;
    border-radius: 6px;
    margin: 0 0 1.2rem;
    font-size: 0.88rem;
    line-height: 1.45;
  }

  .code-input {
    text-align: center;
    font-size: 1.5rem !important;
    font-weight: 700;
    letter-spacing: 0.35em;
  }

  .resend-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1.1rem;
    color: #64748b;
    font-size: 0.84rem;
  }

  .resend-button {
    border: 0;
    background: transparent;
    color: #1e3a8a;
    font: inherit;
    font-size: 0.84rem;
    font-weight: 700;
    cursor: pointer;
  }

  .resend-button:disabled {
    color: #94a3b8;
    cursor: not-allowed;
  }

  .verification-hint {
    margin: 1rem 0 0;
    color: #94a3b8;
    font-size: 0.78rem;
    line-height: 1.5;
  }
</style>

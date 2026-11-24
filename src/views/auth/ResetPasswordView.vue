<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useAuthStore } from '../../stores/authStore'
  import { useToast } from 'vue-toastification'
  import { ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-vue-next'

  const route = useRoute()
  const router = useRouter()
  const auth = useAuthStore()
  const toast = useToast()

  const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
  const email = computed(() => (typeof route.query.email === 'string' ? route.query.email : ''))

  const password = ref('')
  const passwordConfirmation = ref('')
  const showPassword = ref(false)
  const isLoading = ref(false)
  const completado = ref(false)
  const errorMsg = ref('')

  const enlaceInvalido = computed(() => !token.value || !email.value)

  const handleSubmit = async () => {
    if (password.value.length < 8) {
      errorMsg.value = 'La contraseña debe tener al menos 8 caracteres.'
      return
    }
    if (password.value !== passwordConfirmation.value) {
      errorMsg.value = 'Las contraseñas no coinciden.'
      return
    }

    isLoading.value = true
    errorMsg.value = ''
    try {
      const data = await auth.resetPassword({
        email: email.value,
        token: token.value,
        password: password.value,
        password_confirmation: passwordConfirmation.value,
      })
      completado.value = true
      toast.success(data.message)
      setTimeout(() => router.push({ name: 'login' }), 1800)
    } catch (e: any) {
      const status = e?.response?.status
      if (status === 422) {
        errorMsg.value =
          e?.response?.data?.errors?.password?.[0] ||
          e?.response?.data?.errors?.email?.[0] ||
          e?.response?.data?.message ||
          'El enlace no es válido o venció. Solicita uno nuevo.'
      } else if (status === 429) {
        errorMsg.value = 'Demasiados intentos. Espera un momento e intenta de nuevo.'
      } else {
        errorMsg.value =
          e?.response?.data?.message || 'No se pudo conectar con el servidor. Intenta de nuevo.'
      }
    } finally {
      isLoading.value = false
    }
  }
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <router-link :to="{ name: 'login' }" class="back-link">
        <ArrowLeft :size="15" />
        Volver al inicio de sesión
      </router-link>

      <div class="brand">coreReports</div>

      <template v-if="completado">
        <div class="success-icon"><CheckCircle2 :size="28" /></div>
        <h1>Contraseña actualizada</h1>
        <p class="subtitle">Ya puedes iniciar sesión con tu nueva contraseña.</p>
        <router-link :to="{ name: 'login' }" class="btn-primary btn-link">Ir al inicio de sesión</router-link>
      </template>

      <template v-else-if="enlaceInvalido">
        <h1>Enlace inválido</h1>
        <p class="subtitle">
          El enlace no incluye la información necesaria o ya venció. Solicita uno nuevo.
        </p>
        <router-link :to="{ name: 'forgot-password' }" class="btn-primary btn-link">
          Solicitar nuevo enlace
        </router-link>
      </template>

      <template v-else>
        <h1>Crea una nueva contraseña</h1>
        <p class="subtitle">
          Cuenta: <strong>{{ email }}</strong>
        </p>

        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label>Nueva contraseña</label>
            <div class="password-wrap">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="••••••••"
                minlength="8"
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
            <p class="hint">Mínimo 8 caracteres.</p>
          </div>

          <div class="form-group">
            <label>Confirmar contraseña</label>
            <input
              v-model="passwordConfirmation"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="••••••••"
              minlength="8"
              required
            />
          </div>

          <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

          <button type="submit" :disabled="isLoading" class="btn-primary">
            {{ isLoading ? 'Guardando...' : 'Cambiar contraseña' }}
          </button>
        </form>
      </template>
    </div>
  </div>
</template>

<style scoped>
  .auth-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
    background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
    font-family: 'Inter', sans-serif;
  }

  .auth-card {
    width: 100%;
    max-width: 420px;
    background: #ffffff;
    border-radius: 12px;
    padding: 2.25rem;
    box-shadow: 0 20px 45px rgba(15, 23, 42, 0.35);
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    margin-bottom: 1.5rem;
    color: #475569;
    font-size: 0.82rem;
    font-weight: 600;
    text-decoration: none;
  }

  .back-link:hover {
    color: #1e3a8a;
  }

  .brand {
    font-weight: 900;
    font-size: 1.35rem;
    color: #1e3a8a;
    margin-bottom: 1.5rem;
  }

  h1 {
    margin: 0 0 0.5rem;
    font-size: 1.5rem;
    color: #111827;
  }

  .subtitle {
    margin: 0 0 1.5rem;
    color: #6b7280;
    font-size: 0.92rem;
    line-height: 1.5;
  }

  .form-group {
    margin-bottom: 1.2rem;
  }

  label {
    display: block;
    margin-bottom: 0.4rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: #374151;
  }

  input {
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
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    color: #6b7280;
  }

  .password-toggle:hover {
    color: #1e3a8a;
  }

  .btn-primary {
    display: block;
    width: 100%;
    padding: 0.85rem;
    border: none;
    border-radius: 6px;
    background: #1e3a8a;
    color: #ffffff;
    font-size: 1rem;
    font-weight: 600;
    text-align: center;
    text-decoration: none;
    cursor: pointer;
    transition: background-color 0.3s;
  }

  .btn-primary:hover {
    background: #172554;
  }

  .btn-primary:disabled {
    background: #93c5fd;
    cursor: not-allowed;
  }

  .btn-link {
    margin-top: 0.5rem;
  }

  .error-msg {
    margin-bottom: 1rem;
    padding: 0.6rem;
    border-radius: 6px;
    background: #fee2e2;
    color: #dc2626;
    font-size: 0.9rem;
  }

  .hint {
    margin: 0.4rem 0 0;
    color: #94a3b8;
    font-size: 0.78rem;
  }

  .success-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    margin-bottom: 1rem;
    border-radius: 50%;
    background: #dcfce7;
    color: #15803d;
  }
</style>

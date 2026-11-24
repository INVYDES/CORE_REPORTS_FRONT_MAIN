<script setup lang="ts">
  import { ref } from 'vue'
  import { useAuthStore } from '../../stores/authStore'
  import { ArrowLeft, MailCheck } from 'lucide-vue-next'

  const auth = useAuthStore()

  const email = ref('')
  const isLoading = ref(false)
  const enviado = ref(false)
  const message = ref('')
  const errorMsg = ref('')

  const handleSubmit = async () => {
    isLoading.value = true
    errorMsg.value = ''
    try {
      const data = await auth.olvidePassword(email.value)
      message.value = data.message
      enviado.value = true
    } catch (e: any) {
      const status = e?.response?.status
      if (status === 422) {
        errorMsg.value =
          e?.response?.data?.errors?.email?.[0] || 'Ingresa un correo electrónico válido.'
      } else if (status === 429) {
        const retry = e?.response?.headers?.['retry-after']
        errorMsg.value = retry
          ? `Demasiados intentos. Espera ${retry} segundos e intenta de nuevo.`
          : 'Demasiados intentos. Espera un momento e intenta de nuevo.'
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

      <template v-if="!enviado">
        <h1>Recuperar contraseña</h1>
        <p class="subtitle">
          Ingresa el correo de tu cuenta y te enviaremos un enlace para crear una nueva contraseña.
        </p>

        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label>Correo electrónico</label>
            <input
              v-model="email"
              type="email"
              autocomplete="email"
              placeholder="correo@ejemplo.com"
              required
            />
          </div>

          <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

          <button type="submit" :disabled="isLoading" class="btn-primary">
            {{ isLoading ? 'Enviando...' : 'Enviar enlace' }}
          </button>
        </form>
      </template>

      <template v-else>
        <div class="success-icon"><MailCheck :size="28" /></div>
        <h1>Revisa tu correo</h1>
        <p class="subtitle">{{ message }}</p>
        <p class="hint">
          Si no lo encuentras, revisa la carpeta de spam. El enlace vence en 60 minutos.
        </p>
        <router-link :to="{ name: 'login' }" class="btn-primary btn-link">
          Volver al inicio de sesión
        </router-link>
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
    margin: 0 0 1.5rem;
    color: #94a3b8;
    font-size: 0.8rem;
    line-height: 1.5;
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

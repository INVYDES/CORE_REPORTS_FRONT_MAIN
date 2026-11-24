<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useAuthStore, ROLES, type UsuarioReal } from '../../stores/authStore'
  import { useToast } from 'vue-toastification'
  import { CheckCircle2, Loader2, XCircle } from 'lucide-vue-next'

  const route = useRoute()
  const router = useRouter()
  const auth = useAuthStore()
  const toast = useToast()

  const estado = ref<'verificando' | 'exito' | 'error'>('verificando')
  const mensaje = ref('Estamos validando tu enlace de verificación...')

  const irAlPanel = (user: UsuarioReal) => {
    const dest =
      user.rol === ROLES.SUPER_ADMIN
        ? '/app/plataforma'
        : router.currentRoute.value.query.redirect?.toString().startsWith('/')
          ? router.currentRoute.value.query.redirect.toString()
          : '/app/dashboard'
    window.location.assign(router.resolve(dest).href)
  }

  const verificar = async (token: string) => {
    try {
      const user = await auth.verificarEnlace(token)
      estado.value = 'exito'
      mensaje.value = 'Tu correo quedó verificado. Entrando a tu cuenta...'
      toast.success('Correo verificado correctamente.')
      setTimeout(() => irAlPanel(user), 1200)
    } catch (e: any) {
      estado.value = 'error'
      mensaje.value =
        e?.response?.data?.message ||
        'El enlace de verificación no es válido o venció. Solicita uno nuevo desde el inicio de sesión.'
    }
  }

  onMounted(() => {
    const token = typeof route.query.token === 'string' ? route.query.token : ''
    if (!token) {
      estado.value = 'error'
      mensaje.value = 'El enlace no incluye un token de verificación. Solicita uno nuevo.'
      return
    }
    verificar(token)
  })
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="brand">coreReports</div>

      <div v-if="estado === 'verificando'" class="icon-wrap loading">
        <Loader2 :size="28" class="spin" />
      </div>
      <div v-else-if="estado === 'exito'" class="icon-wrap ok">
        <CheckCircle2 :size="28" />
      </div>
      <div v-else class="icon-wrap fail">
        <XCircle :size="28" />
      </div>

      <h1>
        {{
          estado === 'verificando'
            ? 'Verificando tu correo'
            : estado === 'exito'
              ? 'Correo verificado'
              : 'No pudimos verificar tu correo'
        }}
      </h1>
      <p class="subtitle">{{ mensaje }}</p>

      <template v-if="estado === 'error'">
        <router-link :to="{ name: 'login' }" class="btn-primary btn-link">
          Ir al inicio de sesión
        </router-link>
        <p class="hint">
          Desde el inicio de sesión puedes solicitar un nuevo código o enlace de verificación.
        </p>
      </template>
      <p v-else-if="estado === 'exito'" class="hint">Si no eres redirigido, abre el panel manualmente.</p>
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

  .icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    margin-bottom: 1rem;
    border-radius: 50%;
  }

  .icon-wrap.loading {
    background: #eff6ff;
    color: #1e3a8a;
  }

  .icon-wrap.ok {
    background: #dcfce7;
    color: #15803d;
  }

  .icon-wrap.fail {
    background: #fee2e2;
    color: #dc2626;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
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

  .btn-link {
    margin-top: 0.25rem;
  }

  .hint {
    margin: 0.9rem 0 0;
    color: #94a3b8;
    font-size: 0.8rem;
    line-height: 1.5;
  }
</style>

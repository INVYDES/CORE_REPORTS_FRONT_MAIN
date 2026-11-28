<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { storeToRefs } from 'pinia'
  import client from '../../../api/client'
  import { useAuthStore } from '../../../stores/authStore'
  import { useToast } from 'vue-toastification'
  import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-vue-next'
  import PricingPlans from '../../../components/shared/PricingPlans.vue'
  import type { CicloPago, PlanCatalogo } from '../../../config/planes'

  const router = useRouter()
  const auth = useAuthStore()
  const { currentUser, isLicenciaVencida, isAdmin } = storeToRefs(auth)
  const toast = useToast()

  const licencias = ref<any[]>([])
  const loading = ref(true)
  const comprando = ref<string | null>(null)

  const dependencia = computed(() => currentUser.value?.dependencia || null)
  const planActual = computed(() => {
    const plan = dependencia.value?.tipo_licencia || ''
    return (({ trial: 'Gratis', mensual: 'Mensual', anual: 'Anual' }) as any)[plan] || plan || '-'
  })
  const expiracion = computed(() =>
    dependencia.value?.fecha_expiracion
      ? String(dependencia.value.fecha_expiracion).slice(0, 10)
      : 'Sin fecha'
  )

  const licenciasPorCodigo = computed(
    () => new Map(licencias.value.map(licencia => [licencia.codigo, licencia]))
  )

  const loadPlanes = async () => {
    loading.value = true
    try {
      const { data } = await client.get('/licencias/disponibles')
      licencias.value = data.data || []
    } catch {
      toast.error('No se pudieron cargar los planes')
    } finally {
      loading.value = false
    }
  }

  const comprar = async (payload: { plan: PlanCatalogo; ciclo: CicloPago }) => {
    const { plan, ciclo } = payload

    if (plan.empresarial) {
      window.location.href =
        'mailto:contacto@corion.mx?subject=Solicitud%20de%20plan%20Enterprise%20coreReports'
      return
    }

    if (comprando.value !== null) return

    const codigo = plan.gratuito
      ? 'trial'
      : ciclo === 'anual'
        ? plan.codigoLicenciaAnual
        : plan.codigoLicenciaMensual
    const licencia = codigo ? licenciasPorCodigo.value.get(codigo) : null

    if (!licencia) {
      toast.error('El plan seleccionado no está disponible. Recarga la página e intenta de nuevo.')
      return
    }

    comprando.value = plan.codigo
    try {
      // Preferir el token opaco del plan; el endpoint por id queda como respaldo.
      const { data } = licencia.token
        ? await client.post('/licencias/comprar-mercadopago', {
            licenciaToken: licencia.token,
          })
        : await client.post(`/licencias/${licencia.id}/comprar-mercadopago`)
      if (data.init_point) {
        window.location.href = data.init_point
        return
      }

      toast.success('Licencia activada correctamente')
      await auth.fetchMe()
      router.push({ name: isLicenciaVencida.value ? 'licencia' : 'dashboard' })
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'No se pudo iniciar el pago')
    } finally {
      comprando.value = null
    }
  }

  onMounted(() => {
    if (isAdmin.value) loadPlanes()
    else loading.value = false
  })
</script>

<template>
  <div class="license-page">
    <header>
      <span class="eyebrow"><ShieldCheck :size="16" /> Licencia</span>
      <h1>Tu licencia de CsRecords</h1>
      <p>Consulta el estado de tu plan y renueva con Mercado Pago.</p>
    </header>

    <section class="current-card" :class="{ expired: isLicenciaVencida }">
      <div class="current-icon">
        <AlertTriangle v-if="isLicenciaVencida" :size="24" />
        <CheckCircle2 v-else :size="24" />
      </div>
      <div class="current-info">
        <span class="label">{{ isLicenciaVencida ? 'Licencia vencida' : 'Licencia vigente' }}</span>
        <h2>{{ dependencia?.nombre || 'Tu empresa' }}</h2>
        <p>
          Plan <strong class="capitalize">{{ planActual }}</strong> · Vence el
          <strong>{{ expiracion }}</strong>
        </p>
      </div>
      <div class="current-meta">
        <span>Usuarios</span>
        <strong>{{ dependencia?.limite_usuarios ?? '—' }}</strong>
        <span>Reportes / mes</span>
        <strong>{{ dependencia?.limite_reportes_mensuales ?? '—' }}</strong>
      </div>
    </section>

    <template v-if="isAdmin">
      <h2 class="section-title">Renueva o cambia de plan</h2>

      <PricingPlans :cargando="loading" :comprando="comprando" modo="licencia" @select="comprar" />
    </template>

    <section v-else class="current-card">
      <div class="current-info">
        <span class="label">Solo administradores</span>
        <h2>Pide a un administrador que renueve el plan</h2>
        <p>
          Solo los administradores de tu empresa pueden renovar o cambiar la licencia. Cuando la
          renueven, vuelve a iniciar sesión para seguir trabajando.
        </p>
      </div>
    </section>

    <p class="note">
      El cobro se realiza con Mercado Pago. Al aprobarse el pago, tu licencia se activa
      automáticamente y recibirás la confirmación al volver a CsRecords.
    </p>
  </div>
</template>

<style scoped>
  .license-page {
    max-width: 1240px;
    margin: 0 auto;
    padding: 2rem;
    color: #0f172a;
  }

  header {
    margin-bottom: 1.5rem;
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    color: #7c3aed;
    font-weight: 700;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0.35rem 0 0.25rem;
    font-size: 1.75rem;
  }

  header p {
    margin: 0;
    color: #64748b;
  }

  .current-card {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 1rem;
    align-items: center;
    padding: 1.25rem;
    border-radius: 16px;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    margin-bottom: 2rem;
  }

  .current-card.expired {
    background: #fffbeb;
    border-color: #fde68a;
  }

  .current-icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: #dcfce7;
    color: #15803d;
    display: grid;
    place-items: center;
  }

  .current-card.expired .current-icon {
    background: #fef3c7;
    color: #b45309;
  }

  .current-info .label {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #15803d;
  }

  .current-card.expired .current-info .label {
    color: #b45309;
  }

  .current-info h2 {
    margin: 0.2rem 0;
    font-size: 1.15rem;
  }

  .current-info p {
    margin: 0;
    color: #475569;
    font-size: 0.88rem;
  }

  .current-meta {
    display: grid;
    grid-template-columns: auto auto;
    gap: 0.15rem 0.75rem;
    font-size: 0.78rem;
    color: #64748b;
  }

  .current-meta strong {
    color: #0f172a;
    text-align: right;
  }

  .capitalize {
    text-transform: capitalize;
  }

  .section-title {
    font-size: 1.1rem;
    margin: 0 0 1rem;
  }

  .note {
    margin-top: 1.5rem;
    color: #64748b;
    font-size: 0.82rem;
    text-align: center;
  }

  @media (max-width: 720px) {
    .license-page {
      padding: 1rem;
    }
    .current-card {
      grid-template-columns: auto 1fr;
    }
    .current-meta {
      grid-column: 1 / -1;
      grid-template-columns: repeat(2, auto);
    }
  }
</style>

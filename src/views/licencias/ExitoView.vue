<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useToast } from 'vue-toastification'
  import client from '../../api/client'
  import { useAuthStore } from '../../stores/authStore'

  type Estado = 'verificando' | 'aprobado' | 'pendiente' | 'error'

  const route = useRoute()
  const router = useRouter()
  const auth = useAuthStore()
  const toast = useToast()
  const estado = ref<Estado>('verificando')

  const esperar = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const verificar = async () => {
    const paymentId = route.query.payment_id || route.query.collection_id

    if (!paymentId) {
      estado.value = 'pendiente'
      return
    }

    for (let intento = 0; intento < 10; intento++) {
      try {
        const { data } = await client.get(`/licencias/verificar-pago/${paymentId}`)
        const pago = data?.data

        if (pago?.approved) {
          estado.value = 'aprobado'
          await auth.fetchMe()
          toast.success('¡Pago aprobado! Tu licencia está activa.')
          return
        }

        if (['rejected', 'cancelled', 'refunded'].includes(pago?.status)) {
          estado.value = 'error'
          return
        }
      } catch {
        if (intento === 9) {
          estado.value = 'error'
          return
        }
      }

      await esperar(2000)
    }

    estado.value = 'pendiente'
  }

  onMounted(verificar)

  const irAlPanel = () => router.push({ name: 'dashboard' })
  const irARenovar = () => router.push({ name: 'licencia' })
</script>

<template>
  <div class="payment-result">
    <div v-if="estado === 'verificando'" class="icon pending">…</div>
    <div v-else-if="estado === 'aprobado'" class="icon ok">✓</div>
    <div v-else-if="estado === 'pendiente'" class="icon pending">!</div>
    <div v-else class="icon error">×</div>

    <h1 v-if="estado === 'verificando'">Verificando tu pago…</h1>
    <h1 v-else-if="estado === 'aprobado'" class="ok-text">¡Pago aprobado!</h1>
    <h1 v-else-if="estado === 'pendiente'" class="pending-text">Pago en proceso</h1>
    <h1 v-else class="error-text">No pudimos confirmar el pago</h1>

    <p v-if="estado === 'verificando'">
      Estamos consultando Mercado Pago. Esto puede tardar unos segundos.
    </p>
    <p v-else-if="estado === 'aprobado'">
      Tu licencia ha sido activada. Ya puedes usar todas las funciones de CsRecords.
    </p>
    <p v-else-if="estado === 'pendiente'">
      Mercado Pago aún no confirma el pago. Revisa tu correo o intenta de nuevo en unos minutos.
    </p>
    <p v-else>
      El pago fue rechazado o no pudimos verificarlo. Puedes intentar con otro método desde tu licencia.
    </p>

    <div class="actions">
      <button v-if="estado === 'aprobado'" class="btn-primary" @click="irAlPanel">
        Ir al dashboard
      </button>
      <button v-else-if="estado !== 'verificando'" class="btn-secondary" @click="irARenovar">
        Volver a mi licencia
      </button>
    </div>
  </div>
</template>

<style scoped>
  .payment-result {
    min-height: 80vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 2rem;
    font-family: 'Inter', sans-serif;
  }

  .icon {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 40px;
    font-weight: 700;
    margin-bottom: 1rem;
  }

  .icon.ok { background: #dcfce7; color: #16a34a; }
  .icon.pending { background: #fef3c7; color: #b45309; }
  .icon.error { background: #ffe4e6; color: #be123c; }

  h1 {
    font-size: 1.8rem;
    margin: 0 0 0.5rem;
  }

  .ok-text { color: #16a34a; }
  .pending-text { color: #b45309; }
  .error-text { color: #be123c; }

  p {
    color: #475569;
    margin: 0;
    max-width: 460px;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }

  .btn-primary,
  .btn-secondary {
    border-radius: 8px;
    padding: 0.75rem 1.5rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    border: 1px solid transparent;
  }

  .btn-primary {
    background: #16a34a;
    color: #fff;
  }

  .btn-secondary {
    background: #fff;
    border-color: #cbd5e1;
    color: #334155;
  }
</style>

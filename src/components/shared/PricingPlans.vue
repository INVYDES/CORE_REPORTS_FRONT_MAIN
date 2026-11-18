<script setup lang="ts">
  import { ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { Check } from 'lucide-vue-next'
  import { PLANES, type CicloPago, type PlanCatalogo } from '../../config/planes'

  const props = withDefaults(
    defineProps<{
      planes?: PlanCatalogo[]
      cargando?: boolean
      comprando?: string | null
      modo?: 'sitio' | 'licencia'
      mostrarToggle?: boolean
    }>(),
    {
      planes: () => PLANES,
      cargando: false,
      comprando: null,
      modo: 'sitio',
      mostrarToggle: true,
    }
  )

  const emit = defineEmits<{
    select: [payload: { plan: PlanCatalogo; ciclo: CicloPago }]
  }>()

  const { t } = useI18n()
  const ciclo = ref<CicloPago>('mensual')

  const fmtMoney = (value: number) =>
    new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(value)

  const precioVisible = (plan: PlanCatalogo) => {
    if (plan.gratuito) return t('landing.pricing.freePrice')
    const precio = ciclo.value === 'anual' ? plan.precioAnual : plan.precioMensual
    if (plan.empresarial || precio === null) return t('landing.pricing.customPrice')
    return fmtMoney(precio)
  }

  const periodoVisible = (plan: PlanCatalogo) => {
    if (plan.gratuito) return t('landing.pricing.freePeriod')
    if (plan.empresarial) return t('landing.pricing.customPeriod')
    const periodo =
      ciclo.value === 'anual' ? t('landing.pricing.perYear') : t('landing.pricing.perMonth')
    return `${periodo} · ${t('landing.pricing.vat')}`
  }

  const ctaVisible = (plan: PlanCatalogo) => {
    if (plan.empresarial) return t('landing.pricing.cta.contact')
    if (plan.gratuito) return t('landing.pricing.cta.start')
    return t('landing.pricing.cta.choose')
  }

  const elegir = (plan: PlanCatalogo) => {
    if (props.cargando || props.comprando !== null) return
    emit('select', { plan, ciclo: ciclo.value })
  }
</script>

<template>
  <div class="pricing-planes" :class="{ 'is-loading': cargando }">
    <div v-if="mostrarToggle" class="pricing-toggle" role="group" aria-label="Ciclo de pago">
      <button
        type="button"
        :class="{ active: ciclo === 'mensual' }"
        :aria-pressed="ciclo === 'mensual'"
        @click="ciclo = 'mensual'"
      >
        {{ t('landing.pricing.toggle.monthly') }}
      </button>
      <button
        type="button"
        :class="{ active: ciclo === 'anual' }"
        :aria-pressed="ciclo === 'anual'"
        @click="ciclo = 'anual'"
      >
        {{ t('landing.pricing.toggle.annual') }}
      </button>
    </div>

    <p v-if="cargando" class="pricing-loading">Cargando planes...</p>

    <div v-else class="pricing-grid">
      <article
        v-for="plan in planes"
        :key="plan.codigo"
        class="price-card"
        :class="{ featured: plan.destacado }"
      >
        <span v-if="plan.destacado" class="ribbon">{{ t('landing.pricing.popular') }}</span>

        <header class="card-head">
          <h3>{{ t(plan.nombreKey) }}</h3>
          <p class="price">{{ precioVisible(plan) }}</p>
          <p class="period">{{ periodoVisible(plan) }}</p>
        </header>

        <p class="plan-desc">{{ t(plan.descripcionKey) }}</p>

        <ul class="plan-features">
          <li>
            <Check :size="16" />
            <span>{{ t(plan.usuariosKey) }}</span>
          </li>
          <li v-for="feature in plan.featuresKeys" :key="feature">
            <Check :size="16" />
            <span>{{ t(feature) }}</span>
          </li>
        </ul>

        <button
          type="button"
          class="plan-cta"
          :class="plan.destacado ? 'is-primary' : 'is-outline'"
          :disabled="comprando !== null"
          @click="elegir(plan)"
        >
          <span v-if="comprando === plan.codigo">Procesando...</span>
          <span v-else>{{ ctaVisible(plan) }}</span>
        </button>
      </article>
    </div>
  </div>
</template>

<style scoped>
  .pricing-planes {
    --pp-bg: #0b1220;
    --pp-card: #0f1a2e;
    --pp-card-featured: #10203a;
    --pp-line: rgba(148, 163, 184, 0.18);
    --pp-text: #e2e8f0;
    --pp-muted: #94a3b8;
    --pp-blue: #2563eb;
    --pp-green: #22c55e;
    padding: clamp(1rem, 2vw, 1.5rem);
    border-radius: 24px;
    background:
      radial-gradient(900px 380px at 50% -10%, rgba(37, 99, 235, 0.18), transparent 65%),
      var(--pp-bg);
    color: var(--pp-text);
  }

  .pricing-toggle {
    display: flex;
    justify-content: center;
    gap: 0.35rem;
    width: fit-content;
    margin: 0 auto 1.5rem;
    padding: 0.3rem;
    border: 1px solid var(--pp-line);
    border-radius: 999px;
    background: rgba(15, 26, 46, 0.9);
  }

  .pricing-toggle button {
    border: 0;
    border-radius: 999px;
    padding: 0.5rem 1.1rem;
    background: transparent;
    color: var(--pp-muted);
    font: inherit;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    transition:
      background-color 0.2s,
      color 0.2s;
  }

  .pricing-toggle button:hover {
    color: #fff;
  }

  .pricing-toggle button.active {
    background: var(--pp-blue);
    color: #fff;
    box-shadow: 0 10px 24px -12px rgba(37, 99, 235, 0.9);
  }

  .pricing-loading {
    margin: 2rem 0;
    text-align: center;
    color: var(--pp-muted);
  }

  .pricing-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.9rem;
    align-items: stretch;
  }

  .price-card {
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 1.25rem 1.1rem;
    border: 1px solid var(--pp-line);
    border-radius: 14px;
    background: var(--pp-card);
    transition:
      transform 0.25s,
      border-color 0.25s,
      box-shadow 0.25s;
  }

  .price-card:hover {
    transform: translateY(-4px);
    border-color: rgba(96, 165, 250, 0.45);
    box-shadow: 0 24px 50px -34px rgba(0, 0, 0, 0.9);
  }

  .price-card.featured {
    border-color: var(--pp-blue);
    background: var(--pp-card-featured);
    box-shadow: 0 20px 45px -30px rgba(37, 99, 235, 0.9);
  }

  .ribbon {
    position: absolute;
    top: -0.7rem;
    left: 0.9rem;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    background: var(--pp-blue);
    color: #fff;
    font-size: 0.62rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .card-head h3 {
    margin: 0;
    color: #fff;
    font-size: 0.95rem;
    font-weight: 700;
  }

  .price {
    margin: 0.55rem 0 0;
    color: #3b82f6;
    font-size: clamp(1.45rem, 2.1vw, 1.9rem);
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1.1;
  }

  .period {
    margin: 0.25rem 0 0;
    color: var(--pp-muted);
    font-size: 0.72rem;
  }

  .plan-desc {
    min-height: 3.2rem;
    margin: 0.9rem 0 0;
    padding-bottom: 0.9rem;
    border-bottom: 1px solid var(--pp-line);
    color: #cbd5e1;
    font-size: 0.8rem;
    line-height: 1.45;
  }

  .plan-features {
    display: grid;
    gap: 0.55rem;
    flex: 1;
    margin: 0.9rem 0 1.1rem;
    padding: 0;
    list-style: none;
  }

  .plan-features li {
    display: flex;
    align-items: flex-start;
    gap: 0.45rem;
    color: #cbd5e1;
    font-size: 0.76rem;
    line-height: 1.4;
  }

  .plan-features svg {
    flex-shrink: 0;
    margin-top: 1px;
    color: var(--pp-green);
  }

  .plan-cta {
    width: 100%;
    border-radius: 8px;
    padding: 0.65rem 0.75rem;
    font: inherit;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    transition:
      background-color 0.2s,
      border-color 0.2s,
      opacity 0.2s;
  }

  .plan-cta.is-primary {
    border: 1px solid var(--pp-blue);
    background: var(--pp-blue);
    color: #fff;
  }

  .plan-cta.is-primary:hover {
    background: #1d4ed8;
  }

  .plan-cta.is-outline {
    border: 1px solid rgba(148, 163, 184, 0.35);
    background: transparent;
    color: #e2e8f0;
  }

  .plan-cta.is-outline:hover {
    border-color: rgba(96, 165, 250, 0.7);
    background: rgba(37, 99, 235, 0.08);
  }

  .plan-cta:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  @media (max-width: 1100px) {
    .pricing-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .pricing-planes {
      padding: 1rem;
      border-radius: 18px;
    }

    .pricing-grid {
      grid-template-columns: 1fr;
    }

    .plan-desc {
      min-height: 0;
    }
  }
</style>

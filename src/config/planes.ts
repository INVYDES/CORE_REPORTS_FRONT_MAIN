export type CicloPago = 'mensual' | 'anual'

export interface PlanCatalogo {
  codigo: string
  nombreKey: string
  descripcionKey: string
  usuariosKey: string
  precioMensual: number | null
  precioAnual: number | null
  codigoLicenciaMensual?: string
  codigoLicenciaAnual?: string
  destacado?: boolean
  gratuito?: boolean
  empresarial?: boolean
  featuresKeys: string[]
}

const FEATURES_BASE = [
  'landing.pricing.features.reports',
  'landing.pricing.features.tickets',
  'landing.pricing.features.analytics',
  'landing.pricing.features.support',
]

export const PLANES: PlanCatalogo[] = [
  {
    codigo: 'gratis',
    nombreKey: 'landing.pricing.plans.free.name',
    descripcionKey: 'landing.pricing.plans.free.description',
    usuariosKey: 'landing.pricing.plans.free.users',
    precioMensual: 0,
    precioAnual: 0,
    codigoLicenciaMensual: 'trial',
    codigoLicenciaAnual: 'trial',
    gratuito: true,
    featuresKeys: [
      'landing.pricing.features.reports',
      'landing.pricing.features.tickets',
      'landing.pricing.features.analytics',
    ],
  },
  {
    codigo: 'usuarios_5',
    nombreKey: 'landing.pricing.plans.plan5.name',
    descripcionKey: 'landing.pricing.plans.plan5.description',
    usuariosKey: 'landing.pricing.plans.plan5.users',
    precioMensual: 399,
    precioAnual: 3990,
    codigoLicenciaMensual: 'usuarios_5_mensual',
    codigoLicenciaAnual: 'usuarios_5_anual',
    featuresKeys: FEATURES_BASE,
  },
  {
    codigo: 'usuarios_10',
    nombreKey: 'landing.pricing.plans.plan10.name',
    descripcionKey: 'landing.pricing.plans.plan10.description',
    usuariosKey: 'landing.pricing.plans.plan10.users',
    precioMensual: 699,
    precioAnual: 6990,
    codigoLicenciaMensual: 'usuarios_10_mensual',
    codigoLicenciaAnual: 'usuarios_10_anual',
    destacado: true,
    featuresKeys: FEATURES_BASE,
  },
  {
    codigo: 'usuarios_30',
    nombreKey: 'landing.pricing.plans.plan30.name',
    descripcionKey: 'landing.pricing.plans.plan30.description',
    usuariosKey: 'landing.pricing.plans.plan30.users',
    precioMensual: 1999,
    precioAnual: 19990,
    codigoLicenciaMensual: 'usuarios_30_mensual',
    codigoLicenciaAnual: 'usuarios_30_anual',
    featuresKeys: [
      ...FEATURES_BASE,
      'landing.pricing.features.onboarding',
      'landing.pricing.features.updates',
    ],
  },
  {
    codigo: 'empresarial',
    nombreKey: 'landing.pricing.plans.enterprise.name',
    descripcionKey: 'landing.pricing.plans.enterprise.description',
    usuariosKey: 'landing.pricing.plans.enterprise.users',
    precioMensual: null,
    precioAnual: null,
    empresarial: true,
    featuresKeys: [
      ...FEATURES_BASE,
      'landing.pricing.features.onboarding',
      'landing.pricing.features.updates',
    ],
  },
]

export const PLAN_POR_CODIGO = new Map(PLANES.map(plan => [plan.codigo, plan]))

import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PricingPlans from './PricingPlans.vue'
import i18n, { cambiarIdioma } from '../../i18n'

describe('PricingPlans', () => {
  beforeEach(() => {
    cambiarIdioma('es')
  })

  it('muestra los cinco planes con el plan de 10 usuarios destacado', () => {
    const wrapper = mount(PricingPlans, { global: { plugins: [i18n] } })
    const cards = wrapper.findAll('.price-card')

    expect(cards).toHaveLength(5)
    expect(wrapper.text()).toContain('Gratis')
    expect(wrapper.text()).toContain('$399')
    expect(wrapper.text()).toContain('$699')
    expect(wrapper.text()).toContain('$1,999')
    expect(wrapper.text()).toContain('A la medida')
    expect(wrapper.find('.price-card.featured').text()).toContain('10 usuarios')
    expect(wrapper.find('.price-card.featured').text()).toContain('Más elegido')
  })

  it('cambia los precios al ciclo anual y emite el plan seleccionado', async () => {
    const wrapper = mount(PricingPlans, { global: { plugins: [i18n] } })
    const botones = wrapper.findAll('.pricing-toggle button')

    await botones[1]!.trigger('click')

    expect(wrapper.text()).toContain('$3,990')
    expect(wrapper.text()).toContain('$6,990')
    expect(wrapper.text()).toContain('$19,990')

    await wrapper.findAll('.price-card')[1]!.find('.plan-cta').trigger('click')

    expect(wrapper.emitted('select')?.[0]?.[0]).toMatchObject({
      plan: { codigo: 'usuarios_5' },
      ciclo: 'anual',
    })
  })
})

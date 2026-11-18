import { describe, expect, it } from 'vitest'
import { notificationAreaTarget, notificationTarget } from './notificacionTarget'

describe('notificationTarget', () => {
  it('navega al ticket real referenciado', () => {
    expect(notificationTarget({ referencia_tipo: 'ticket', referencia_id: 42 })).toEqual({
      name: 'ticket-detail',
      params: { id: 42 },
    })
  })

  it('navega al servicio real referenciado', () => {
    expect(notificationTarget({ referencia_tipo: 'servicio', referencia_id: 7 })).toEqual({
      name: 'service-detail',
      params: { id: 7 },
    })
  })

  it('navega al reporte real referenciado', () => {
    expect(notificationTarget({ referencia_tipo: 'reporte', referencia_id: 9 })).toEqual({
      name: 'report-detail',
      params: { id: 9 },
    })
  })

  it('no navega si la referencia no es válida', () => {
    expect(notificationTarget({ referencia_tipo: 'ticket', referencia_id: 0 })).toBeNull()
  })
})

describe('notificationAreaTarget', () => {
  it('lleva primero a la lista de tickets del área', () => {
    expect(
      notificationAreaTarget({
        referencia_tipo: 'ticket',
        area_id: 3,
        area: { id: 3, nombre: 'Fundición' },
      })
    ).toEqual({
      name: 'tickets',
      query: { area_id: '3', area_nombre: 'Fundición' },
    })
  })

  it('lleva primero a la lista de servicios del área', () => {
    expect(
      notificationAreaTarget({
        referencia_tipo: 'servicio',
        area_id: 4,
        area: { id: 4, nombre: 'Mantenimiento' },
      })
    ).toEqual({
      name: 'schedule-list',
      query: { area_id: '4', area_nombre: 'Mantenimiento' },
    })
  })

  it('lleva primero a la lista de reportes del área', () => {
    expect(
      notificationAreaTarget({
        referencia_tipo: 'reporte',
        area_id: 5,
        area: { id: 5, nombre: 'Calidad' },
      })
    ).toEqual({
      name: 'reports',
      query: { area_id: '5', area_nombre: 'Calidad' },
    })
  })

  it('usa el área de la referencia cuando no viene en la notificación', () => {
    expect(
      notificationAreaTarget({
        referencia_tipo: 'ticket',
        referencia: { id: 1, area_id: 8 },
      })
    ).toEqual({
      name: 'tickets',
      query: { area_id: '8' },
    })
  })

  it('no navega al área si no hay área válida', () => {
    expect(notificationAreaTarget({ referencia_tipo: 'ticket' })).toBeNull()
  })
})

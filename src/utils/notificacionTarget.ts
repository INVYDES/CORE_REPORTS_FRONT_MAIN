import type { RouteLocationRaw } from 'vue-router'
import type { NotificacionItem } from '../composables/useNotificacionesRealtime'

export function notificationTarget(
  notification: Pick<NotificacionItem, 'referencia_tipo' | 'referencia_id'>
): RouteLocationRaw | null {
  const id = Number(notification.referencia_id)
  if (!Number.isFinite(id) || id <= 0) return null

  switch (notification.referencia_tipo) {
    case 'ticket':
      return { name: 'ticket-detail', params: { id } }
    case 'servicio':
      return { name: 'service-detail', params: { id } }
    case 'reporte':
      return { name: 'report-detail', params: { id } }
    default:
      return null
  }
}

export function notificationAreaTarget(
  notification: Pick<NotificacionItem, 'referencia_tipo' | 'area_id' | 'area' | 'referencia'>
): RouteLocationRaw | null {
  const areaId = Number(notification.area_id ?? notification.referencia?.area_id)
  if (!Number.isFinite(areaId) || areaId <= 0) return null

  const query: Record<string, string> = { area_id: String(areaId) }
  if (notification.area?.nombre) query.area_nombre = notification.area.nombre

  switch (notification.referencia_tipo) {
    case 'ticket':
      return { name: 'tickets', query }
    case 'servicio':
      return { name: 'schedule-list', query }
    case 'reporte':
      return { name: 'reports', query }
    default:
      return null
  }
}

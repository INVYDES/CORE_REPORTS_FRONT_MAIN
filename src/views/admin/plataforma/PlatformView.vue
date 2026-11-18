<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import client from '../../../api/client'
  import { useToast } from 'vue-toastification'
  import {
    AlertTriangle,
    Ban,
    Building2,
    CheckCircle2,
    DollarSign,
    Pencil,
    Power,
    RefreshCw,
    Search,
    ShieldCheck,
    Trash2,
    Users,
    X,
  } from 'lucide-vue-next'

  const toast = useToast()

  const resumen = ref<any>(null)
  const dependencias = ref<any[]>([])
  const meta = ref<any>({ current_page: 1, last_page: 1, total: 0 })
  const loading = ref(false)
  const saving = ref(false)
  const search = ref('')
  const estado = ref('')
  const editing = ref<any>(null)

  const cargando = computed(() => loading.value)

  const fmtMoney = (value: number | string | null | undefined) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
      Number(value || 0)
    )

  const fmtDate = (value: string | null | undefined) => (value ? String(value).slice(0, 10) : '—')

  const estadoInfo = (dep: any) => {
    if (dep.activa === false) return { label: 'Desactivada', clase: 'badge-off' }
    if (dep.vencida) return { label: 'Vencida', clase: 'badge-warn' }
    return { label: 'Activa', clase: 'badge-on' }
  }

  const loadResumen = async () => {
    try {
      const { data } = await client.get('/plataforma/resumen')
      resumen.value = data.data
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'No se pudo cargar el resumen')
    }
  }

  const loadDependencias = async (page = 1) => {
    loading.value = true
    try {
      const { data } = await client.get('/plataforma/dependencias', {
        params: {
          page,
          per_page: 15,
          q: search.value || undefined,
          estado: estado.value || undefined,
        },
      })
      dependencias.value = data.data || []
      meta.value = data.meta || meta.value
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'No se pudieron cargar los clientes')
    } finally {
      loading.value = false
    }
  }

  const refresh = async () => {
    await Promise.all([loadResumen(), loadDependencias(meta.value.current_page || 1)])
  }

  const buscar = () => loadDependencias(1)

  const abrirEdicion = (dep: any) => {
    editing.value = {
      id: dep.id,
      nombre: dep.nombre,
      tipo_licencia: dep.tipo_licencia,
      fecha_expiracion: dep.fecha_expiracion || '',
      limite_usuarios: dep.limite_usuarios,
      limite_reportes_mensuales: dep.limite_reportes_mensuales,
      activa: dep.activa,
    }
  }

  const guardarLicencia = async () => {
    if (!editing.value) return
    saving.value = true
    try {
      await client.patch(`/plataforma/dependencias/${editing.value.id}/licencia`, {
        tipo_licencia: editing.value.tipo_licencia,
        fecha_expiracion: editing.value.fecha_expiracion || null,
        limite_usuarios: Number(editing.value.limite_usuarios),
        limite_reportes_mensuales: Number(editing.value.limite_reportes_mensuales),
        activa: !!editing.value.activa,
      })
      toast.success('Licencia actualizada')
      editing.value = null
      await refresh()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'No se pudo actualizar la licencia')
    } finally {
      saving.value = false
    }
  }

  const alternarEstado = async (dep: any) => {
    const accion = dep.activa ? 'desactivar' : 'activar'
    if (!confirm(`¿Deseas ${accion} la licencia de ${dep.nombre}?`)) return
    try {
      await client.patch(`/plataforma/dependencias/${dep.id}/estado`)
      toast.success(`Licencia ${dep.activa ? 'desactivada' : 'activada'}`)
      await refresh()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'No se pudo cambiar el estado')
    }
  }

  const eliminar = async (dep: any) => {
    if (!confirm(`¿Eliminar a ${dep.nombre}? Se desactivarán sus usuarios y ya no podrá acceder.`))
      return
    try {
      await client.delete(`/plataforma/dependencias/${dep.id}`)
      toast.success('Cliente eliminado')
      await refresh()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'No se pudo eliminar el cliente')
    }
  }

  onMounted(refresh)
</script>

<template>
  <div class="platform-page">
    <header class="page-header">
      <div>
        <span class="eyebrow"><ShieldCheck :size="16" /> Plataforma</span>
        <h1>Administración de licencias</h1>
        <p>Clientes, vencimientos y cobros de CsRecords.</p>
      </div>
      <button class="btn-secondary" :disabled="cargando" @click="refresh">
        <RefreshCw :size="16" />
        Actualizar
      </button>
    </header>

    <section class="stats-grid">
      <article class="stat-card">
        <div class="stat-icon blue"><Building2 :size="20" /></div>
        <div>
          <span>Clientes</span>
          <strong>{{ resumen?.total_dependencias ?? '—' }}</strong>
        </div>
      </article>
      <article class="stat-card">
        <div class="stat-icon green"><CheckCircle2 :size="20" /></div>
        <div>
          <span>Activas</span>
          <strong>{{ resumen?.activas ?? '—' }}</strong>
        </div>
      </article>
      <article class="stat-card">
        <div class="stat-icon amber"><AlertTriangle :size="20" /></div>
        <div>
          <span>Vencidas</span>
          <strong>{{ resumen?.vencidas ?? '—' }}</strong>
        </div>
      </article>
      <article class="stat-card">
        <div class="stat-icon violet"><DollarSign :size="20" /></div>
        <div>
          <span>Ingresos del mes</span>
          <strong>{{ fmtMoney(resumen?.ingresos_mes) }}</strong>
        </div>
      </article>
      <article class="stat-card">
        <div class="stat-icon rose"><Ban :size="20" /></div>
        <div>
          <span>Desactivadas</span>
          <strong>{{ resumen?.desactivadas ?? '—' }}</strong>
        </div>
      </article>
      <article class="stat-card">
        <div class="stat-icon slate"><Users :size="20" /></div>
        <div>
          <span>Usuarios</span>
          <strong>{{ resumen?.usuarios ?? '—' }}</strong>
        </div>
      </article>
    </section>

    <section class="panel">
      <div class="toolbar">
        <div class="search-box">
          <Search :size="16" />
          <input
            v-model="search"
            type="search"
            placeholder="Buscar empresa, RFC o correo"
            @keyup.enter="buscar"
          />
        </div>
        <select v-model="estado" class="select" @change="buscar">
          <option value="">Todos los estados</option>
          <option value="activa">Activas</option>
          <option value="vencida">Vencidas</option>
          <option value="desactivada">Desactivadas</option>
          <option value="trial">En trial</option>
        </select>
        <span class="total">{{ meta.total }} clientes</span>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Contacto</th>
              <th>Plan</th>
              <th>Vencimiento</th>
              <th>Usuarios</th>
              <th>Estado</th>
              <th class="right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="dep in dependencias" :key="dep.id">
              <td>
                <div class="company-cell">
                  <div class="avatar">{{ (dep.nombre || '?').slice(0, 2).toUpperCase() }}</div>
                  <div>
                    <strong>{{ dep.nombre }}</strong>
                    <small>{{ dep.rfc || 'Sin RFC' }}</small>
                  </div>
                </div>
              </td>
              <td>
                <div class="contact-cell">
                  <span>{{ dep.correo_contacto || '—' }}</span>
                  <small>{{ dep.telefono || '' }}</small>
                </div>
              </td>
              <td class="capitalize">{{ dep.tipo_licencia }}</td>
              <td>{{ fmtDate(dep.fecha_expiracion) }}</td>
              <td>
                <span class="usage">{{ dep.usuarios_count ?? 0 }} / {{ dep.limite_usuarios }}</span>
              </td>
              <td>
                <span class="badge" :class="estadoInfo(dep).clase">
                  {{ estadoInfo(dep).label }}
                </span>
              </td>
              <td>
                <div class="actions">
                  <button title="Editar licencia" @click="abrirEdicion(dep)">
                    <Pencil :size="16" />
                  </button>
                  <button
                    :title="dep.activa ? 'Desactivar' : 'Activar'"
                    @click="alternarEstado(dep)"
                  >
                    <Power :size="16" />
                  </button>
                  <button class="danger" title="Eliminar cliente" @click="eliminar(dep)">
                    <Trash2 :size="16" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!cargando && dependencias.length === 0">
              <td colspan="7" class="empty">No hay clientes que coincidan con el filtro.</td>
            </tr>
          </tbody>
        </table>
        <div v-if="cargando" class="loading">Cargando clientes…</div>
      </div>

      <div class="pagination">
        <button
          class="btn-secondary"
          :disabled="meta.current_page <= 1 || cargando"
          @click="loadDependencias(meta.current_page - 1)"
        >
          Anterior
        </button>
        <span>Página {{ meta.current_page }} de {{ meta.last_page }}</span>
        <button
          class="btn-secondary"
          :disabled="meta.current_page >= meta.last_page || cargando"
          @click="loadDependencias(meta.current_page + 1)"
        >
          Siguiente
        </button>
      </div>
    </section>

    <section v-if="resumen?.ultimos_pagos?.length" class="panel payments">
      <h2>Últimos pagos</h2>
      <div class="payment-list">
        <div v-for="pago in resumen.ultimos_pagos" :key="pago.id" class="payment-row">
          <div>
            <strong>{{ pago.dependencia || 'Cliente eliminado' }}</strong>
            <small>{{ pago.licencia || 'Plan' }} · {{ pago.metodo }}</small>
          </div>
          <span class="badge" :class="pago.estado === 'aprobado' ? 'badge-on' : 'badge-warn'">
            {{ pago.estado }}
          </span>
          <strong>{{ fmtMoney(pago.monto) }}</strong>
          <small>{{ pago.pagado_en ? new Date(pago.pagado_en).toLocaleDateString('es-MX') : '—' }}</small>
        </div>
      </div>
    </section>

    <div v-if="editing" class="modal-overlay" @click.self="editing = null">
      <div class="modal">
        <header>
          <div>
            <h2>Editar licencia</h2>
            <p>{{ editing.nombre }}</p>
          </div>
          <button class="icon-btn" @click="editing = null"><X :size="18" /></button>
        </header>

        <div class="form-grid">
          <label>
            Plan
            <select v-model="editing.tipo_licencia">
              <option value="trial">Trial</option>
              <option value="mensual">Mensual</option>
              <option value="anual">Anual</option>
            </select>
          </label>
          <label>
            Fecha de expiración
            <input v-model="editing.fecha_expiracion" type="date" />
          </label>
          <label>
            Límite de usuarios
            <input v-model.number="editing.limite_usuarios" type="number" min="1" />
          </label>
          <label>
            Límite de reportes mensuales
            <input v-model.number="editing.limite_reportes_mensuales" type="number" min="0" />
          </label>
          <label class="checkbox">
            <input v-model="editing.activa" type="checkbox" />
            Licencia activa
          </label>
        </div>

        <footer>
          <button class="btn-secondary" @click="editing = null">Cancelar</button>
          <button class="btn-primary" :disabled="saving" @click="guardarLicencia">
            {{ saving ? 'Guardando…' : 'Guardar cambios' }}
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .platform-page {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
    color: #0f172a;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
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

  .page-header h1 {
    margin: 0.35rem 0 0.25rem;
    font-size: 1.75rem;
  }

  .page-header p {
    margin: 0;
    color: #64748b;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 1rem;
    border-radius: 14px;
    background: #fff;
    border: 1px solid #e2e8f0;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
  }

  .stat-card span {
    display: block;
    color: #64748b;
    font-size: 0.78rem;
  }

  .stat-card strong {
    font-size: 1.35rem;
  }

  .stat-icon {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }

  .stat-icon.blue { background: #dbeafe; color: #1d4ed8; }
  .stat-icon.green { background: #dcfce7; color: #15803d; }
  .stat-icon.amber { background: #fef3c7; color: #b45309; }
  .stat-icon.violet { background: #ede9fe; color: #6d28d9; }
  .stat-icon.rose { background: #ffe4e6; color: #be123c; }
  .stat-icon.slate { background: #e2e8f0; color: #334155; }

  .panel {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
    overflow: hidden;
  }

  .toolbar {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #e2e8f0;
    flex-wrap: wrap;
  }

  .search-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 0.75rem;
    border: 1px solid #cbd5e1;
    border-radius: 10px;
    min-width: 280px;
    flex: 1;
    color: #64748b;
  }

  .search-box input {
    border: none;
    outline: none;
    width: 100%;
    font: inherit;
    color: #0f172a;
  }

  .select {
    padding: 0.55rem 0.75rem;
    border: 1px solid #cbd5e1;
    border-radius: 10px;
    background: #fff;
    font: inherit;
  }

  .total {
    color: #64748b;
    font-size: 0.85rem;
    margin-left: auto;
  }

  .table-wrap {
    position: relative;
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
  }

  th {
    text-align: left;
    padding: 0.75rem 1rem;
    background: #f8fafc;
    color: #64748b;
    font-size: 0.72rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  th.right { text-align: right; }

  td {
    padding: 0.85rem 1rem;
    border-top: 1px solid #f1f5f9;
    vertical-align: middle;
  }

  .company-cell {
    display: flex;
    align-items: center;
    gap: 0.7rem;
  }

  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: #ede9fe;
    color: #6d28d9;
    display: grid;
    place-items: center;
    font-weight: 800;
    font-size: 0.75rem;
    flex-shrink: 0;
  }

  .company-cell strong { display: block; }
  .company-cell small,
  .contact-cell small {
    color: #94a3b8;
    font-size: 0.75rem;
  }

  .contact-cell span { display: block; }

  .capitalize { text-transform: capitalize; }

  .usage {
    font-weight: 600;
    color: #334155;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .badge-on { background: #dcfce7; color: #15803d; }
  .badge-warn { background: #fef3c7; color: #b45309; }
  .badge-off { background: #e2e8f0; color: #475569; }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.35rem;
  }

  .actions button,
  .icon-btn {
    border: 1px solid #e2e8f0;
    background: #fff;
    color: #475569;
    border-radius: 8px;
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: all 0.15s;
  }

  .actions button:hover,
  .icon-btn:hover {
    border-color: #c4b5fd;
    color: #6d28d9;
    background: #f5f3ff;
  }

  .actions button.danger:hover {
    border-color: #fecdd3;
    color: #be123c;
    background: #fff1f2;
  }

  .empty {
    text-align: center;
    padding: 2.5rem 1rem;
    color: #64748b;
  }

  .loading {
    padding: 2rem;
    text-align: center;
    color: #64748b;
  }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 1rem;
    border-top: 1px solid #e2e8f0;
    font-size: 0.85rem;
    color: #64748b;
  }

  .btn-primary,
  .btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    border-radius: 9px;
    padding: 0.6rem 0.9rem;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-primary {
    background: #6d28d9;
    border: 1px solid #6d28d9;
    color: #fff;
  }

  .btn-primary:disabled,
  .btn-secondary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: #fff;
    border: 1px solid #cbd5e1;
    color: #334155;
  }

  .payments {
    margin-top: 1.5rem;
    padding: 1.25rem;
  }

  .payments h2 {
    font-size: 1rem;
    margin: 0 0 0.75rem;
  }

  .payment-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .payment-row {
    display: grid;
    grid-template-columns: 2fr auto auto auto;
    gap: 1rem;
    align-items: center;
    padding: 0.7rem 0.85rem;
    border: 1px solid #f1f5f9;
    border-radius: 10px;
    font-size: 0.85rem;
  }

  .payment-row small {
    color: #94a3b8;
    display: block;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    display: grid;
    place-items: center;
    padding: 1rem;
    z-index: 60;
  }

  .modal {
    width: 100%;
    max-width: 560px;
    background: #fff;
    border-radius: 16px;
    padding: 1.25rem;
    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.25);
  }

  .modal header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .modal h2 {
    margin: 0;
    font-size: 1.15rem;
  }

  .modal header p {
    margin: 0.15rem 0 0;
    color: #64748b;
    font-size: 0.85rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.9rem;
  }

  .form-grid label {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: #475569;
  }

  .form-grid input,
  .form-grid select {
    padding: 0.55rem 0.7rem;
    border: 1px solid #cbd5e1;
    border-radius: 9px;
    font: inherit;
  }

  .form-grid .checkbox {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    align-self: end;
    padding-bottom: 0.5rem;
  }

  .modal footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    margin-top: 1.25rem;
  }

  @media (max-width: 720px) {
    .platform-page { padding: 1rem; }
    .page-header { flex-direction: column; }
    .form-grid { grid-template-columns: 1fr; }
    .payment-row { grid-template-columns: 1fr auto; }
  }
</style>

<script setup lang="ts">
    import { ref, computed, onMounted } from 'vue'
    import { useRouter } from 'vue-router'
    import { useAuthStore } from '../../../stores/authStore'
    import { storeToRefs } from 'pinia'
    import { apiFetch } from '../../../api/apiClient'
    import { Star, FileEdit, ChevronRight } from 'lucide-vue-next'
    
    // Store
    const authStore = useAuthStore()
    const { currentUser } = storeToRefs(authStore)
    const router = useRouter()

    const openEditReport = (idReporte: number) => {
        router.push({ name: 'report-edit', params: { id: idReporte } })
    }

    // Role-based access: tech roles (1: Admin Técnico, 3: Técnico) and commercial admin (2) can view reports
    if (!currentUser.value || (currentUser.value.rol !== 1 && currentUser.value.rol !== 2 && currentUser.value.rol !== 3)) {
        router.push({ name: 'dashboard' })
    }

    const searchQuery = ref('')
    const filterTipo = ref('Todos') // 'Todos', 'Ticket', 'Servicio Programado'
    const dateFilter = ref('')

    const reportes = ref<any[]>([])
    const tickets = ref<any[]>([])
    const services = ref<any[]>([])
    const users = ref<any[]>([])
    const isLoading = ref(true)

    const fetchData = async () => {
        isLoading.value = true
        try {
            const [repRes, tRes, sRes, uRes] = await Promise.all([
                apiFetch('/reportes'),
                apiFetch('/tickets').catch(() => ({ data: [] })),
                apiFetch('/servicios').catch(() => ({ data: [] })),
                apiFetch('/usuarios').catch(() => ({ data: [] }))
            ])

            if (repRes.data) reportes.value = repRes.data
            if (tRes.data) tickets.value = tRes.data
            if (sRes.data) services.value = sRes.data
            if (uRes.data) users.value = uRes.data
        } catch (error) {
            console.error('Error al cargar reportes:', error)
        } finally {
            isLoading.value = false
        }
    }

    onMounted(() => {
        fetchData()
    })

    // Get the name of the person who creates it or is responsible
    const getUserName = (id: number | null) => {
        if(!id) return 'Sin Asignar'    
        const user = users.value.find(u => u.idUsuario === id || u.id === id)
        return user ? `${user.nombre} ${user.apellidos}` : 'Usuario Desconocido'
    }

    // Get the Title/Folio of the parent Ticket or Service
    const getOrigenDetails = (reporte: any) => {
        if(reporte.tipoReporte === 'Libre' || !reporte.origenDatosId) {
            return { folio: 'N/A', asunto: ' Reporte Independiente / Libre '}
        }

        if(reporte.tipoReporte === 'Ticket'){
            const ticket = tickets.value.find(t => t.id === reporte.origenDatosId)
            return ticket
                ? { folio: `Ticket: ${ticket.folio}`, asunto: ticket.asunto }
                : { folio: `Ticket #${reporte.origenDatosId}`, asunto: 'Ticket' }
        }

        if(reporte.tipoReporte === 'Servicio Programado'){
            const service = services.value.find(s=> s.id === reporte.origenDatosId)
            return service
                ? { folio: `Servicio: ${service.folio}`, asunto: service.asunto }
                : { folio: `Servicio #${reporte.origenDatosId}`, asunto: 'Servicio Programado' }
        }

        return { folio: '---', asunto: 'Tipo de origen desconocido' }
    }

    // Check if the report has a customer survey
    const hasSurvey = (reportIdOrObj: any) => {
        if (typeof reportIdOrObj === 'object' && reportIdOrObj !== null) {
            return !!(reportIdOrObj?.encuesta && reportIdOrObj?.encuesta?.calificacion)
        }
        const rep = reportes.value.find(r => r.idReporte === reportIdOrObj || r.id === reportIdOrObj)
        return !!(rep?.encuesta && rep?.encuesta?.calificacion)
    }

    // Form date for display
    const formatDate = (dateString: string) => {
        if (!dateString) return '---'
        const date = new Date(dateString)
        return date.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit'})
    }

    // Filter Engine
    const filteredReports = computed(() => {
        return reportes.value
            // Multi-tenant security
            .filter(r => !currentUser.value?.idDependencia || r.idDependencia === currentUser.value.idDependencia)
            // Punto 3: Restricción de rol (Solo rol 1 y 2 ven todos; otros roles solo ven los propios creados o ejecutados)
            .filter(r => {
                if (!currentUser.value || currentUser.value.rol === 1 || currentUser.value.rol === 2) {
                    return true
                }
                const myId = currentUser.value.idUsuario
                const isCreator = (r.creadoPor === myId) || (r.creado_por === myId)
                const isExecutor = (r.ejecutoresIds && r.ejecutoresIds.includes(myId)) ||
                                   (r.ejecutores && r.ejecutores.some((e: any) => e.idUsuario === myId || e.id_usuario === myId))
                return isCreator || isExecutor
            })
            // Filter by type dropdown
            .filter(r => filterTipo.value === 'Todos' || r.tipoReporte === filterTipo.value)
            // Search bar
            .filter(r => {
                if(!searchQuery.value) return true
                const query = searchQuery.value.toLowerCase()
                const folioMatch = (r.folio || '').toLowerCase().includes(query)
                const originDetails = getOrigenDetails(r)
                const originMatch = (originDetails?.folio || '').toLowerCase().includes(query) || (originDetails?.asunto || '').toLowerCase().includes(query)
                return folioMatch || originMatch
            })
            // Filter by Date
            .filter(r => {
                if (!dateFilter.value) return true
                return (r.fechaElaboracion || '').startsWith(dateFilter.value)
            })
            .sort((a,b) => new Date(b.fechaElaboracion).getTime() - new Date(a.fechaElaboracion).getTime())
    })

</script>
<!------------------------------------------------------------------------------------------------------------------>
<template>
    <div class="page-container-report-list">

        <!-- Header -->
        <div class="page-header">
            
            <!-- Header title-->
            <h2>
                Gestión de Reportes
            </h2>
        </div>

        <!-- Filter Rows-->
        <div class="filters-row">
            <!-- Search box -->
            <div class="search-box">
                
                <!-- Search Icon-->
                <span class="search-icon">🔍</span>

                <!-- Input search box -->
                <input 
                    type="text" 
                    v-model="searchQuery" 
                    placeholder="Buscar reporte por folio o asunto..." 
                />
                
            </div>
            
            <!-- Date Filter -->
            <DateFilter v-model="dateFilter" style="max-width: 200px;" />
        
        <!-- Dropdown List Filter Type-->
            <select v-model="filterTipo" class="filter-dropdown">
                <option value="Todos">Todos los Tipos</option>
                <option value="Ticket">Tickets</option>
                <option value="Servicio Programado">Servicios Programados</option>
                <option value="Libre">Libres</option>
            </select>
        </div>

        <!-- List card-->
        <div class="list-card">

            <!-- Table cols-->
            <div class="list-header">
                <div class="col-folio">REPORTE</div>
                <div class="col-details">DETALLES DEL REPORTE</div>
                <div class="col-user">ELABORÓ</div>
                <div class="col-status text-center">ESTATUS</div>
                <div class="col-action text-right">ACCIONES</div>
            </div>

            <!-- Filtered Reports: Empty State -->
            <div v-if="filteredReports.length === 0" class="empty-state">
                <p>No se encontraron reportes con los filtros actuales.</p>
            </div>

            <!-- Table Filtered reports-->
            <div 
                v-for="report in filteredReports" 
                :key="report.idReporte" 
                class="list-item cursor-pointer"
                @click="router.push({ name: 'report-detail', params: { id: report.idReporte } })"
            >
                <!-- Col Folio -->
                <div class="col-folio">
                    <span class="font-semibold text-slate-900 block">{{ report.folio }}</span>
                    <span class="text-xs text-slate-500 mt-1 block">Elab: {{ formatDate(report.fechaElaboracion) }}</span>
                </div>

                <!-- Col details -->
                <div class="col-details">
                    <div class="details-title">
                        <span 
                            class="badge-origin flex-shrink-0" 
                            :class="{
                                'bg-ticket': report.tipoReporte === 'Ticket',
                                'bg-servicio': report.tipoReporte === 'Servicio Programado',
                                'bg-libre': report.tipoReporte === 'Libre'
                            }"
                        >
                            {{ report.tipoReporte === 'Libre' ? 'Libre' : getOrigenDetails(report).folio }}
                        </span>
                        <span class="details-asunto" :title="getOrigenDetails(report).asunto">
                            {{ getOrigenDetails(report).asunto }}
                        </span>
                    </div>

                    <!-- Activities description -->
                    <p class="report-desc" :title="report.desarrolloActividades">
                        {{ report.desarrolloActividades || 'Sin descripción de actividades.' }}
                    </p>
                </div>

                <!-- Creado por col-->
                <div class="col-user" :title="getUserName(report.creadoPor)">
                    <span>{{ getUserName(report.creadoPor) }}</span>
                </div>

                <!-- Col Status-->
                <div class="col-status">
                    <!-- Pill Status -->
                    <span 
                        class="status-pill text-center leading-tight"
                        :class="report.estatusReporte === 'Cerrado / Trabajo Finalizado' ? 'pill-success' : 'pill-warning'"
                    >
                        {{ report.estatusReporte === 'Cerrado / Trabajo Finalizado' ? 'FINALIZADO' : 'TRABAJO PARCIAL' }}
                    </span>
                    <!-- Survey Indicator -->
                    <Star 
                        :size="16" 
                        class="flex-shrink-0"
                        :class="hasSurvey(report.idReporte) ? 'text-amber-400' : 'text-slate-300'" 
                        :fill="hasSurvey(report.idReporte) ? 'currentColor' : 'none'"
                        :title="hasSurvey(report.idReporte) ? 'Evaluación Completada' : 'Evaluación Pendiente'"
                    />
                </div>

                <!-- Col Action -->
                <div class="col-action">
                    <button 
                        v-if="report.estatusReporte === 'Cerrado / Trabajo Finalizado'"
                        type="button"
                        class="btn-edit-report"
                        @click.stop="openEditReport(report.idReporte)"
                        title="Editar reporte finalizado"
                    >
                        <FileEdit :size="13" />
                        <span>Editar Reporte</span>
                    </button>
                    <button 
                        v-else
                        type="button"
                        class="btn-edit-report-partial"
                        @click.stop="openEditReport(report.idReporte)"
                        title="Editar o completar reporte"
                    >
                        <FileEdit :size="13" />
                        <span>Editar</span>
                    </button>
                    <ChevronRight :size="18" class="chevron-arrow" />
                </div>

            </div>
        </div>
    </div>
</template>
<!------------------------------------------------------------------------------------------------------------------>
<style scoped>
/* Main Container & Header */
.page-container-report-list { padding: 2rem; max-width: 1200px; margin: 0 auto; font-family: system-ui, -apple-system, sans-serif; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.page-header h2 { margin: 0; color: #0f172a; font-size: 1.75rem; }

/* Filters */
.filters-row { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
.search-box { flex-grow: 1; position: relative; display: flex; align-items: center; }
.search-icon { position: absolute; left: 1rem; color: #94a3b8; }
.search-box input { width: 100%; padding: 0.6rem 1rem 0.6rem 2.5rem; border: 1px solid #e2e8f0; border-radius: 6px; background: white; color: #1e293b; outline: none; transition: border-color 0.2s; }
.search-box input:focus { border-color: #3b82f6; }
.filter-dropdown { padding: 0.6rem 2rem 0.6rem 1rem; border: 1px solid #e2e8f0; border-radius: 6px; background: white; outline: none; cursor: pointer; color: #475569; }

/* Main Card Container */
.list-card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }

/* Grid Layout for Rows */
.list-header, .list-item { 
    display: grid; 
    grid-template-columns: 140px minmax(0, 1fr) 150px 140px 155px; 
    gap: 1.25rem; 
    padding: 1rem 1.5rem; 
    align-items: center;
}
.list-header { 
    background: #f8fafc; 
    border-bottom: 1px solid #e2e8f0; 
    font-size: 0.75rem; 
    font-weight: 700; 
    color: #64748b; 
    letter-spacing: 0.05em; 
}
.list-item { 
    border-bottom: 1px solid #e2e8f0; 
    position: relative; 
    transition: background 0.15s ease;
}
.list-item:last-child { border-bottom: none; }
.list-item:hover { background: #f8fafc; }

/* Left Red Accent Line */
.list-item::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: transparent; transition: 0.2s; }
.list-item:hover::before { background: #3b82f6; } /* Accent on hover */

.col-folio {
    min-width: 0;
}

.col-details {
    min-width: 0;
    overflow: hidden;
}

.details-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    margin-bottom: 0.25rem;
}

.details-asunto {
    font-weight: 600;
    color: #0f172a;
    font-size: 0.92rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
}

.report-desc {
    color: #64748b;
    font-size: 0.82rem;
    line-height: 1.35;
    margin: 0;
    word-break: break-all;
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.col-user {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.875rem;
    color: #1e293b;
}

.col-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    white-space: nowrap;
    min-width: 0;
}

.col-action {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.4rem;
    min-width: 0;
}

.btn-edit-report {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: #ecfdf5;
    color: #059669;
    border: 1px solid #a7f3d0;
    border-radius: 6px;
    padding: 5px 9px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
}
.btn-edit-report:hover {
    background: #059669;
    color: #ffffff;
    border-color: #059669;
}

.btn-edit-report-partial {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: #eff6ff;
    color: #2563eb;
    border: 1px solid #bfdbfe;
    border-radius: 6px;
    padding: 5px 9px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
}
.btn-edit-report-partial:hover {
    background: #2563eb;
    color: #ffffff;
    border-color: #2563eb;
}

.chevron-arrow {
    color: #94a3b8;
    transition: transform 0.2s, color 0.2s;
    flex-shrink: 0;
}
.list-item:hover .chevron-arrow {
    color: #3b82f6;
    transform: translateX(3px);
}

/* Badges and Pills */
.badge-origin { padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
.bg-ticket { background: #fee2e2; color: #641515; } /* Soft red */
.bg-servicio { background: #e0e7ff; color: #4f46e5; } /* Soft indigo */
.bg-libre { background: #f1f5f9; color: #475569; } /* Soft gray */

.status-pill { padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em; }
.pill-warning { background: #fee2e2; color: #ef4444; } /* Reddish for pending/parcial */
.pill-success { background: #dcfce3; color: #166534; } /* Green for finalized */

.empty-state { padding: 3rem; text-align: center; color: #64748b; }

@media (max-width: 768px) {
    .list-header {
        display: none;
    }
    .list-item {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 1rem;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        margin-bottom: 1rem;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
    }
    .list-card {
        background: transparent;
        border: none;
        box-shadow: none;
    }
    .col-folio, .col-details, .col-user, .col-status, .col-action {
        width: 100%;
        text-align: left;
    }
    .col-status {
        justify-content: flex-start;
    }
    .col-action {
        justify-content: flex-start;
    }
    .page-header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
    }
    .page-header button {
        width: 100%;
    }
    .filters-row {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        width: 100%;
        gap: 1rem;
    }
    .search-box, .search-box input, .filter-dropdown {
        width: 100%;
    }
}
</style>
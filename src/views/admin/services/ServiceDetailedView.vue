<script setup lang="ts">
    import { ref, onMounted } from 'vue'
    import { useRoute, useRouter } from 'vue-router'
    import { ArrowLeft, User, Briefcase, Calendar, Clock, CheckCircle2, AlertCircle, FileText, FileEdit } from 'lucide-vue-next'

    import type { Service } from '../../../data/mockServicios'
    import { useAuthStore } from '../../../stores/authStore'
    import { storeToRefs } from 'pinia'
    import { apiFetch } from '../../../api/apiClient'
    
    // Store
    const authStore = useAuthStore()
    const { currentUser } = storeToRefs(authStore)

    // Setup Router
    const route = useRoute()
    const router = useRouter()

    const goBack = () => {
        router.back()
    }

    // Navegar directamente al creador de reportes prellenando este servicio
    const generarReporte = () => {
        if (!service.value) return
        router.push({
            name: 'reports-new',
            query: {
                tipo: 'Servicio Programado',
                id: service.value.id
            }
        })
    }

    const serviceId = Number(route.params.id)
    const service = ref<Service | null>(null)
    const associatedReport = ref<any | null>(null)
    const isLoading = ref(true)
    const isUpdating = ref(false)
    const availableTechnicians = ref<any[]>([])
    const selectedTechnician = ref('')

    const editarReporte = () => {
        if (associatedReport.value) {
            router.push({ name: 'report-edit', params: { id: associatedReport.value.idReporte || associatedReport.value.id } })
        } else {
            generarReporte()
        }
    }

    const fetchService = async () => {
        isLoading.value = true
        try {
            const [res, repRes] = await Promise.all([
                apiFetch(`/servicios/${serviceId}`),
                apiFetch('/reportes').catch(() => ({ data: [] }))
            ])
            if (res.data) {
                service.value = res.data
                selectedTechnician.value = res.data.asignadoA || ''
            }
            if (repRes.data) {
                associatedReport.value = repRes.data.find((r: any) => r.tipoReporte === 'Servicio Programado' && (r.origenDatosId === serviceId || r.origen_datos_id === serviceId)) || null
            }
        } catch (error) {
            console.error('Error al cargar servicio:', error)
            service.value = null
        } finally {
            isLoading.value = false
        }
    }

    const fetchTechnicians = async () => {
        try {
            const res = await apiFetch('/tecnicos')
            if (res.data) {
                availableTechnicians.value = res.data
            }
        } catch (error) {
            console.error('Error al cargar técnicos:', error)
        }
    }

    const getUserName = (id: number | null) => {
        if (!id) return 'Sin Asignar'
        const tech = availableTechnicians.value.find(u => u.id_usuario === id || u.idUsuario === id)
        return tech ? `${tech.nombre} ${tech.apellidos}` : 'Usuario'
    }

    const formatDate = (dateString: string) => {
        if (!dateString) return '---'
        const date = new Date(dateString)
        return date.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    }
   
    // Assign Service
    const assignService = async () => {
        if (!service.value || !selectedTechnician.value) return

        isUpdating.value = true
        try {
            const techObj = availableTechnicians.value.find(t => `${t.nombre} ${t.apellidos}` === selectedTechnician.value)

            const res = await apiFetch(`/servicios/${serviceId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    asignado_a: selectedTechnician.value,
                    id_tecnico_asignado: techObj ? techObj.idUsuario : null,
                    estatus: service.value.estatus === 'Programado' ? 'En Proceso' : service.value.estatus
                })
            })

            if (res.data) {
                service.value = res.data
                alert(`Servicio asignado exitosamente a ${selectedTechnician.value}`)
            }
        } catch (error: any) {
            console.error('Error al asignar servicio:', error)
            alert(error.message || 'Error al asignar servicio.')
        } finally {
            isUpdating.value = false
        }
    }

    onMounted(() => {
        fetchService()
        fetchTechnicians()
    })

</script>

<template>
    <div class="page-container-detailed-service">
        
        <div v-if="service">
            <!-- Header -->
            <header class="ticket-header">

                <!-- Top action buttons row -->
                <div class="header-actions-row">
                    <!-- Back button -->
                    <button @click="goBack" class="btn-back">
                        <ArrowLeft :size="18" />
                        <span>Regresar a la lista</span>
                    </button>

                    <!-- Generar o Editar Reporte button -->
                    <button v-if="service.estatus === 'Realizado' || associatedReport" @click="editarReporte" class="btn-generate-report btn-edit-report-accent" title="Editar reporte técnico asociado">
                        <FileEdit :size="18" />
                        <span>Editar Reporte</span>
                    </button>
                    <button v-else @click="generarReporte" class="btn-generate-report" title="Crear reporte técnico para este servicio">
                        <FileText :size="18" />
                        <span>Generar Reporte</span>
                    </button>
                </div>

                <!-- Folio -->
                <div class="header-title">
                    <span class="folio-badge">{{ service.folio }}</span>
                    <h1>{{ service.asunto }}</h1>
                </div>

            </header>

            <!-- Upper banner "Meta-information"-->
            <div class="card quick-meta-bar">
                <!-- Status -->
                <div class="meta-item">
                    <span class="meta-label">Estatus</span>
                    <span class="status-pill" :class="service.estatus.toLowerCase().replace(' ', '-')">
                        {{ service.estatus }}
                    </span>
                </div>
                
                <div class="divider-vertical"></div>
                
                <!-- Priority-->
                <div class="meta-item">
                    <span class="meta-label">Prioridad</span>
                    <span class="priority-text" :class="service.prioridad.toLowerCase()">
                        <AlertCircle :size="16" />
                        {{ service.prioridad }}
                    </span>
                </div>
                
                <div class="divider-vertical"></div>
                
                <!-- Applicant -->
                <div class="meta-item">
                    <span class="meta-label">Solicitante</span>
                    <div class="person-info">
                        <User :size="18" class="icon" />
                        <!-- Information-->
                        <div>
                            <!-- Name-->
                            <div class="name">
                                {{ service.solicitante }}
                            </div>
                            <!-- Role -->
                            <div class="role">
                                <Briefcase :size="12" class="inline-icon"/>{{ service.cargo }}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <!-- Ticket grid -->
            <div class="ticket-grid">
                <!-- Main column / Description -->
                <div class="main-column">
                    <div class="card description-card">
                        <h2>Descripción del Reporte</h2>
                        <p class="description-text">{{ service.descripcion }}</p>
                    </div>

                    <!-- History Timeline -->
                    <div class="timeline-section" v-if="service.historialModificaciones && service.historialModificaciones.length > 0">
                        <h2 class="timeline-heading">Historial de Modificaciones</h2>
                        <div class="timeline">
                            <div class="timeline-item" v-for="mod in service.historialModificaciones" :key="mod.idModificacion">
                                <div class="timeline-dot"></div>
                                <div class="timeline-content card">
                                    <div class="flex justify-between items-start">
                                        <strong class="timeline-user">{{ getUserName(mod.idUsuario) }}</strong>
                                        <span class="timeline-date">{{ formatDate(mod.fechaModificacion) }}</span>
                                    </div>
                                    <p class="timeline-desc">{{ mod.descripcion }}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <!--Side column-->
                <div class="side-column">
                    
                    <!-- Information / Who attends and data-->
                    <div class="card meta-card">
                        
                        <!-- Atendió -->
                        <div class="meta-section">
                            <h3>Atendió</h3>
                            <div class="person-info">
                                <!-- Icon -->
                                <CheckCircle2 :size="18" class="icon" />
                                <!-- Text: Name who attend-->
                                <div class="name" :class="{ 'text-red': !service.asignadoA }">
                                    {{ service.asignadoA || 'Sin asignar' }}
                                </div>
                            </div>
                        </div>

                        <div class="divider"></div>
                        
                        <!-- Dates -->
                        <div class="meta-section">

                            <h3>Fechas</h3>
                            <!-- Request date -->
                            <div class="date-info">
                                <Calendar :size="16" class="icon" />
                                <span><strong>Asignado:</strong> {{ service.fechaAsignacion }}</span>
                            </div>

                            <!-- Due date-->
                            <div class="date-info mt-2">
                                <Clock :size="16" class="icon" />
                                <span><strong>Vencimiento:</strong> {{ service.fechaVencimiento || 'Pendiente' }}</span>
                            </div>

                        </div>

                    </div>

                    <!--Reasignar ticket/card-->
                    <!-- Only admin_tecnico and admin_comercial -->
                    <div v-if="currentUser?.rol === 1 || currentUser?.rol === 2" class="card assignment-card">

                        <!-- Title-->
                        <h3>{{ service.asignadoA ? 'Reasignar Servicio' : 'Asignar Técnico' }}</h3>
                        
                        <!--Select technician-->
                        <select v-model="selectedTechnician" class="custom-select">
                            <option value="" disabled>Selecciona un técnico...</option>
                            <option v-for="tech in availableTechnicians" :key="tech.idUsuario" :value="`${tech.nombre} ${tech.apellidos}`">
                                {{ tech.nombre }} {{ tech.apellidos }}
                            </option>
                        </select>
                        
                        <!-- Button "Confirmar Asignación"-->
                        <button 
                            class="btn-action mt-2" 
                            @click="assignService"
                            :disabled="!selectedTechnician || selectedTechnician === service.asignadoA"
                        >
                            Confirmar Asignación
                        </button>
                        
                    </div>
                </div>
            </div>
        </div> 
        
        <!-- Error state-->
        <div v-else class="error-state">
            <h2>Servicio no encontrado u oculto</h2>
            <p>El servicio con este ID no existe o no te pertenece.</p>
            <button @click="goBack" class="btn-back mt-4">Regresar a la lista</button>
        </div>

    </div>
</template>

<style scoped lang="scss">
.page-container-detailed-service {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem 0; 
}

.ticket-header {
    margin-bottom: 1.25rem;
}

.header-actions-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.btn-generate-report {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: #2563eb;
    color: #ffffff;
    border: none;
    border-radius: 6px;
    padding: 0.55rem 1.15rem;
    font-size: 0.92rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s, transform 0.1s;
}

.btn-generate-report:hover {
    background: #1d4ed8;
}

.btn-edit-report-accent {
    background: #059669;
}
.btn-edit-report-accent:hover {
    background: #047857;
}

.btn-generate-report:active {
    transform: scale(0.98);
}

.btn-back {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    color: #64748b;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    margin-bottom: 0.75rem;
    transition: color 0.2s;

    &:hover { color: #0f172a; }
}

.header-title {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    .folio-badge {
        align-self: flex-start;
        background: #e2e8f0;
        color: #475569;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.5px;
    }

    h1 {
        font-size: 2rem;
        color: #0f172a;
        margin: 0;
        line-height: 1.2;
    }
}

/* --- NEW: TOP METADATA BAR --- */
.quick-meta-bar {
    display: flex;
    align-items: center;
    gap: 2.5rem;
    margin-bottom: 1.5rem;
    padding: 1rem 1.5rem;
}

.meta-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.divider-vertical {
    width: 1px;
    height: 40px;
    background: #e2e8f0;
}

.ticket-grid {
    display: grid;
    grid-template-columns: 2fr 1fr; /* Left column is twice as wide as right */
    gap: 2rem;
    align-items: start;
}

.card {
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    padding: 1.25rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.description-card {
    margin-bottom: 1.5rem;

    h2 {
        font-size: 1.1rem;
        color: #0f172a;
        margin-bottom: 1rem;
        border-bottom: 1px solid #f1f5f9;
        padding-bottom: 0.5rem;
    }

    .description-text {
        color: #334155;
        line-height: 1.6;
        font-size: 1rem;
        white-space: pre-wrap;
    }
}

.meta-card {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;

    h3 {
        font-size: 0.85rem;
        text-transform: uppercase;
        color: #94a3b8;
        font-weight: 700;
        margin-bottom: 0.75rem;
        letter-spacing: 0.5px;
    }
}

.divider {
    height: 1px;
    background: #e2e8f0;
    width: 100%;
}

.meta-label {
    color: #64748b;
    font-weight: 500;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.person-info {
    display: flex;
    align-items: center;
    gap: 12px;

    .icon { color: #94a3b8; }
    .name { font-weight: 600; color: #0f172a; font-size: 0.95rem; }
    .role { 
        font-size: 0.8rem; 
        color: #64748b; 
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 2px;
    }
    .inline-icon { color: #cbd5e1; }
    .text-red { color: #ef4444; }
}

.date-info {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #334155;
    font-size: 0.9rem;

    .icon { color: #94a3b8; }
    strong { color: #0f172a; font-weight: 600; }
}

.mt-2 { margin-top: 0.5rem; }

.status-pill {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    display: inline-block;

    &.abierto, &.programado { background: #fee2e2; color: #b91c1c; }
    &.en-proceso, &.realizado { background: #dcfce7; color: #15803d; }
    &.resuelto { background: #e0f2fe; color: #0369a1; }
    &.cerrado, &.vencido { background: #f1f5f9; color: #475569; }
}

.priority-text {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 700;
    font-size: 0.85rem;

    &.alta { color: #ef4444; }
    &.media { color: #f97316; }
    &.baja { color: #64748b; }
}

/* --- ASSIGNMENT STYLES --- */
.assignment-card {
    margin-top: 1rem;
    background: #f8fafc;

    h3 {
        font-size: 0.85rem;
        text-transform: uppercase;
        color: #64748b;
        font-weight: 700;
        margin-bottom: 1rem;
        letter-spacing: 0.5px;
    }
}

.custom-select {
    width: 100%;
    padding: 0.8rem;
    border-radius: 8px;
    border: 1px solid #cbd5e1;
    background-color: white;
    font-size: 0.95rem;
    color: #334155;
    outline: none;
    cursor: pointer;
    margin-bottom: 1rem;
    transition: border-color 0.2s;

    &:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
}

.btn-action {
    width: 100%;
    background: #2563eb;
    color: white;
    border: none;
    padding: 0.8rem;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    transition: background 0.2s, opacity 0.2s;

    &:hover:not(:disabled) { background: #1d4ed8; }
    
    &:disabled {
        background: #94a3b8;
        cursor: not-allowed;
        opacity: 0.7;
    }
}

/* Timeline specific styling */
.timeline-section {
    margin-top: 2rem;

    .timeline-heading {
        font-size: 1.1rem;
        color: #0f172a;
        margin-bottom: 1rem;
        border-bottom: 1px solid #f1f5f9;
        padding-bottom: 0.5rem;
        font-weight: 600;
    }
}

.timeline {
    position: relative;
    padding-left: 1.5rem;
    
    &::before {
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0.4rem;
        width: 2px;
        background: #e2e8f0;
    }
}

.timeline-item {
    position: relative;
    margin-bottom: 1.5rem;

    &:last-child { margin-bottom: 0; }
}

.timeline-dot {
    position: absolute;
    top: 1.25rem;
    left: -1.7rem;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #3b82f6; 
    border: 3px solid white;
    box-shadow: 0 0 0 1px #cbd5e1;
    z-index: 1;
}

.timeline-content {
    background: white;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    padding: 1rem;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);

    .timeline-user { color: #0f172a; font-size: 0.95rem; }
    .timeline-date { color: #64748b; font-size: 0.8rem; }
    .timeline-desc { color: #475569; font-size: 0.95rem; margin-top: 0.5rem; line-height: 1.4; }
}

@media (max-width: 768px) {
    .ticket-grid {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }
    .main-column, .side-column {
        width: 100%;
    }
    .quick-meta-bar {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
    }
    .divider-vertical {
        width: 100%;
        height: 1px;
    }
    .timeline {
        padding-left: 1rem;
        margin-left: 1.5rem;
    }
    .timeline::before {
        left: 0;
    }
    .timeline-dot {
        left: -2.15rem;
    }
    .header-title {
        word-break: break-word;
    }
}
</style>
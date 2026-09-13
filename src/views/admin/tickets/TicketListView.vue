<script setup lang="ts">
    import { ref, computed, onMounted } from 'vue'
    import { useRouter } from 'vue-router'
    import { Search, Filter, ChevronRight, X, FileText, FileEdit } from 'lucide-vue-next'
    import { useAuthStore } from '../../../stores/authStore'
    import { storeToRefs } from 'pinia'
    import { apiFetch } from '../../../api/apiClient'
    import type { Ticket } from '../../../data/mockTickets'

    // Store initialization
    const authStore = useAuthStore()
    const { currentUser } = storeToRefs(authStore)

    const router = useRouter()
    const tickets = ref<Ticket[]>([])
    const reportes = ref<any[]>([])
    const isLoading = ref(true)

    const fetchTickets = async () => {
        isLoading.value = true
        try {
            const [tRes, rRes] = await Promise.all([
                apiFetch('/tickets'),
                apiFetch('/reportes').catch(() => ({ data: [] }))
            ])
            if (tRes.data) tickets.value = tRes.data
            if (rRes.data) reportes.value = rRes.data
        } catch (error) {
            console.error('Error al cargar tickets:', error)
        } finally {
            isLoading.value = false
        }
    }

    onMounted(() => {
        fetchTickets()
    })

    // Filter state
    const searchQuery = ref('')
    const statusFilter = ref('')
    const priorityFilter = ref('')
    const dateFilter = ref('')

    // Filter by enterprise and search criteria (Punto 3: Solo rol 1 y 2 ven todo; otros solo ven asignados)
    const filteredTickets = computed(() => {
        return tickets.value.filter(ticket => {
            if (currentUser.value?.idDependencia && ticket.idDependencia && ticket.idDependencia !== currentUser.value.idDependencia) {
                return false
            }

            // Restricción por rol
            if (currentUser.value && currentUser.value.rol !== 1 && currentUser.value.rol !== 2) {
                const userFullName = `${currentUser.value.nombre} ${currentUser.value.apellidos}`.trim().toLowerCase()
                const userName = (currentUser.value.nombre || '').trim().toLowerCase()
                const atendioText = (ticket.atendio || '').toLowerCase()
                const ticketTechId = (ticket as any).idTecnicoAtendio || (ticket as any).id_tecnico_atendio

                const isAssigned = (ticketTechId && ticketTechId === currentUser.value.idUsuario) ||
                                   (atendioText && (atendioText.includes(userFullName) || atendioText.includes(userName)))
                if (!isAssigned) {
                    return false
                }
            }

            const matchesSearch = searchQuery.value === '' || 
                ticket.asunto.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                ticket.descripcion.toLowerCase().includes(searchQuery.value.toLowerCase())
            const matchesStatus = statusFilter.value === '' || ticket.estatus === statusFilter.value
            const matchesPriority = priorityFilter.value === '' || ticket.prioridad === priorityFilter.value
            const matchesDate = dateFilter.value === '' || ticket.fechaSolicitud === dateFilter.value

            return matchesSearch && matchesStatus && matchesPriority && matchesDate
        })        
    })

    // ACtive filters
    const hasActiveFilters = computed(() => {
        return searchQuery.value !== '' || 
               statusFilter.value !== '' || 
               priorityFilter.value !== '' || 
               dateFilter.value !== ''
    })

    // Cleaning filters
    const clearFilters = () => {
        searchQuery.value = ''
        statusFilter.value = ''
        priorityFilter.value = ''
        dateFilter.value = ''
    }

    // Navigation Details
    const viewTicketDetails = (id: number) => {
        router.push({ name: 'ticket-detail', params: { id: id } })
    }

    // Navegar directamente a generar reporte para este ticket (Punto 4)
    const generarReporte = (id: number) => {
        router.push({ name: 'reports-new', query: { tipo: 'Ticket', id: id } })
    }

    const getReportForTicket = (ticketId: number) => {
        return reportes.value.find(r => r.tipoReporte === 'Ticket' && (r.origenDatosId === ticketId || r.origen_datos_id === ticketId))
    }

    const editarReporteTicket = (ticket: Ticket) => {
        const report = getReportForTicket(ticket.id)
        if (report) {
            router.push({ name: 'report-edit', params: { id: report.idReporte || report.id } })
        } else {
            generarReporte(ticket.id)
        }
    }

    // Navigation Create a ticket
    const makeTicket = () => {
        router.push({name: 'create-ticket'})
    }

    // Status coloring
    const getStatusInfo = (ticket: Ticket) => {
        if (!ticket.atendio || ticket.atendio === '') {
            return { text: 'Sin Asignar', pillClass: 'sin-asignar', borderClass: 'border-rojo' };
        }
        
        if (ticket.estatus === 'Abierto') return { text: 'Abierto', pillClass: 'abierto', borderClass: 'border-rojo' };
        if (ticket.estatus === 'En Proceso') return { text: 'En Proceso', pillClass: 'en-proceso', borderClass: 'border-verde' };
        if (ticket.estatus === 'Cerrado') return { text: 'Cerrado', pillClass: 'cerrado', borderClass: 'border-gris' };
        if (ticket.estatus === 'Resuelto') return { text: 'Resuelto', pillClass: 'resuelto', borderClass: 'border-azul' };
        
        return { text: ticket.estatus, pillClass: '', borderClass: 'border-gris' };
    }

    // NEW: Priority Badge Logic
    const getPriorityDisplay = (prioridad: string) => {
        if (prioridad === 'Alta') return '!!!'
        if (prioridad === 'Media') return '!!'
        if (prioridad === 'Baja') return '!'
        return ''
    }

    const getPriorityClass = (prioridad: string) => {
        if (prioridad === 'Alta') return 'p-alta'
        if (prioridad === 'Media') return 'p-media'
        if (prioridad === 'Baja') return 'p-baja'
        return ''
    }
</script>

<template>
    <div class="page-container-list-ticket">

        <div class="page-header">
            <h1>Gestión de Tickets</h1>
            <button class="btn-primary" @click="makeTicket">
                + Nuevo ticket
            </button>
        </div>

        <div class="filter-bar">

            <div class="search-box">
                <Search :size="18" class="icon" />
                <input
                    type="text"
                    v-model="searchQuery"
                    placeholder="Buscar ticket por asunto o descripción..."                    
                />
            </div>
            
            <div class="filters">
                <div class="filter-item">
                    <Filter :size="16" class="icon" />
                    <select v-model="statusFilter">
                        <option value="">Todos los Estatus</option>
                        <option value="Abierto">Abierto</option>
                        <option value="En Proceso">En Proceso</option>
                        <option value="Resuelto">Resuelto</option>
                        <option value="Cerrado">Cerrado</option>
                    </select>
                </div>

                <div class="filter-item">
                    <Filter :size="16" class="icon" />
                    <select v-model="priorityFilter">
                        <option value="">Todas las Prioridades</option>
                        <option value="Alta">Alta (!!!)</option>
                        <option value="Media">Media (!!)</option>
                        <option value="Baja">Baja (!)</option>
                    </select>
                </div>

                <div class="filter-item" style="min-width: 200px;">
                    <DateFilter v-model="dateFilter"/>
                </div>

                <button
                    v-if = "hasActiveFilters"
                    @click="clearFilters"
                    class="btn-clear"
                    title="Limpiar todos los filtros"
                >
                    <X :size="16"/>
                    Limpiar
                </button>
            </div>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Ticket</th>
                        <th class="col-detalles">Detalles del reporte</th>
                        <th>Atendió</th>
                        <th>Estatus</th>
                        <th></th>
                    </tr>
                </thead>

                <tbody>
                    <tr
                        v-for="ticket in filteredTickets"
                        :key="ticket.id"
                        class="ticket-row"
                        :class="getStatusInfo(ticket).borderClass"
                        @click="viewTicketDetails(ticket.id)"
                    >
                        <td class="col-ticket">
                            <div class="folio">{{ ticket.folio }}</div>
                            <div class="date-text">Sol: {{ ticket.fechaSolicitud }}</div>
                            <div class="date-text" v-if="ticket.fechaAtencion">Atn: {{ ticket.fechaAtencion }}</div>
                        </td>

                        <td class="col-detalles">
                            <div class="asunto-container">
                                <span 
                                    class="priority-badge" 
                                    :class="getPriorityClass(ticket.prioridad)"
                                    :title="`Prioridad ${ticket.prioridad}`"
                                >
                                    {{ getPriorityDisplay(ticket.prioridad) }}
                                </span>
                                <div class="asunto">{{ ticket.asunto }}</div>
                            </div>
                            <div class="descripcion">{{ ticket.descripcion }}</div>
                        </td>
                        
                        <td class="align-middle">
                            <div class="empleado">{{ ticket.atendio || 'Sin asignar' }}</div>
                        </td>

                        <td class="align-middle">
                            <span class="status-indicator" :class="getStatusInfo(ticket).pillClass">
                                {{ getStatusInfo(ticket).text }}
                            </span>
                        </td>

                        <td class="align-middle text-right pr-6">
                            <div class="flex items-center justify-end gap-2">
                                <!-- Si el ticket ya está resuelto, cerrado o ya tiene reporte, mostrar "Editar Reporte" -->
                                <button
                                    v-if="ticket.estatus === 'Resuelto' || ticket.estatus === 'Cerrado' || getReportForTicket(ticket.id)"
                                    type="button"
                                    class="btn-table-edit-report"
                                    @click.stop="editarReporteTicket(ticket)"
                                    title="Editar reporte técnico asociado a este ticket"
                                >
                                    <FileEdit :size="14" />
                                    <span>Editar Reporte</span>
                                </button>
                                <!-- Si aún no está resuelto, mostrar botón habitual de Reportar -->
                                <button
                                    v-else
                                    type="button"
                                    class="btn-table-report"
                                    @click.stop="generarReporte(ticket.id)"
                                    title="Generar reporte técnico para este ticket"
                                >
                                    <FileText :size="14" />
                                    <span>Reportar</span>
                                </button>
                                <ChevronRight :size="20" class="chevron-icon" />
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>

            <div v-if="filteredTickets.length === 0" class="p-12 text-center text-slate-500 italic">
                No se encontraron tickets con esos filtros...
            </div>

        </div>
    </div>
</template>

<style scoped lang="scss">

    .border-rojo { border-left: 8px solid #ef4444; }
    .border-verde { border-left: 8px solid #22c55e; }
    .border-amarillo { border-left: 8px solid #eab308; }
    .border-azul { border-left: 8px solid #3b82f6; }
    .border-gris { border-left: 8px solid #94a3b8; }

    .status-indicator {
        display: inline-flex;
        align-items: center;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;

        &.sin-asignar { background: #fee2e2; color: #b91c1c; } 
        &.abierto { background: #fee2e2; color: #b91c1c; } 
        &.en-proceso { background: #dcfce7; color: #15803d; }     
        &.resuelto { background: #e0f2fe; color: #0369a1; }     
        &.cerrado { background: #f1f5f9; color: #475569; }    
    }

    .btn-table-report {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #eff6ff;
        color: #2563eb;
        border: 1px solid #bfdbfe;
        border-radius: 6px;
        padding: 4px 10px;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
            background: #2563eb;
            color: #ffffff;
            border-color: #2563eb;
        }
    }

    .btn-table-edit-report {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #ecfdf5;
        color: #059669;
        border: 1px solid #a7f3d0;
        border-radius: 6px;
        padding: 4px 10px;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;

        &:hover {
            background: #059669;
            color: #ffffff;
            border-color: #059669;
        }
    }



    .page-container-list-ticket {
        max-width: 1200px;
        margin: 0 auto;
    }

    .page-header{
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;

        h1 {font-size: 1.8rem; font-weight: 700; color: #0f172a;}

        .btn-primary{
            background: #2563eb;
            color: white;
            padding: 0.6rem 1.2rem;
            border-radius: 8px;
            border: none;
            font-weight: 500;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: 0.5s;

            &:hover{
                background: #1d4ed8;
            }
        }
    }

    .table-container {
        background: white;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        overflow: hidden; 
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);

        table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
        }
    }

    th {
        background: #f8fafc;
        padding: 1rem 1.5rem; 
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        color: #64748b;
        border-bottom: 1px solid #e2e8f0;
    }

    td {
        padding: 1.2rem 1.5rem; 
        vertical-align: top;    
    }

    .col-detalles {
        width: 50%;
        min-width: 400px;
    }

    .col-ticket {
        min-width: 140px;
    }

    .ticket-row {
        transition: all 0.2s ease;
        border-bottom: 1px solid #f1f5f9;
        cursor: pointer;
        
        &:hover {
            background-color: #f8fafc;

            .chevron-icon {
                color: #3b82f6;
                transform: translateX(4px);
            }
        }
    }

    .folio {
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 4px;
        font-size: 0.95rem;
    }

    .date-text {
        font-size: 0.75rem;
        color: #64748b;
        line-height: 1.4;
    }

    /* --- NEW: Asunto Layout with Badges --- */
    .asunto-container {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
    }

    .asunto {
        font-weight: 600;
        color: #1e293b;
        font-size: 1rem;
        margin-bottom: 0; /* Margin moved to container */
    }

    .priority-badge {
        font-weight: 900;
        font-size: 0.85rem;
        padding: 2px 6px;
        border-radius: 6px;
        letter-spacing: 1px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 24px; /* Keeps the badges aligned nicely */

        &.p-alta { color: #ef4444; background: #fee2e2; }
        &.p-media { color: #f97316; background: #ffedd5; }
        &.p-baja { color: #64748b; background: #f1f5f9; }
    }
    /* -------------------------------------- */

    .descripcion {
        font-size: 0.85rem;
        color: #475569;
        line-height: 1.5;
    }

    .empleado {
        font-size: 0.9rem;
        color: #334155;
        font-weight: 500;
    }

    .filter-bar{
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        gap: 1rem;
        flex-wrap: wrap;
    }

    .search-box {
        position: relative;
        flex: 1;
        min-width: 300px;

        .icon {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: #94a3b8;
        }

        input {
            width: 100%;
            box-sizing: border-box;
            padding: 0.6rem 1rem 0.6rem 2.5rem;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: white;
            color: #1e293b;
            font-size: 0.9rem;
            outline: none;
            transition: border-color 0.2s;

            &:focus {
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }
        }
    }

    .filters{
        display: flex;
        gap: 1rem;
    }

    .filter-item{
        position: relative;
        display: flex;
        align-items: center;

        .icon {
            position: absolute;
            left: 10px;
            color: #64748b;
            pointer-events: none;
        }

        select, input[type="date"] {
            box-sizing: border-box;
            padding: 0.6rem 1rem;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: white;
            font-size: 0.9rem;
            color: #334155;
            outline: none;
            cursor: pointer;
        }
  
        select {
            padding-left: 2.2rem;
        }
    }



    .chevron-icon {
        color: #cbd5e1;
        transition: all 0.2s ease;
    }

    .btn-clear {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 0.6rem 1rem;
        background: #f1f5f9;
        color: #64748b;
        border: none;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
            background: #e2e8f0;
            color: #0f172a;
        }
    }

    @media (max-width: 768px) {
        .page-header {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
        }
        .page-header button {
            width: 100%;
        }
        .filter-bar {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            width: 100%;
            gap: 1rem;
        }
        .filters, .search-box {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            width: 100%;
            gap: 1rem;
        }
        .filter-item, .filter-item select, .filter-item input, .search-box input, .btn-clear {
            width: 100%;
        }
        .table-container {
            background: transparent;
            border: none;
            box-shadow: none;
        }
        table, thead, tbody, th, td, tr {
            display: block;
        }
        thead {
            display: none;
        }
        .ticket-row {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
            padding: 1rem;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            margin-bottom: 1rem;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            background: white;
        }
        td {
            padding: 0;
            width: 100%;
            display: flex;
            flex-direction: column;
        }
        .col-detalles {
            min-width: unset;
            width: 100%;
        }
        .chevron-icon {
            display: none;
        }
    }

</style>
<script setup lang="ts">
    // Importing necessary functions
    import { reactive, computed, ref, onMounted } from 'vue';
    import { useRouter, useRoute } from 'vue-router';
    import { useAuthStore } from '../../../stores/authStore';
    import { storeToRefs } from 'pinia';
    import { getDependenciaName } from '../../../data/mockDependencias';
    import type { ReporteMaterial, EvidenciaFotografica } from '../../../data/mockReportes';
    import { apiFetch } from '../../../api/apiClient';
    import { Camera, ArrowLeft } from 'lucide-vue-next';

    const router = useRouter();
    const route = useRoute();
    const authStore = useAuthStore();
    const { currentUser } = storeToRefs(authStore);

    const fileInputRef = ref<HTMLInputElement | null>(null);
    const triggerFileInput = () => {
        fileInputRef.value?.click();
    };

    // Role-based access: tech roles (1: Admin Técnico, 3: Técnico) and commercial admin (2) can create/edit reports
    if (!currentUser.value || (currentUser.value.rol !== 1 && currentUser.value.rol !== 2 && currentUser.value.rol !== 3)) {
        router.push({ name: 'dashboard' });
    }

    const editReportId = computed(() => {
        return route.params.id ? Number(route.params.id) : null
    })
    const isEditMode = computed(() => !!editReportId.value)
    const existingFolio = ref('')
    
    // Reactive form data for creating a new report
    const formData = reactive(
        {
        tipoReporte: 'Ticket',
        origenDatosId: null as number | null,
        categoria: 'Mantenimiento Correctivo' as 'Mantenimiento Preventivo' | 'Mantenimiento Correctivo' | 'Instalación' | 'Mejora' | 'Diagnóstico',
        fallaReportada: '',
        conclusionTrabajo: '',
        fechaElaboracion: new Date().toISOString().slice(0, 10),
        idSubdependencia: null as number | null,
        responsableTexto: '',
        cargoTexto: '',
        ejecutoresIds: [] as number[],
        horaSalidaBase: '',
        horaLlegadaSitio: '',
        fechaHoraInicio: '',
        fechaHoraFin: '',
        horaRegresoABase: '',
        desarrolloActividades: '',
        materiales: [] as ReporteMaterial[],
        evidenciaFotografica: [] as EvidenciaFotografica[],
        esRetrabajo: false,
        estatusReporte: 'Abierto / Trabajo Parcial'
        }
    )

    const isSubmitting = ref(false)
    const tickets = ref<any[]>([])
    const services = ref<any[]>([])
    const technicians = ref<any[]>([])
    const subareas = ref<any[]>([])

    // Auto-llenar campos a partir del origen seleccionado (Ticket o Servicio)
    const handleOriginChange = (newId: number | null, overwrite = false) => {
        if (!newId) return

        if (formData.tipoReporte === 'Ticket') {
            const ticket = tickets.value.find(t => t.id === newId)
            if (ticket) {
                if (overwrite || !formData.fallaReportada.trim()) {
                    formData.fallaReportada = ticket.asunto ? (ticket.asunto + (ticket.descripcion ? ` - ${ticket.descripcion}` : '')) : ''
                }
                if (ticket.solicitante && (overwrite || !formData.responsableTexto.trim())) {
                    formData.responsableTexto = ticket.solicitante
                }
                if (ticket.cargo && (overwrite || !formData.cargoTexto.trim())) {
                    formData.cargoTexto = ticket.cargo
                }
                if (ticket.idSubdependencia) {
                    formData.idSubdependencia = ticket.idSubdependencia
                }
                const techId = ticket.idTecnicoAtendio || ticket.id_tecnico_atendio
                if (techId && !formData.ejecutoresIds.includes(techId)) {
                    if (formData.ejecutoresIds.length < 4) {
                        formData.ejecutoresIds.push(techId)
                    }
                }
            }
        } else if (formData.tipoReporte === 'Servicio Programado') {
            const servicio = services.value.find(s => s.id === newId)
            if (servicio) {
                if (overwrite || !formData.fallaReportada.trim()) {
                    formData.fallaReportada = servicio.asunto ? (servicio.asunto + (servicio.descripcion ? ` - ${servicio.descripcion}` : '')) : ''
                }
                if (servicio.solicitante && (overwrite || !formData.responsableTexto.trim())) {
                    formData.responsableTexto = servicio.solicitante
                }
                if (servicio.cargo && (overwrite || !formData.cargoTexto.trim())) {
                    formData.cargoTexto = servicio.cargo
                }
                if (servicio.idSubdependencia) {
                    formData.idSubdependencia = servicio.idSubdependencia
                }
                const techId = servicio.idTecnicoAsignado
                if (techId && !formData.ejecutoresIds.includes(techId)) {
                    if (formData.ejecutoresIds.length < 4) {
                        formData.ejecutoresIds.push(techId)
                    }
                }
            }
        }

        // Si el usuario logueado es técnico y no está en la cuadrilla, agregarlo automáticamente
        if (currentUser.value?.idUsuario && !formData.ejecutoresIds.includes(currentUser.value.idUsuario)) {
            if (formData.ejecutoresIds.length < 4) {
                formData.ejecutoresIds.push(currentUser.value.idUsuario)
            }
        }
    }

    // Formateador robusto para inputs de tipo "datetime-local" (YYYY-MM-DDTHH:mm)
    const formatForDatetimeInput = (val: string | null | undefined, fallbackDate?: string): string => {
        if (!val) return ''
        const trimmed = String(val).trim()
        if (!trimmed) return ''

        const dateBase = (fallbackDate ? fallbackDate.slice(0, 10) : '') || new Date().toISOString().slice(0, 10)

        // Caso 1: Viene solo hora (ej. "08:30:00", "08:30", "8:30")
        if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
            const parts = trimmed.split(':')
            const hh = parts[0].padStart(2, '0')
            const mm = parts[1].padStart(2, '0')
            return `${dateBase}T${hh}:${mm}`
        }

        // Caso 2: Viene con fecha y hora (ej. "2026-09-09 08:30:00" o "2026-09-09T08:30:00")
        if (trimmed.includes('T') || (trimmed.includes(' ') && trimmed.includes('-'))) {
            const normalized = trimmed.replace(' ', 'T')
            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(normalized)) {
                return normalized.slice(0, 16)
            }
        }

        // Caso 3: Viene solo la fecha (ej. "2026-09-09")
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            return `${trimmed}T08:00`
        }

        // Caso 4: Intento genérico con Date
        const d = new Date(trimmed)
        if (!isNaN(d.getTime())) {
            const year = d.getFullYear()
            const month = String(d.getMonth() + 1).padStart(2, '0')
            const day = String(d.getDate()).padStart(2, '0')
            const hours = String(d.getHours()).padStart(2, '0')
            const minutes = String(d.getMinutes()).padStart(2, '0')
            return `${year}-${month}-${day}T${hours}:${minutes}`
        }

        return ''
    }

    const loadFormData = async () => {
        try {
            const [tRes, sRes, techRes, subRes] = await Promise.all([
                apiFetch('/tickets').catch(() => ({ data: [] })),
                apiFetch('/servicios').catch(() => ({ data: [] })),
                apiFetch('/tecnicos').catch(() => ({ data: [] })),
                apiFetch('/subdependencias').catch(() => ({ data: [] }))
            ])

            if (tRes.data) tickets.value = tRes.data
            if (sRes.data) services.value = sRes.data
            if (techRes.data) technicians.value = techRes.data
            if (subRes.data) subareas.value = subRes.data

            if (editReportId.value) {
                try {
                    const repRes = await apiFetch(`/reportes/${editReportId.value}`)
                    if (repRes.data) {
                        const rep = repRes.data
                        existingFolio.value = rep.folio || ''
                        formData.tipoReporte = rep.tipoReporte || rep.tipo_reporte || 'Libre'
                        formData.origenDatosId = rep.origenDatosId || rep.origen_datos_id || null
                        formData.categoria = rep.categoria || 'Mantenimiento Correctivo'
                        
                        const baseDate = (rep.fechaHoraInicio ? rep.fechaHoraInicio.slice(0, 10) : '')
                            || (rep.fecha_hora_inicio ? rep.fecha_hora_inicio.slice(0, 10) : '')
                            || (rep.fechaElaboracion ? rep.fechaElaboracion.slice(0, 10) : '')
                            || (rep.fecha_elaboracion ? rep.fecha_elaboracion.slice(0, 10) : '')
                            || new Date().toISOString().slice(0, 10)

                        formData.fechaElaboracion = (rep.fechaElaboracion ? rep.fechaElaboracion.slice(0, 10) : '')
                            || (rep.fecha_elaboracion ? rep.fecha_elaboracion.slice(0, 10) : '')
                            || new Date().toISOString().slice(0, 10)
                        formData.idSubdependencia = rep.idSubdependencia || rep.id_subdependencia || null
                        formData.responsableTexto = rep.responsableTexto || rep.responsable_texto || ''
                        formData.cargoTexto = rep.cargoTexto || rep.cargo_texto || ''
                        
                        const eIds = (rep.ejecutoresIds && rep.ejecutoresIds.length)
                            ? rep.ejecutoresIds
                            : (rep.ejecutores ? rep.ejecutores.map((e: any) => e.idUsuario || e.id_usuario) : [])
                        formData.ejecutoresIds = eIds

                        formData.horaSalidaBase = formatForDatetimeInput(rep.horaSalidaBase || rep.hora_salida_base, baseDate)
                        formData.horaLlegadaSitio = formatForDatetimeInput(rep.horaLlegadaSitio || rep.hora_llegada_sitio, baseDate)
                        formData.fechaHoraInicio = formatForDatetimeInput(rep.fechaHoraInicio || rep.fecha_hora_inicio, baseDate)
                        formData.fechaHoraFin = formatForDatetimeInput(rep.fechaHoraFin || rep.fecha_hora_fin, baseDate)
                        formData.horaRegresoABase = formatForDatetimeInput(rep.horaRegresoABase || rep.hora_regreso_a_base, baseDate)
                        
                        const act = rep.desarrolloActividades || ''
                        const conclusionSplit = act.split("\n\nConclusión:\n")
                        if (conclusionSplit.length > 1) {
                            formData.desarrolloActividades = conclusionSplit[0]
                            formData.conclusionTrabajo = conclusionSplit.slice(1).join("\n\nConclusión:\n")
                        } else {
                            formData.desarrolloActividades = act
                            formData.conclusionTrabajo = rep.conclusionTrabajo || ''
                        }

                        formData.fallaReportada = rep.fallaReportada || ''
                        formData.esRetrabajo = !!rep.esRetrabajo
                        formData.estatusReporte = rep.estatusReporte || 'Abierto / Trabajo Parcial'

                        formData.materiales = (rep.materiales || []).map((m: any) => ({
                            idItem: m.idItem || m.id_item || Date.now() + Math.random(),
                            material: m.material || '',
                            cantidad: Number(m.cantidad) || 1,
                            unidad: m.unidad || 'Pieza'
                        }))

                        formData.evidenciaFotografica = (rep.evidenciaFotografica || []).map((e: any) => ({
                            url: e.url || '',
                            comentario: e.comentario || ''
                        }))
                    }
                } catch (err) {
                    console.error('Error al cargar reporte para editar:', err)
                    alert('No se pudo cargar el reporte para editar.')
                    router.push({ name: 'reports' })
                }
            } else {
                // Detectar si fue redireccionado con parámetros de URL (Punto 4)
                const queryTipo = route.query.tipo as string
                const queryId = route.query.id ? Number(route.query.id) : null

                if (queryTipo && (queryTipo === 'Ticket' || queryTipo === 'Servicio Programado' || queryTipo === 'Libre')) {
                    formData.tipoReporte = queryTipo as any
                }

                if (queryId) {
                    formData.origenDatosId = queryId
                    handleOriginChange(queryId, true)
                } else if (currentUser.value?.idUsuario && formData.ejecutoresIds.length === 0) {
                    formData.ejecutoresIds.push(currentUser.value.idUsuario)
                }
            }
        } catch (error) {
            console.error('Error al cargar datos auxiliares para el reporte:', error)
        }
    }

    onMounted(() => {
        loadFormData()
    })

    // Check for the enterprise name
    const dependencyName = computed(() =>
        currentUser.value?.empresa?.nombre || getDependenciaName(currentUser.value?.idDependencia || 1)
    )

    const availableSubareas = computed(() => {
        return subareas.value.filter((s: any) => s.activo)
    })

    // Get "asunto" from the selected ticket/service "auto-complete"
    const asuntoOrigen = computed(() => {
        if(!formData.origenDatosId) return 'Seleccione un origen de datos...'
        
        if(formData.tipoReporte === 'Ticket') {
            const ticket = tickets.value.find(t => t.id === formData.origenDatosId)
            return ticket ? ticket.asunto : 'Ticket no encontrado'
        } else if (formData.tipoReporte === 'Servicio Programado'){
            const servicio = services.value.find(s => s.id === formData.origenDatosId)
            return servicio ? servicio.asunto : 'Servicio no encontrado'
        }
        return 'Reporte Libre'
    })

    // Dictionary to translate DB roles into presentation titles
    const ROLE_TO_CARGO: Record<number, string> = {
        0: 'Default',
        1: 'Admin. de Técnicos',
        2: 'Administrador Comercial',
        3: 'Técnico'
    }

    // Filter technicians / "Ejecutores"
    const availableTechnicians = computed(() => {
        return technicians.value
    })

    // Full data of executors
    const getEjecutorData = (id: number) => {
        return technicians.value.find((u: any) => u.idUsuario === id || u.id === id)
    }

    // Automatic time calculator
    const totalHorasCalculadas = computed(() =>
    {
        if(!formData.fechaHoraInicio || !formData.fechaHoraFin) return '0.0 hrs'
        
        const start = new Date(formData.fechaHoraInicio).getTime()
        const end = new Date(formData.fechaHoraFin).getTime()

        const diffMs = end - start
        if(diffMs < 0) return '0.0 hrs'

        const hours = diffMs / (1000 * 60 * 60)
        return `${hours.toFixed(2)} hrs`
    })

    // Add a new empty slot for an executor (Max 4)
    const addEjecutor = () => {
        if (formData.ejecutoresIds.length < 4) {
            formData.ejecutoresIds.push(0)
        }
    }

    // Remove an executor from the list
    const removeEjecutor = (index: number) => {
        formData.ejecutoresIds.splice(index, 1)
    }

    // Helper to translate the rol to cargo for the UI row
    const getEjecutorCargo = (id: number) => {
        const user = getEjecutorData(id)
        return user ? (ROLE_TO_CARGO[user.rol] || 'Técnico') : '...'
    }

    // Add row for materials
    const addMaterialRow = () => {
        formData.materiales.push({
            idItem: formData.materiales.length + 1,
            material: '',
            cantidad: 1,
            unidad: 'Pieza'
        })
    }

    // Remove material row
    const removeMaterialRow = (index: number) => {
        formData.materiales.splice(index, 1)
        formData.materiales.forEach((m, i) => {
            m.idItem = i + 1
        })
    }

    // Filtered available tickets (excluyendo tickets finalizados / resueltos / cerrados)
    const availableTickets = computed(() => {
        return tickets.value.filter(ticket => {
            const isFinalized = ticket.estatus === 'Resuelto' || ticket.estatus === 'Cerrado' || ticket.estatus === 'Finalizado'
            if (isFinalized && formData.origenDatosId !== ticket.id) {
                return false
            }
            return true
        })
    })

    // Filtered available services (excluyendo servicios finalizados / realizados / cerrados)
    const availableServices = computed(() => {
        return services.value.filter(servicio => {
            const isFinalized = servicio.estatus === 'Realizado' || servicio.estatus === 'Cerrado' || servicio.estatus === 'Finalizado'
            if (isFinalized && formData.origenDatosId !== servicio.id) {
                return false
            }
            return true
        })
    })

    // Save Reports
    const saveReport = async () => {
        if (!formData.origenDatosId && formData.tipoReporte !== 'Libre') {
            alert('Por favor selecciona un ID de origen de datos.')
            return
        }

        if (!formData.responsableTexto.trim()) {
            alert('Por favor escribe un Responsable en la Sección 2.')
            return
        }

        if (!formData.fechaHoraInicio || !formData.fechaHoraFin) {
            alert('Por favor especifica fecha y hora de inicio y fin.')
            return
        }

        if (!formData.desarrolloActividades.trim()) {
            alert('Por favor detalla el desarrollo de actividades.')
            return
        }

        if (formData.estatusReporte === 'Cerrado / Trabajo Finalizado' && !formData.horaRegresoABase) {
            alert('Por favor, indica la hora de regreso a base para poder cerrar el reporte.')
            return
        }

        isSubmitting.value = true
        try {
            const payload = {
                tipoReporte: formData.tipoReporte,
                origenDatosId: formData.origenDatosId,
                categoria: formData.categoria,
                fechaElaboracion: formData.fechaElaboracion,
                idSubdependencia: formData.idSubdependencia,
                responsableTexto: formData.responsableTexto,
                cargoTexto: formData.cargoTexto,
                ejecutoresIds: formData.ejecutoresIds.filter(id => id > 0),
                horaSalidaBase: formData.horaSalidaBase,
                horaLlegadaSitio: formData.horaLlegadaSitio,
                fechaHoraInicio: formData.fechaHoraInicio,
                fechaHoraFin: formData.fechaHoraFin,
                horaRegresoABase: formData.horaRegresoABase,
                desarrolloActividades: formData.desarrolloActividades,
                fallaReportada: formData.fallaReportada.trim() || asuntoOrigen.value,
                conclusionTrabajo: formData.conclusionTrabajo,
                materiales: formData.materiales,
                evidenciaFotografica: formData.evidenciaFotografica,
                esRetrabajo: formData.esRetrabajo,
                estatusReporte: formData.estatusReporte
            }

            if (isEditMode.value && editReportId.value) {
                const res = await apiFetch(`/reportes/${editReportId.value}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                })
                const folio = res.data?.folio || existingFolio.value || 'Actualizado'
                alert(`¡Éxito! El reporte ${folio} ha sido actualizado en la base de datos.`)
                router.push({ name: 'report-detail', params: { id: editReportId.value } })
            } else {
                const res = await apiFetch('/reportes', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                })

                const folio = res.data?.folio || 'Nuevo'
                alert(`¡Éxito! El reporte ${folio} ha sido guardado en la base de datos.`)
                router.push({ name: 'reports' })
            }
        } catch (error: any) {
            console.error('Error al guardar reporte:', error)
            alert(error.message || 'Error al guardar el reporte técnico.')
        } finally {
            isSubmitting.value = false
        }
    }

// Auto-resize textarea
const autoResize = (event: Event) => {
    const target = event.target as HTMLTextAreaElement;
    target.style.height = 'auto'; // Reset height
    target.style.height = `${target.scrollHeight}px`; // Set to scroll height
};

// Handle file upload for evidence photos with Base64 encoding for persistence
const onFileChange = (event: Event) => {
    const input = event.target as HTMLInputElement
    if (!input.files) return

    const remaining = 10 - formData.evidenciaFotografica.length
    if (remaining <= 0) {
        alert('Máximo 10 fotos permitidas.')
        input.value = ''
        return
    }

    const filesToAdd = Array.from(input.files).slice(0, remaining)
    for (const file of filesToAdd) {
        const reader = new FileReader()
        reader.onload = (e) => {
            const base64Url = e.target?.result as string
            if (base64Url) {
                formData.evidenciaFotografica.push({ url: base64Url, comentario: '' })
            }
        }
        reader.readAsDataURL(file)
    }

    // Reset input so the same file(s) can be selected again if needed
    input.value = ''
}

// Remove a single evidence image
const removeEvidence = (index: number) => {
    const item = formData.evidenciaFotografica[index]
    if (item && item.url && item.url.startsWith('blob:')) URL.revokeObjectURL(item.url)
    formData.evidenciaFotografica.splice(index, 1)
}

// Image Preview Modal
const previewUrl = ref<string | null>(null)
</script>


<template>
    <div class="page-container-create-report">
        <!-- Header -->
        <div class="header-actions">
            <button @click="router.back()" type="button" class="btn-back-header">
                <ArrowLeft :size="16" />
                <span>Regresar</span>
            </button>
            <h2>
                {{ isEditMode ? `Editar Reporte Técnico — ${existingFolio}` : 'Crear Nuevo Reporte Técnico' }}
            </h2>
        </div>

        <form class="report-form" @submit.prevent>
            
            <!--Section 1: Type -->
            <div class="form-section">
                <!-- Section title-->
                <h3 class="section-title">
                    Sección 1 — Tipo
                </h3>
                
                <!-- Report type, report number, elaboration date-->
                <div class="grid-2-cols">
                    <!-- Tipo de Reporte -->
                    <div class="form-group">
                        <label>Tipo de reporte</label>
                        <select v-model="formData.tipoReporte" @change="formData.origenDatosId = null; formData.fallaReportada = ''">
                            <option value="Ticket">Ticket</option>
                            <option value="Servicio Programado">Servicio Programado / Proyecto</option>
                            <option value="Libre">Libre</option>
                        </select>
                    </div>

                    <!-- Fecha de elaboración -->
                    <div class="form-group">
                        <label>Fecha de elaboración</label>
                        <input type="date" v-model="formData.fechaElaboracion" />
                    </div>

                    <!-- Categoría del Trabajo -->
                    <div class="form-group">
                        <label>Categoría del Trabajo *</label>
                        <select v-model="formData.categoria" required>
                            <option value="" disabled>Seleccione una categoría...</option>
                            <option value="Mantenimiento Preventivo">Mantenimiento Preventivo</option>
                            <option value="Mantenimiento Correctivo">Mantenimiento Correctivo</option>
                            <option value="Instalación">Instalación</option>
                            <option value="Mejora">Mejora</option>
                            <option value="Diagnóstico">Diagnóstico</option>
                        </select>
                    </div>

                    <!-- Número de reporte -->
                    <div class="form-group">
                        <label>Número de reporte</label>
                        <input type="text" :value="isEditMode ? existingFolio : 'Generado al guardar...'" disabled class="input-disabled" />
                    </div>

                </div>

                <!-- Origen de datos dropdown list selection-->
                <div class="data-origin-box" :class="{ 'disabled-box': formData.tipoReporte === 'Libre' }">
                    <!-- Subtitle-->
                    <h4>
                        Origen de datos
                    </h4>
                    
                    <div class="form-group" v-if="formData.tipoReporte !== 'Libre'">
                        <!-- Text: Selecciona ID-->
                        <label>
                            Selecciona ID de {{ formData.tipoReporte }}
                        </label>
                        
                        <!-- Select data function / Data source-->
                        <select v-model="formData.origenDatosId" @change="handleOriginChange(formData.origenDatosId, false)">
                            
                            <!-- First Option: Null - Select an option-->
                            <option :value="null">
                                Selecciona una opción...
                            </option>
                            
                            <!-- Second Option: Ticket -->
                            <template v-if="formData.tipoReporte === 'Ticket'">
                                <!-- v-for: Show ticket folio and asunto-->
                                <option v-for="ticket in availableTickets" :key="ticket.id" :value="ticket.id">
                                    {{ ticket.folio }} - {{ ticket.asunto }}
                                </option>
                            </template>

                            <!--Third option: Service-->
                            <template v-if="formData.tipoReporte === 'Servicio Programado'">
                                <!-- v-for: Show service folio and asunto-->
                                <option v-for="servicio in availableServices" :key="servicio.id" :value="servicio.id">
                                    {{ servicio.folio }} - {{ servicio.asunto }}
                                </option>
                            </template>

                        </select>
                    </div>
                    <p v-else class="text-muted">Reporte libre seleccionado. No requiere origen de datos.</p>
                </div>

                <!-- Es Retrabajo? (Bottom of section) -->
                <div class="checkbox-group-horizontal mt-4">
                    <input type="checkbox" v-model="formData.esRetrabajo" id="esRetrabajo" class="w-auto" />
                    <label for="esRetrabajo" class="cursor-pointer mb-0">¿Es un Retrabajo?</label>
                </div>

            </div>

            <!-- Section 2: Client-->
            <div class="form-section">

                <!-- Header Title -->
                <h3 class="section-title">
                    Sección 2 — Cliente
                </h3>

                <!-- Enterprise, responsable, cargo-->
                <div class="grid-2-cols">

                    <!-- Enterprise-->
                    <div class="form-group">
                        <label>Empresa</label>
                        <input type="text" :value="dependencyName" disabled class="input-disabled" />
                    </div>

                    <!-- Subarea dropdown -->
                    <div class="form-group">
                        <label>Dependencia / Área</label>
                        <select v-model="formData.idSubdependencia">
                            <option :value="null">Selecciona un área...</option>
                            <option v-for="area in availableSubareas" :key="area.idSubdependencia" :value="area.idSubdependencia">
                                {{ area.nombre }}
                            </option>
                        </select>
                    </div>

                    <!-- Responsable-->
                    <div class="form-group">
                        <label>Responsable</label>
                        <input type="text" v-model="formData.responsableTexto" placeholder="Ej. Ing. Juan Pérez" />
                    </div>

                    <!-- Cargo responsable -->
                    <div class="form-group">
                        <label>Cargo</label>
                        <input type="text" v-model="formData.cargoTexto" placeholder="Ej. Gerente de Planta" />
                    </div>

                </div>

            </div>

            <!-- Section 3: Executors -->
            <div class="form-section">

                <!-- Header title-->
                <h3 class="section-title">
                    Sección 3 — Ejecutores
                </h3>

                <!-- Executors container -->
                <div class="ejecutores-container">  

                    <!-- Row for each executor -->               
                    <div v-for="(id, index) in formData.ejecutoresIds" :key="index" class="ejecutor-row">
                        
                        <!-- Dropdown list to select executor: OPENNN -->
                        <div class="form-group flex-grow">
                            <select v-model="formData.ejecutoresIds[index]" class="w-full">
                                <option :value="0" disabled>Selecciona un ejecutor...</option>
                                <option v-for="tech in availableTechnicians" :key="tech.idUsuario" :value="tech.idUsuario">
                                    {{ tech.nombre }} {{ tech.apellidos }}
                                </option>
                            </select>
                        </div>

                        <!-- Auto-filled employee number -->
                        <div class="form-group w-32">
                            <input type="text" 
                                   :value="getEjecutorData(id)?.numeroEmpleado || '---'" 
                                   disabled class="input-disabled text-center" />
                        </div>

                        <!-- Auto-filled employee number -->
                        <div class="form-group w-48">
                            <input type="text" 
                                   :value="getEjecutorCargo(id)" 
                                   disabled class="input-disabled text-center" />
                        </div>

                        <!-- Remove button -->
                        <button class="btn-remove" @click="removeEjecutor(index)" title="Eliminar ejecutor">
                            X
                        </button>

                    </div>

                    <!-- Executors actions -->
                    <div class="ejecutores-actions">
                        <!-- Button to add executor -->
                        <button class="btn-outline" @click="addEjecutor" :disabled="formData.ejecutoresIds.length >= 4">
                            Agregar ejecutor
                        </button>
                        <!-- Text: Up to 4 executors-->
                        <span class="text-muted small">
                            Hasta 4 ejecutores en total. (Actual: {{ formData.ejecutoresIds.length }})
                        </span>
                    </div>

                </div>
            </div>

            <!-- Section 4: Generals (Date and name of the activitie)-->
            <div class="form-section">
                <!-- Header title -->
                <h3 class="section-title">
                    Sección 4 — Generales
                </h3>
                
                <!-- Date and time of the activity, name of the activity (autofilled)-->
                <div class="grid-3-cols mb-1-5">
                    <div class="form-group">
                        <label>Hora de salida base</label>
                        <input type="datetime-local" v-model="formData.horaSalidaBase" />
                    </div>

                    <div class="form-group">
                        <label>Hora de llegada a sitio</label>
                        <input type="datetime-local" v-model="formData.horaLlegadaSitio" />
                    </div>

                    <!-- Start time and date -->
                    <div class="form-group">
                        <label>Hora de inicio trabajo</label>
                        <input type="datetime-local" v-model="formData.fechaHoraInicio" />
                    </div>
                </div>

                <div class="grid-3-cols">
                    <!-- End time and date -->
                    <div class="form-group">
                        <label>Hora de fin trabajo</label>
                        <input type="datetime-local" v-model="formData.fechaHoraFin" />
                    </div>

                    <div class="form-group">
                        <label>Hora de regreso a base *</label>
                        <input type="datetime-local" v-model="formData.horaRegresoABase" />
                        <span class="text-xs text-slate-500">Obligatorio al cerrar reporte</span>
                    </div>

                    <!-- Total hours calculated -->
                    <div class="form-group">
                        <label>Horas de trabajo neto</label>
                        <input type="text" :value="totalHorasCalculadas" disabled class="input-disabled highlight-box" />
                    </div>
                </div>

                <!-- F/S/Activitie label - Autofilled based on data origin or user input -->
                <div class="form-group mt-1-5">
                    <label>Descripción de la falla reportada *</label>
                    <textarea
                        v-model="formData.fallaReportada"
                        rows="3"
                        @input="autoResize"
                        class="overflow-hidden"
                        placeholder="Escribe o edita la descripción de la falla..."
                    ></textarea>
                    <span class="text-xs text-slate-500 mt-1">Este campo se prellena según el origen pero puedes editarlo libremente.</span>
                </div>
            </div>            

            <!-- Section 5: Materials and resources list -->
            <div class="form-section">

                <!-- Header title -->
                <h3 class = "section-title">
                    Sección 5 — Desarrollo
                </h3>

                <!-- Activities resume -->
                <div class="form-group">

                    <!-- Label -->
                    <label>
                        Descripción de actividades
                    </label>
                    
                    <!-- Text area -->
                    <textarea
                        v-model="formData.desarrolloActividades"
                        rows="4"
                        @input="autoResize"
                        class="overflow-hidden"
                        placeholder="Describe las actividades realizadas con detalle...">
                    </textarea>

                </div>

                <!-- Materials container -->
                <div class="materials-container mt-1-5">

                    <!-- Header title and button -->
                    <div class="section-header-flex">

                        <!-- Label -->
                        <label class="font-bold">
                            Lista de materiales
                        </label>

                        <!-- Button -->
                        <button type="button" class="btn-outline btn-sm" @click="addMaterialRow">
                            Agregar material
                        </button>

                    </div>
                    
                    <!-- Materials table -->
                    <div class="materials-table">

                        <!-- Headers table -->
                        <div class="materials-header">
                            <div class="col-item text-center">Item</div>
                            <div class="col-mat">Material</div>
                            <div class="col-cant text-center">Cantidad</div>
                            <div class="col-uni">Unidad</div>
                            <div class="col-acc text-center">Acción</div>
                        </div>
                        
                        <!-- Material rows -->
                        <div v-for="(mat, index) in formData.materiales" :key="index" class="material-row">
                            
                            <!-- ID -->
                            <div class="col-item text-center">
                                {{ mat.idItem }}
                            </div>
                            
                            <!-- Material name -->
                            <div class="col-mat">
                                <input type="text" v-model="mat.material" class="w-full" placeholder="Ej. Cable AWG 12" />
                            </div>

                            <!-- Material Quantity-->
                            <div class="col-cant">
                                <input type="number" v-model="mat.cantidad" class="w-full text-center" min="1" />
                            </div>

                            <!-- Unit -->
                            <div class="col-uni">
                                <select v-model="mat.unidad" class="w-full">
                                    <option value="Pza">Pza</option>
                                    <option value="Metros">Metros</option>
                                    <option value="Litros">Litros</option>
                                    <option value="Kgs">Kgs</option>
                                    <option value="Lote">Lote</option>
                                </select>
                            </div>
                            
                            <!-- Remove material button -->
                            <div class="col-acc flex-center">
                                <button type="button" class="btn-remove btn-sm-remove" @click="removeMaterialRow(index)">X</button>
                            </div>
                        </div>

                        <!-- If empty -->
                        <div v-if="formData.materiales.length === 0" class="empty-state">
                            No se han agregado materiales. Haz clic en "Agregar material" si utilizaste refacciones.
                        </div>

                    </div>
                </div>

                <!-- Photos container -->
                <div class="form-group mt-1-5">

                    <!-- Subtitle and Actions -->
                    <div class="section-header-flex mb-2">
                        <label class="font-bold">Fotos (máx 10)</label>
                        <button
                            type="button"
                            class="btn-outline btn-sm flex-center gap-1"
                            @click="triggerFileInput"
                            :disabled="formData.evidenciaFotografica.length >= 10"
                        >
                            <Camera :size="16" />
                            <span>Agregar imagen</span>
                        </button>
                    </div>

                    <!-- Hidden native file input -->
                    <input
                        type="file"
                        ref="fileInputRef"
                        multiple
                        accept="image/*"
                        @change="onFileChange"
                        style="display: none;"
                    />

                    <!-- Empty state upload area -->
                    <div
                        v-if="formData.evidenciaFotografica.length === 0"
                        class="empty-upload-card flex-center flex-col py-6 cursor-pointer"
                        @click="triggerFileInput"
                    >
                        <Camera :size="32" class="text-slate-400 mb-2" />
                        <span class="text-sm font-semibold text-blue-600 mb-1">Haz clic para agregar fotos o imágenes</span>
                        <span class="text-muted small">Hasta 10 imágenes permitidas (aprox ≤ 25 KB/foto)</span>
                        <button type="button" class="btn-outline btn-sm mt-3 flex-center gap-1">
                            <Camera :size="14" />
                            <span>Agregar imagen</span>
                        </button>
                    </div>

                    <!-- Info and counter bar -->
                    <div class="flex justify-between items-center mt-2">
                        <span class="text-muted small">Salida aprox ≤ 25 KB/foto. Tamaño máximo visual ~8x8 cm</span>
                        <span class="text-muted small font-medium">Fotos agregadas: {{ formData.evidenciaFotografica.length }} / 10</span>
                    </div>

                    <!-- Preview grid -->
                    <div class="evidence-preview-grid mt-3" v-if="formData.evidenciaFotografica.length > 0">
                        <div class="evidence-item" v-for="(item, idx) in formData.evidenciaFotografica" :key="idx">
                            <div class="evidence-thumb" @click="previewUrl = item.url">
                                <img :src="item.url" alt="Evidencia" title="Haz clic para previsualizar" />
                                <button type="button" class="btn-remove-thumb" @click.stop="removeEvidence(idx)">&times;</button>
                            </div>
                            <textarea
                                v-model="item.comentario"
                                placeholder="Escribe un comentario o descripción de la foto..."
                                class="evidence-comment-input form-control"
                                rows="2"
                                @input="autoResize"
                            ></textarea>
                        </div>
                    </div>

                </div>

                <!-- tipoReporte-->
                <div class="form-group mt-1-5" v-if="formData.tipoReporte !== 'Libre'">
                    
                    <!-- Subtitle -->
                    <label>Estatus del reporte (solo Ticket/Servicio)</label>

                    <!-- DRopdown list -->
                    <select v-model="formData.estatusReporte">
                        <option value="Abierto / Trabajo Parcial">Abierto (no se finaliza)</option>
                        <option value="Cerrado / Trabajo Finalizado">Cerrado (finalizado)</option>
                    </select>

                    <!-- Text -->
                    <span class="text-muted small mt-1">
                        Si eliges "Cerrado (finalizado)", el sistema cerrará automáticamente el Ticket/Servicio origen.
                    </span>

                </div>

                <!-- Conclusion -->
                <div class="form-group mt-1-5">
                    <label>Conclusión del trabajo</label>
                    <textarea
                        v-model="formData.conclusionTrabajo"
                        rows="3"
                        @input="autoResize"
                        class="overflow-hidden"
                        placeholder="Comentarios sobre la conclusión del trabajo...">
                    </textarea>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-primary" :disabled="isSubmitting" @click="saveReport">
                    <span v-if="isSubmitting">Guardando Reporte...</span>
                    <span v-else>{{ isEditMode ? 'Guardar Cambios del Reporte' : 'Guardar Reporte' }}</span>
                </button>
            </div>

        </form>

        <!-- Image Preview Modal -->
        <div class="modal-overlay" v-if="previewUrl" @click="previewUrl = null">
            <div class="modal-content-img" @click.stop>
                <button class="btn-close-modal" @click="previewUrl = null">&times;</button>
                <img :src="previewUrl" class="img-preview-full" alt="Vista previa detallada" />
            </div>
        </div>

    </div>
</template>

<style scoped>
/* Basic layout */
.page-container-create-report { padding: 1rem; max-width: 1200px; margin: 0 auto; }
@media (min-width: 768px) {
    .page-container-create-report { padding: 2rem; }
}

.header-actions { display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start; margin-bottom: 2rem; }

.btn-back-header {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    color: #475569;
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
}
.btn-back-header:hover {
    background: #e2e8f0;
    color: #0f172a;
}

.form-actions { display: flex; justify-content: flex-end; margin-top: 2rem; }

.btn-primary { background: #3b82f6; color: white; padding: 0.75rem 1rem; border-radius: 6px; border: none; cursor: pointer; width: 100%; transition: background 0.2s; font-size: 1rem; font-weight: 600; }
.btn-primary:hover { background: #2563eb; }
@media (min-width: 768px) {
    .btn-primary { width: auto; padding: 0.5rem 1rem; }
}

.form-section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.25rem; margin-bottom: 1.5rem; }
@media (min-width: 768px) {
    .form-section { padding: 1.5rem; margin-bottom: 2rem; }
}

.section-title { margin-top: 0; margin-bottom: 1.5rem; color: #0f172a; font-size: 1.25rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }
.section-header-flex { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; margin-bottom: 1.5rem; padding-bottom: 0.5rem; }

.grid-2-cols { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1.2rem; }
@media (min-width: 768px) {
    .grid-2-cols { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.5rem; }
}

.grid-3-cols { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1.2rem; }
@media (min-width: 768px) {
    .grid-3-cols { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1.5rem; }
}

.form-group { display: flex; flex-direction: column; gap: 0.5rem; min-width: 0; }
label { font-size: 0.875rem; font-weight: 600; color: #475569; }

input, select { padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1rem; background: white; width: 100%; max-width: 100%; box-sizing: border-box; min-width: 0; }
.input-disabled { background: #e2e8f0; color: #64748b; cursor: not-allowed; }

.data-origin-box { margin-top: 1.5rem; padding: 1.5rem; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; }
.disabled-box { opacity: 0.6; pointer-events: none; background: #f1f5f9; }
.text-muted { color: #64748b; }
.small { font-size: 0.875rem; }

/* Layout Utilities */
.w-full { width: 100%; max-width: 100%; min-width: 0;}
.w-32 { width: 100%; box-sizing: border-box; min-width: 0;}
.w-48 { width: 100%; box-sizing: border-box; min-width: 0;}
.flex-grow { flex-grow: 1; min-width: 0; }
.text-center { text-align: center; }
.mt-1-5 { margin-top: 1.2rem; }
@media (min-width: 768px) {
    .mt-1-5 { margin-top: 1.5rem; }
}
.mt-1 { margin-top: 0.5rem; display: block; }

@media (min-width: 768px) {
    .w-32 { width: 8rem; }
    .w-48 { width: 12rem; }
}

/* Horizontal Checkbox Layout */
.checkbox-group-horizontal { display: flex; flex-direction: row; align-items: center; gap: 0.75rem; }
.checkbox-group-horizontal input[type="checkbox"] { width: 1.25rem; height: 1.25rem; margin: 0; }
.checkbox-group-horizontal label { margin: 0; white-space: nowrap; }

/* Ejecutores Rows */
.ejecutores-container { display: flex; flex-direction: column; gap: 1rem; padding: 1rem; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; }
.ejecutor-row { display: flex; flex-direction: column; gap: 1rem; align-items: stretch; background: #f8fafc; padding: 1rem; border-radius: 6px; border: 1px solid #e2e8f0; }

@media (min-width: 768px) {
    .ejecutor-row { flex-direction: row; align-items: center; padding: 0.75rem; }
}

/* Buttons */
.btn-remove { background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5; border-radius: 6px; width: 100%; height: 44px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
.btn-remove:hover { background: #fecaca; }

@media (min-width: 768px) {
    .btn-remove { width: 36px; height: 36px; flex-shrink: 0; }
}

.ejecutores-actions { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem; }
.btn-outline { background: transparent; border: 1px solid #3b82f6; color: #3b82f6; padding: 0.75rem 1rem; border-radius: 6px; font-weight: 600; cursor: pointer; transition: 0.2s; width: 100%; }
.btn-outline:hover:not(:disabled) { background: #eff6ff; }
.btn-outline:disabled { border-color: #cbd5e1; color: #94a3b8; cursor: not-allowed; }

@media (min-width: 768px) {
    .ejecutores-actions { flex-direction: row; align-items: center; gap: 1rem; }
    .btn-outline { width: auto; padding: 0.5rem 1rem; }
}

/* Highlight Box for the Math */
.highlight-box { font-weight: bold; color: #0f172a; background: #e0f2fe; border-color: #7dd3fc; }

/* Section 5 Specific Styles */
textarea { width: 100%; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 6px; font-family: inherit; resize: vertical; box-sizing: border-box; overflow: hidden; background: #ffffff; }
.font-bold { font-weight: 600; color: #475569; }
.btn-sm { padding: 0.5rem 0.75rem; font-size: 0.875rem; border-width: 1px; }

@media (min-width: 768px) {
    .btn-sm { padding: 0.25rem 0.75rem; }
}

.btn-sm-remove { width: 36px; height: 36px; font-size: 1rem; }
@media (min-width: 768px) {
    .btn-sm-remove { width: 28px; height: 28px; font-size: 0.75rem; }
}

.flex-center { display: flex; justify-content: center; align-items: center; }

/* 1. The Parent Rows (These must be flex containers to sit horizontally) */
.materials-table { border: 1px solid #cbd5e1; border-radius: 8px; overflow-x: auto; margin-top: 0.5rem; background: #fff; }
.materials-header { display: flex; background: #0f172a; color: white; padding: 0.75rem 0; font-weight: bold; font-size: 0.875rem; min-width: max-content; }
.material-row { display: flex; padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0; align-items: center; min-width: max-content; }
.material-row:last-child { border-bottom: none; }
.empty-state { padding: 1.5rem; text-align: center; color: #64748b; font-size: 0.875rem; font-style: italic; min-width: 100%; }

/* 2. The Children Cells (This adds the internal padding to every column) */
.materials-header > div,
.material-row > div { 
    padding: 0 1rem; 
}

/* Table Columns */
.col-item { width: 5rem; flex-shrink: 0; box-sizing: border-box; }
.col-mat { flex-grow: 1; flex-shrink: 0; min-width: 15rem; box-sizing: border-box; }
.col-cant { width: 8rem; flex-shrink: 0; box-sizing: border-box; }
.col-uni { width: 8rem; flex-shrink: 0; box-sizing: border-box; }
.col-acc { width: 6rem; flex-shrink: 0; box-sizing: border-box; }

.empty-upload-card {
    border: 2px dashed #cbd5e1;
    border-radius: 8px;
    background: #f8fafc;
    text-align: center;
    padding: 1.5rem;
    transition: all 0.2s;
    cursor: pointer;
}
.empty-upload-card:hover {
    border-color: #3b82f6;
    background: #eff6ff;
}
.gap-1 { gap: 0.25rem; }
.gap-1-5 { gap: 0.375rem; }

/* Evidence preview grid */
.evidence-preview-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    margin-top: 1rem;
}
.evidence-item {
    display: flex;
    flex-direction: column;
    width: 200px;
    gap: 0.5rem;
}
.evidence-thumb {
    position: relative;
    width: 100%;
    height: 120px;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid #cbd5e1;
    cursor: pointer;
    transition: box-shadow 0.2s;
}
.evidence-thumb:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.evidence-thumb img {
    width: 100%;
    height: 100%;
    object-fit: contain; /* Changed from cover so it isn't cropped */
    background: #f8fafc;
}
.btn-remove-thumb {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(239, 68, 68, 0.9);
    color: white;
    border: none;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    padding: 0;
    transition: background 0.2s;
    z-index: 10;
}
.btn-remove-thumb:hover {
    background: rgba(220, 38, 38, 1);
}
.evidence-comment-input {
    font-size: 12px;
    padding: 0.5rem;
    resize: none;
    overflow: hidden;
    min-height: 50px;
}

/* Image Preview Modal */
.modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
}
.modal-content-img {
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
}
.img-preview-full {
    max-width: 100%;
    max-height: 90vh;
    object-fit: contain;
    border-radius: 4px;
}
.btn-close-modal {
    position: absolute;
    top: -40px;
    right: 0;
    background: none;
    border: none;
    color: white;
    font-size: 32px;
    font-weight: bold;
    cursor: pointer;
}
</style>
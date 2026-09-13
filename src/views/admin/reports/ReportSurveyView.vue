<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../../stores/authStore'
import { getDependenciaName, mockSubdependencias } from '../../../data/mockDependencias'
import { ArrowLeft, Star, Send } from 'lucide-vue-next'
import { apiFetch } from '../../../api/apiClient'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const currentUser = computed(() => authStore.currentUser)

// Safety Check: Role 0 (Default User) is not allowed
if (!currentUser.value || currentUser.value.rol === 0) {
    router.replace({ name: 'dashboard' })
}

const idReporte = parseInt(route.params.id as string)
const currentReport = ref<any>(null)
const isLoading = ref(true)

// Form state
const isReadOnly = ref(false)
const isSubmitted = ref(false)
const form = ref({
    calificacion: 0,
    comentarios: '',
    nombreFirma: ''
})

// Header Info
const empresaName = computed(() => currentReport.value ? getDependenciaName(currentReport.value.idDependencia) : 'Desconocida')
const areaName = computed(() => {
    if (!currentReport.value || !currentReport.value.idSubdependencia) return 'N/A'
    if (currentReport.value.nombreSubdependencia) return currentReport.value.nombreSubdependencia
    const sub = mockSubdependencias.find(s => s.idSubdependencia === currentReport.value.idSubdependencia)
    return sub ? sub.nombre : 'N/A'
})
const folioReporte = computed(() => currentReport.value?.folio || 'N/A')

const fetchSurveyData = async () => {
    isLoading.value = true
    try {
        const repRes = await apiFetch(`/reportes/${idReporte}`)
        if (repRes.data) {
            currentReport.value = repRes.data
        }

        // Try fetching existing survey
        try {
            const surveyRes = await apiFetch(`/encuestas/${idReporte}`)
            if (surveyRes.data) {
                isReadOnly.value = true
                form.value.calificacion = surveyRes.data.calificacion
                form.value.comentarios = surveyRes.data.comentarios || ''
                form.value.nombreFirma = surveyRes.data.nombreFirma || ''
            }
        } catch {
            // No survey yet, ready to fill
            isReadOnly.value = false
        }
    } catch (error) {
        console.error('Error al cargar reporte para encuesta:', error)
        alert('Reporte no encontrado o no autorizado')
        router.back()
    } finally {
        isLoading.value = false
    }
}

onMounted(() => {
    fetchSurveyData()
})

const setRating = (rating: number) => {
    if (isReadOnly.value) return;
    form.value.calificacion = rating
}

const submitSurvey = async () => {
    if (isReadOnly.value) return;

    if (form.value.calificacion === 0) {
        alert("Por favor selecciona una calificación del 1 al 10.")
        return
    }

    if (!form.value.nombreFirma.trim()) {
        alert("Por favor ingresa tu nombre para firmar la encuesta.")
        return
    }

    try {
        await apiFetch('/encuestas', {
            method: 'POST',
            body: JSON.stringify({
                idReporte: idReporte,
                calificacion: form.value.calificacion,
                comentarios: form.value.comentarios,
                nombreFirma: form.value.nombreFirma
            })
        })

        isSubmitted.value = true
        isReadOnly.value = true
        setTimeout(() => {
            if (currentUser.value?.rol === 2) {
                router.push({ name: 'dashboard' })
            } else {
                router.push({ name: 'report-detail', params: { id: idReporte } })
            }
        }, 2500)
    } catch (error: any) {
        console.error('Error al guardar encuesta:', error)
        alert(error.message || 'Error al guardar la evaluación.')
    }
}
</script>

<template>
    <div class="page-container max-w-2xl mx-auto py-8 px-4">
        <!-- Back Button -->
        <button @click="router.back()" class="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-6 group">
            <ArrowLeft :size="18" class="group-hover:-translate-x-1 transition-transform" />
            <span class="font-medium">Volver al Reporte</span>
        </button>

        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <!-- Header -->
            <div class="bg-indigo-600 text-white p-6 md:p-8 text-center flex flex-col items-center">
                <Star :size="48" class="text-amber-400 mb-4" :fill="'currentColor'" />
                <h1 class="text-2xl md:text-3xl font-bold mb-2">Evaluación de Servicio</h1>
                <p class="text-indigo-100 opacity-90 max-w-md mx-auto">Tu opinión es muy importante para ayudarnos a mantener la calidad de nuestros servicios.</p>
            </div>

            <!-- Context Info -->
            <div class="bg-slate-50 border-b border-slate-100 p-4 flex flex-wrap gap-4 justify-between items-center text-sm">
                <div>
                    <span class="block text-slate-500 font-semibold mb-0.5">Empresa</span>
                    <span class="text-slate-800 font-medium">{{ empresaName }}</span>
                </div>
                <div>
                    <span class="block text-slate-500 font-semibold mb-0.5">Área / Subdependencia</span>
                    <span class="text-slate-800 font-medium">{{ areaName }}</span>
                </div>
                <div>
                    <span class="block text-slate-500 font-semibold mb-0.5">Folio Reporte</span>
                    <span class="bg-white px-2 py-0.5 border border-slate-200 rounded font-mono text-xs text-slate-700">{{ folioReporte }}</span>
                </div>
            </div>

            <!-- Pre-existing notification -->
            <div v-if="isReadOnly && !isSubmitted" class="m-6 p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-sm flex gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="flex-shrink-0 text-blue-600"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                Este reporte ya cuenta con una evaluación de servicio registrada. La información mostrada a continuación es de solo lectura.
            </div>

            <!-- Success notification -->
            <div v-if="isSubmitted" class="m-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-3 animate-fade-in">
                <div class="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 text-emerald-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div>
                    <h4 class="font-bold">¡Encuesta enviada con éxito!</h4>
                    <p class="text-sm opacity-90">Redirigiendo al reporte...</p>
                </div>
            </div>

            <!-- Form Body -->
            <div class="p-6 md:p-8 space-y-8">
                
                <!-- Rating Score -->
                <div class="form-section">
                    <label class="block text-slate-800 font-bold mb-1 text-lg text-center">Calificación del Servicio</label>
                    <p class="text-slate-500 text-sm text-center mb-6">En una escala del 1 al 10, ¿cómo calificarías la atención recibida?</p>
                    
                    <div class="flex flex-wrap justify-center gap-2">
                        <button 
                            v-for="i in 10" 
                            :key="i"
                            type="button"
                            @click="setRating(i)"
                            :class="[
                                'w-12 h-12 rounded-xl font-bold text-lg transition-all',
                                form.calificacion === i ? 'bg-indigo-600 text-white shadow-md scale-110' : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600',
                                isReadOnly ? 'cursor-default' : 'cursor-pointer'
                            ]"
                            :disabled="isReadOnly"
                        >
                            {{ i }}
                        </button>
                    </div>
                </div>

                <!-- Comments -->
                <div class="form-section">
                    <label class="block text-slate-800 font-bold mb-2">Comentarios / Observaciones</label>
                    <textarea 
                        v-model="form.comentarios"
                        class="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                        :class="{'opacity-80 cursor-not-allowed': isReadOnly}"
                        placeholder="Escribe tus comentarios aquí... (Opcional)"
                        :readonly="isReadOnly"
                    ></textarea>
                </div>

                <!-- Signature / Name -->
                <div class="form-section">
                    <label class="block text-slate-800 font-bold mb-2">Nombre</label>
                    <p class="text-slate-500 text-sm mb-3">Nombre de la persona que recibe y avala los trabajos realizados.</p>
                    <input 
                        type="text" 
                        v-model="form.nombreFirma"
                        class="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                        :class="{'opacity-80 cursor-not-allowed': isReadOnly}"
                        placeholder="Ej. Juan Pérez"
                        :readonly="isReadOnly"
                    />
                </div>

                <!-- Submit Action -->
                <div v-if="!isReadOnly" class="pt-4 border-t border-slate-100 flex justify-end">
                    <button @click="submitSurvey" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg flex items-center gap-2 transition-colors shadow-sm">
                        <Send :size="18" />
                        Enviar Evaluación
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.page-container {
    font-family: system-ui, -apple-system, sans-serif;
}
.animate-fade-in {
    animation: fadeIn 0.4s ease-out forwards;
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>

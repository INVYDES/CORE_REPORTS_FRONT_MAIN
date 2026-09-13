<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../../stores/authStore'
import { storeToRefs } from 'pinia'
import { apiFetch } from '../../../api/apiClient'
import { 
    Network, 
    Trash2, 
    Save,
    Map
} from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const { currentUser } = storeToRefs(authStore)

// Security & Access Control: Only Tech Admin (1) and Commercial Admin (2)
if (!currentUser.value || (currentUser.value.rol !== 1 && currentUser.value.rol !== 2)) {
    router.push({ name: 'dashboard' })
}

// Data Integration
const companyName = computed(() => currentUser.value?.empresa?.nombre || 'Mi Empresa')

// Local reactive array for subdependencies
const localSubareas = ref<any[]>([])
const isLoading = ref(true)

const fetchSubareas = async () => {
    isLoading.value = true
    try {
        const res = await apiFetch('/subdependencias')
        if (res.data) {
            localSubareas.value = res.data
        }
    } catch (err) {
        console.error('Error al cargar subáreas:', err)
    } finally {
        isLoading.value = false
    }
}

onMounted(() => {
    fetchSubareas()
})

// UI State
const isModalOpen = ref(false)
const isEditing = ref(false)
const form = ref({
    idSubdependencia: 0,
    nombre: ''
})

const openModalForAdd = () => {
    form.value = {
        idSubdependencia: 0,
        nombre: ''
    }
    isEditing.value = false
    isModalOpen.value = true
}

const openModalForEdit = (subarea: any) => {
    form.value = {
        idSubdependencia: subarea.idSubdependencia,
        nombre: subarea.nombre
    }
    isEditing.value = true
    isModalOpen.value = true
}

const deleteSubarea = async (idSubdependencia: number) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta subárea?')) {
        try {
            await apiFetch(`/subdependencias/${idSubdependencia}`, {
                method: 'DELETE'
            })
            localSubareas.value = localSubareas.value.filter(s => s.idSubdependencia !== idSubdependencia)
            alert('Subárea eliminada exitosamente.')
        } catch (err: any) {
            alert('Error al eliminar subárea: ' + (err.message || 'Error desconocido'))
        }
    }
}

const handleDeleteFromModal = () => {
    deleteSubarea(form.value.idSubdependencia)
    isModalOpen.value = false
}

const saveSubarea = async () => {
    if (!form.value.nombre.trim()) {
        alert("El nombre no puede estar vacío.")
        return
    }

    try {
        if (isEditing.value) {
            const res = await apiFetch(`/subdependencias/${form.value.idSubdependencia}`, {
                method: 'PUT',
                body: JSON.stringify({ nombre: form.value.nombre })
            })
            if (res.data) {
                const index = localSubareas.value.findIndex(s => s.idSubdependencia === form.value.idSubdependencia)
                if (index !== -1) {
                    localSubareas.value[index] = res.data
                }
                alert('Subárea actualizada con éxito.')
            }
        } else {
            const res = await apiFetch('/subdependencias', {
                method: 'POST',
                body: JSON.stringify({ nombre: form.value.nombre })
            })
            if (res.data) {
                localSubareas.value.push(res.data)
                alert('Subárea creada con éxito en MySQL.')
            }
        }
        isModalOpen.value = false
    } catch (err: any) {
        alert('Error al guardar subárea: ' + (err.message || 'Error del servidor'))
    }
}
</script>

<template>
    <div class="page-container-company">
        <!-- Main Header -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div class="w-full sm:w-auto">
                <h2 class="text-2xl font-bold text-slate-900">Gestión de Subdependencias / Áreas</h2>
                <p class="text-slate-500 mt-1">Administración de áreas operativas para {{ companyName }}</p>
            </div>
            
            <button @click="openModalForAdd" class="btn-primary flex justify-center items-center gap-2 w-full sm:w-auto whitespace-nowrap">
                <Network :size="16"/>
                Añadir Nueva Área
            </button>
        </div>

        <div class="dashboard-grid">
            <!-- SECTION: List of Areas -->
            <section class="settings-section">
                <div class="section-header">
                    <Map class="text-indigo-600" :size="20"/>
                    <h3>Áreas Asignadas</h3>
                </div>
                
                <div class="section-body">
                    <div class="users-grid">
                        <div v-for="area in localSubareas" :key="area.idSubdependencia" @click="openModalForEdit(area)" class="user-card card relative group cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-center">
                            <div class="user-avatar">
                                <Network :size="20" class="text-indigo-600"/>
                            </div>
                            <div class="user-info w-full">
                                <h4>{{ area.nombre }}</h4>
                                <div class="user-meta mt-1">
                                    <span class="user-badge">Área Activa</span>
                                    <span class="text-xs text-slate-500 block mt-1">ID: REF-{{ area.idSubdependencia }}</span>
                                </div>
                            </div>
                            <div class="ml-auto flex items-center text-slate-300 group-hover:text-blue-500 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                            </div>
                        </div>

                        <!-- Empty state if no areas -->
                        <div v-if="localSubareas.length === 0" class="col-span-full">
                            <div class="bg-amber-50 border border-amber-200 rounded-lg p-6 flex flex-col items-center gap-3 text-center w-full">
                                <Network class="text-amber-500" :size="32" />
                                <h4 class="text-amber-800 font-bold">No hay áreas configuradas</h4>
                                <p class="text-amber-700 text-sm">Aún no se han configurado subdependencias o áreas operativas para esta empresa. Haz clic en "Añadir Nueva Área" para comenzar.</p>
                            </div>
                        </div>

                    </div>
                </div>
            </section>
        </div>

        <!-- Add/Edit Modal -->
        <Teleport to="body">
            <div v-if="isModalOpen" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                    <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 class="text-lg font-bold text-slate-800">{{ isEditing ? 'Detalles de Área' : 'Añadir Nueva Área' }}</h3>
                        <button @click="isModalOpen = false" class="text-slate-400 hover:text-slate-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                    </div>
                    
                    <div class="p-6 overflow-y-auto form-modal-content">
                        <div class="form-group mb-0">
                            <label>Nombre del Área o Subdependencia</label>
                            <input type="text" v-model="form.nombre" class="editable-input" placeholder="Ej. Línea de Producción 1" />
                            <label>Responsable Dependencia</label>
                            <input type="text" class="editable-input" placeholder = "Responsable Dependencia"/>
                            <label>Correo principal</label>
                            <input type="text" class="editable-input" placeholder = "Ej. correo_principal@empresa.com"/>
                            <label>Correo secundario</label>
                            <input type="text" class="editable-input" placeholder = "Ej. correo_secundario@empresa.com"/>
                        </div>
                    </div>
                    
                    <div class="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center gap-3">
                        <button v-if="isEditing" @click="handleDeleteFromModal" class="btn-outline text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700 flex items-center gap-2 px-3 py-2">
                            <Trash2 :size="16"/> <span class="hidden sm:inline">Eliminar</span>
                        </button>
                        <div v-else></div>
                        
                        <div class="flex gap-2 sm:gap-3">
                            <button @click="isModalOpen = false" class="btn-outline px-3 py-2">Cancelar</button>
                            <button @click="saveSubarea" class="btn-primary flex items-center gap-2 py-2">
                                <Save :size="16"/> Guardar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<style scoped>
.page-container-company {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    font-family: system-ui, -apple-system, sans-serif;
}



.dashboard-grid {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.settings-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.section-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #f1f5f9;
}
.section-header h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #1e293b;
}

.card {
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    padding: 1.5rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

/* Form Styles */
.form-group label {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    color: #475569;
    margin-bottom: 0.5rem;
}

.editable-input {
    width: 100%;
    padding: 0.65rem 1rem;
    border-radius: 6px;
    font-size: 0.95rem;
    outline: none;
    transition: all 0.2s;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    color: #0f172a;
}

.editable-input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Users Grid Styles (Reused for Areas) */
.users-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.25rem;
}

.user-card {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1.25rem;
    transition: transform 0.2s, box-shadow 0.2s;
}
.user-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
    border-color: #cbd5e1;
}

.user-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
    color: #4f46e5;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.user-info h4 {
    margin: 0;
    font-size: 1rem;
    color: #0f172a;
    font-weight: 600;
}

.user-badge {
    display: inline-block;
    padding: 0.15rem 0.5rem;
    background: #f1f5f9;
    color: #475569;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
}

/* Buttons */
.btn-primary {
    background: #2563eb;
    color: white;
    border: none;
    padding: 0.6rem 1.25rem;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
}
.btn-primary:hover {
    background: #1d4ed8;
}

.btn-outline {
    background: transparent;
    color: #475569;
    border: 1px solid #cbd5e1;
    padding: 0.6rem 1.25rem;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}
.btn-outline:hover {
    background: #f1f5f9;
    color: #0f172a;
}
</style>

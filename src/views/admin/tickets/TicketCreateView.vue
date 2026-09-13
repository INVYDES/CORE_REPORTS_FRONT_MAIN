<script setup lang="ts">
    import { ref } from 'vue'
    import { useRouter } from 'vue-router'
    import { Camera, X } from 'lucide-vue-next'
    import { useAuthStore } from '../../../stores/authStore'
    import { apiFetch } from '../../../api/apiClient'

    const router = useRouter()
    const authStore = useAuthStore()
    const user = authStore.currentUser

    // The Form Data State
    const formData = ref({
        dependencia: user?.empresa?.nombre || 'Empresa de Prueba S.A. de C.V.',
        solicitante: user ? `${user.nombre} ${user.apellidos}` : 'Administrador',
        cargo: 'Administrador de Plataforma',
        asunto: '',
        prioridad: 'Media',
        descripcion: ''
    })

    const isSubmitting = ref(false)
    const errorMessage = ref('')

    // Photo Handling State
    const photoPreview = ref<string | null>(null)
    const fileInput = ref<HTMLInputElement | null>(null)

    // "Fake" Upload Logic
    const handlePhotoSelect = (event: Event) => {
        const target = event.target as HTMLInputElement
        if (target.files && target.files[0]) {
            const file = target.files[0]
            photoPreview.value = URL.createObjectURL(file)
        }
    }

    // Reset hidden input
    const clearPhoto = () => {
        photoPreview.value = null
        if (fileInput.value) {
            fileInput.value.value = ''
        }
    }

    // Submit Logic real con Laravel API
    const submitTicket = async () => {
        isSubmitting.value = true
        errorMessage.value = ''
        try {
            const res = await apiFetch('/tickets', {
                method: 'POST',
                body: JSON.stringify({
                    asunto: formData.value.asunto,
                    descripcion: formData.value.descripcion,
                    prioridad: formData.value.prioridad,
                    solicitante: formData.value.solicitante,
                    cargo: formData.value.cargo
                })
            })

            const folioCreado = res.data?.folio || 'TCK-NUEVO'
            alert(`¡Ticket ${folioCreado} creado exitosamente en MySQL!`)
            router.push({ name: 'dashboard' })
        } catch (error: any) {
            console.error('Error al crear ticket:', error)
            errorMessage.value = error.message || 'Error al guardar el ticket en el servidor.'
            alert(`Error: ${errorMessage.value}`)
        } finally {
            isSubmitting.value = false
        }
    }
</script>
<!-------------------------------------------------------------------------------------------------->
<template>
    <div class="page-container-ticket-create">
        
        <!-- Header-->
        <header class="form-header">
            <h1>Nuevo Ticket de Soporte</h1>
            <p class="subtitle">Complete los detalles para registrar la incidencia.</p>
        </header>

        <div class="card form-card">

            <!-- Form start-->
            <form @submit.prevent="submitTicket" class="ticket-form">
                
                <!-- Grid-->
                <div class="form-grid">

                    <!-- Dependency -->
                    <div class="form-group">
                        <label>Dependencia *</label>
                        <input
                            type="text"
                            v-model="formData.dependencia"
                            required
                            class="fat-input"
                        />
                    </div>
                    
                    <!-- Applicant-->
                    <div class="form-group">
                        <label>Solicitante *</label>
                        <input
                            type="text"
                            v-model="formData.solicitante"
                            required
                            placeholder="Nombre completo"
                            class="fat-input"
                        />
                    </div>

                </div>

                <!-- Grid -->
                <div class="form-grid">

                    <!--Position/Job-->
                    <div class="form-group">
                        <label>Cargo</label>
                        <input
                            type="text"
                            v-model="formData.cargo"
                            placeholder="Ej. Supervisor de Turno"
                            class="fat-input"
                        />
                    </div>
                    
                    <!--Afair-->
                    <div class="form-group">
                        <label>Asunto *</label>
                        <input
                            type="text"
                            v-model="formData.asunto"
                            required
                            placeholder="Resumen corto del problema"
                            class="fat-input"
                        />
                    </div>
                </div>

                <!--Priority-->
                <div class="form-group">
                    <!-- Label-->
                    <label>
                        Prioridad *
                    </label>
                    <!--Selector-->
                    <div class="priority-selector">
                        <!--Low Priority-->
                        <label class="priority-chip" :class="{ 'active-baja': formData.prioridad === 'Baja' }">
                            <input
                                type="radio"
                                v-model="formData.prioridad"
                                value="Baja"
                                name="prioridad"
                            >
                            <span>! Baja</span>
                        </label>
                        
                        <!-- Medium Priority -->
                        <label class="priority-chip" :class="{ 'active-media': formData.prioridad === 'Media' }">
                            <input
                                type="radio"
                                v-model="formData.prioridad"
                                value="Media"
                                name="prioridad"
                            >
                            <span>!! Media</span>
                        </label>
                        
                        <!-- High Priority -->
                        <label class="priority-chip" :class="{ 'active-alta': formData.prioridad === 'Alta' }">
                            <input
                                type="radio"
                                v-model="formData.prioridad"
                                value="Alta"
                                name="prioridad"
                            >
                            <span>!!! Alta</span>
                        </label>
                        
                    </div>
                </div>

                <!-- Detailed description -->
                <div class="form-group">
                    <label>Descripción detallada *</label>
                    <textarea 
                        v-model="formData.descripcion" 
                        required 
                        rows="4" 
                        placeholder="Describa el problema, equipos afectados, o cualquier ruido/comportamiento inusual..."
                        class="fat-input textarea"
                    ></textarea>
                </div>

                <!-- Photograph evidence-->
                <div class="form-group">
                    <label>Evidencia Fotográfica (Opcional)</label>
                    
                    <!-- File/photography file-->
                    <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        ref="fileInput"
                        @change="handlePhotoSelect"
                        class="hidden-file-input"
                        id="photo-upload"
                    />

                    <!--Upload Area-->
                    <div v-if="!photoPreview" class="upload-area">
                        <label for="photo-upload" class="btn-upload">
                            <Camera :size="24" class="icon" />
                            <span>Tomar Foto o Subir Archivo</span>
                        </label>
                    </div>

                    <!-- Preview Area-->
                    <div v-else class="preview-area">
                        <div class="image-wrapper">
                            <img :src="photoPreview" alt="Vista previa de la evidencia" />
                            <!--Remove image button-->
                            <button
                                type="button"
                                @click="clearPhoto"
                                class="btn-remove-photo"
                                title="Quitar foto"
                            >
                                <X :size="16" />
                            </button>
                        </div>
                    </div>

                </div>

                <div class="divider"></div>

                <!-- Send button-->
                <div class="form-actions">
                    <button type="submit" :disabled="isSubmitting" class="btn-enviar">
                        {{ isSubmitting ? 'Guardando en MySQL...' : 'Crear Ticket' }}
                    </button>
                </div>

            </form>
        </div>
    </div>
</template>
<!-------------------------------------------------------------------------------------------------->
<style scoped lang="scss">
.page-container-ticket-create{
    max-width: 800px;
    margin: 0 auto;
    padding: 1rem;
}

// Header
.form-header {
    margin-bottom: 1.5rem;

    h1 {
        font-size: 1.8rem;
        color: #0f172a;
        margin: 0.5rem 0 0.2rem 0;
    }

    .subtitle {
        color: #64748b;
        font-size: 0.95rem;
        margin: 0;
    }
}

.card {
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.form-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.2rem;
    margin-bottom: 1.2rem;
}

@media (min-width: 768px) {
    .form-grid {
        grid-template-columns: 1fr 1fr;
    }
}

//Input
.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-bottom: 1.2rem;

    label {
        font-size: 0.85rem;
        font-weight: 600;
        color: #475569;
    }
}

.fat-input {
    width: 100%;
    box-sizing: border-box;
    min-height: 48px;
    padding: 0.8rem 1rem;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-size: 1rem;
    color: #334155;
    background: white;
    transition: border-color 0.2s;

    &:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        outline: none;
    }
    
    &::placeholder {
        color: #94a3b8;
    }
}

.textarea {
    resize: vertical;
    min-height: 100px;
}

// Priority Buttons
.priority-selector {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap; 
}

.priority-chip {
    flex: 1;
    text-align: center;
    min-height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    background: white;
    color: #64748b;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s;

    input { display: none; }

    &.active-baja { background: #f1f5f9; border-color: #94a3b8; color: #475569; }
    &.active-media { background: #ffedd5; border-color: #f97316; color: #c2410c; }
    &.active-alta { background: #fee2e2; border-color: #ef4444; color: #b91c1c; }
}

// Photo upload
.hidden-file-input {
    display: none;
}

.upload-area {
    width: 100%;
}

.btn-upload {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    min-height: 120px;
    background: #f8fafc;
    border: 2px dashed #cbd5e1;
    border-radius: 8px;
    color: #64748b;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;

    .icon { color: #94a3b8; }

    &:hover {
        background: #f1f5f9;
        border-color: #94a3b8;
    }
}

.preview-area {
    display: flex;
    justify-content: flex-start;
}

.image-wrapper {
    position: relative;
    width: 100%;
    max-width: 300px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e2e8f0;

    img {
        display: block;
        width: 100%;
        height: auto;
    }
}

// Actions??

.btn-remove-photo {
    position: absolute;
    top: 8px;
    right: 8px;
    background: rgba(0,0,0,0.6);
    color: white;
    border: none;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.2s;

    &:hover { background: rgba(239, 68, 68, 0.9); } 
}

.divider {
    height: 1px;
    background: #e2e8f0;
    width: 100%;
    margin: 1.5rem 0;
}

.form-actions {
    display: flex;
    gap: 1rem;
    flex-direction: column-reverse; 
}

@media (min-width: 768px) {
    .form-actions {
        flex-direction: row;
        justify-content: flex-end;
    }
}

.btn-enviar {
    background: #2563eb;
    color: white;
    border: none;
    min-height: 48px;
    padding: 0 2rem;
    border-radius: 8px;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
    width: 100%; /* Full width on mobile */

    &:hover { background: #1d4ed8; }
}

@media (min-width: 768px) {
    .btn-enviar { width: auto; }
}

@media (min-width: 768px) {
    .btn-cancelar { width: auto; }
}
</style>
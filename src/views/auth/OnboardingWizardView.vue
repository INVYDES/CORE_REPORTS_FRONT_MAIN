<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/authStore'
import { storeToRefs } from 'pinia'
import { mockUsers } from '../../data/mockUsers'
import type { Usuario } from '../../data/mockUsers'

const router = useRouter()
const authStore = useAuthStore()
const { currentUser } = storeToRefs(authStore)

// Protection logic: Only Admin Comercial (Rol 2) and "isFirstLogin" (simulated)
onMounted(() => {
    // In a real app, isFirstLogin would be checked. For our simulation, 
    // we'll assume they need onboarding if accessing this route and are Rol 2.
    if (!currentUser.value || currentUser.value.rol !== 2) {
        router.push({ name: 'dashboard' })
    }
})

// form state for Admin Tecnico (Rol 1)
const adminTecnico = ref({
    nombre: '',
    apellidos: '',
    correo: '',
    password: ''
})

// form state for Tecnicos (Rol 3)
const tecnicos = ref([
    { nombre: '', apellidos: '', correo: '', numeroEmpleado: '' }
])

const addTecnico = () => {
    tecnicos.value.push({ nombre: '', apellidos: '', correo: '', numeroEmpleado: '' })
}

const removeTecnico = (index: number) => {
    if (tecnicos.value.length > 1) {
        tecnicos.value.splice(index, 1)
    }
}

const completeOnboarding = () => {
    // 1. Basic Validation could go here
    if (!adminTecnico.value.nombre || !adminTecnico.value.correo) {
        alert('El Administrador Técnico requiere al menos nombre y correo.')
        return
    }

    // 2. Simulate saving users to mockUsers
    const dependencyId = currentUser.value?.idDependencia || 0
    
    // Auto-generate IDs
    let nextId = mockUsers.length > 0 ? Math.max(...mockUsers.map((u: Usuario) => u.idUsuario)) + 1 : 1

    // Add Admin Tecnico
    mockUsers.push({
        idUsuario: nextId++,
        idDependencia: dependencyId,
        numeroEmpleado: `ADM-${nextId}`, // Simulated employee number
        rol: 1, // Admin Tecnico
        nombre: adminTecnico.value.nombre,
        apellidos: adminTecnico.value.apellidos,
        correo: adminTecnico.value.correo,
        password: adminTecnico.value.password || '',
        estado: 1,
        fechaCreacion: new Date().toISOString().split('T')[0] || '',
        ultimoAcceso: ''
    })

    // Add Tecnicos
    tecnicos.value.forEach(tech => {
        if (tech.nombre || tech.correo) { // Only add if they typed something
            mockUsers.push({
                idUsuario: nextId++,
                idDependencia: dependencyId,
                numeroEmpleado: tech.numeroEmpleado || `EMP-${nextId}`,
                rol: 3, // Tecnico
                nombre: tech.nombre,
                apellidos: tech.apellidos || '',
                correo: tech.correo || '',
                estado: 1,
                fechaCreacion: new Date().toISOString().split('T')[0] || '',
                ultimoAcceso: ''
            })
        }
    })

    // 3. Simulate updating currentUser isFirstLogin=false could happen here
    // currentUser.value.isFirstLogin = false

    // 4. Redirect to Dashboard
    alert('¡Configuración completada exitosamente!')
    router.push({ name: 'dashboard' })
}
</script>

<template>
    <div class="onboarding-wizard">
        <div class="wizard-container">
            
            <div class="wizard-header">
                <h1>Bienvenido a coreReports</h1>
                <p>Configuremos tu equipo de trabajo para empezar a operar.</p>
            </div>

            <!-- Section 1: Admin Tecnico -->
            <div class="wizard-section">
                <div class="section-title">
                    <h2>1. Administrador Técnico</h2>
                    <p class="subtitle">Esta persona será la encargada de gestionar los tickets de servicio, asignar tareas y aprobar los reportes finales.</p>
                </div>
                
                <div class="form-grid">
                    <div class="input-group">
                        <label>Nombre *</label>
                        <input type="text" v-model="adminTecnico.nombre" placeholder="Nombre" required />
                    </div>
                    <div class="input-group">
                        <label>Apellidos *</label>
                        <input type="text" v-model="adminTecnico.apellidos" placeholder="Apellidos" required />
                    </div>
                    <div class="input-group">
                        <label>Correo Electrónico *</label>
                        <input type="email" v-model="adminTecnico.correo" placeholder="correo@empresa.com" required />
                    </div>
                    <div class="input-group">
                        <label>Contraseña *</label>
                        <input type="password" v-model="adminTecnico.password" placeholder="••••••••" required />
                    </div>
                </div>
            </div>

            <!-- Section 2: Tecnicos de Campo -->
            <div class="wizard-section">
                <div class="section-title">
                    <h2>2. Técnicos de Campo</h2>
                    <p class="subtitle">Agrega a los técnicos que realizarán los servicios en sitio. Puedes agregar más después desde el dashboard.</p>
                </div>

                <div class="technicians-list">
                    <div v-for="(tech, index) in tecnicos" :key="index" class="technician-row">
                        <div class="row-number">{{ index + 1 }}</div>
                        <div class="tech-inputs">
                            <input type="text" v-model="tech.nombre" placeholder="Nombre" />
                            <input type="text" v-model="tech.apellidos" placeholder="Apellidos" />
                            <input type="email" v-model="tech.correo" placeholder="Correo" />
                            <input type="text" v-model="tech.numeroEmpleado" placeholder="No. Empleado" />
                        </div>
                        <button class="btn-remove" @click="removeTecnico(index)" v-if="tecnicos.length > 1" title="Quitar técnico">
                            ✕
                        </button>
                    </div>
                </div>

                <button class="btn-add-tech" @click="addTecnico">
                    + Agregar otro técnico
                </button>
            </div>

            <!-- Footer Action -->
            <div class="wizard-footer">
                <button class="btn-complete" @click="completeOnboarding">
                    Completar Configuración y Entrar al Dashboard
                </button>
            </div>

        </div>
    </div>
</template>

<style scoped>
.onboarding-wizard {
    min-height: 100vh;
    width: 100vw;
    background-color: #f8fafc;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 3rem 1rem;
    box-sizing: border-box;
    overflow-y: auto;
}

.wizard-container {
    background: #ffffff;
    width: 100%;
    max-width: 800px;
    border-radius: 12px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    overflow: hidden;
}

.wizard-header {
    background: #0f172a;
    color: white;
    padding: 2.5rem 2rem;
    text-align: center;
}

.wizard-header h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2rem;
    font-weight: 700;
}

.wizard-header p {
    margin: 0;
    color: #94a3b8;
    font-size: 1.1rem;
}

.wizard-section {
    padding: 2rem;
    border-bottom: 1px solid #e2e8f0;
}

.section-title {
    margin-bottom: 1.5rem;
}

.section-title h2 {
    margin: 0 0 0.25rem 0;
    color: #1e293b;
    font-size: 1.5rem;
}

.section-title .subtitle {
    margin: 0;
    color: #64748b;
    font-size: 0.95rem;
    line-height: 1.5;
}

.form-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.25rem;
}

@media (min-width: 600px) {
    .form-grid {
        grid-template-columns: 1fr 1fr;
    }
}

.input-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.input-group label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #475569;
}

input {
    padding: 0.75rem 1rem;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 1rem;
    color: #334155;
    background: white;
    transition: all 0.2s;
}

input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.technicians-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1rem;
}

.technician-row {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
    background: #f1f5f9;
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
}

.row-number {
    background: #cbd5e1;
    color: #334155;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    font-weight: bold;
    flex-shrink: 0;
    margin-top: 0.5rem;
}

.tech-inputs {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
    flex-grow: 1;
}

@media (min-width: 600px) {
    .tech-inputs {
        grid-template-columns: 1fr 1fr;
    }
}

.btn-remove {
    background: #fee2e2;
    color: #ef4444;
    border: none;
    border-radius: 6px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-weight: bold;
    margin-top: 0.25rem;
    flex-shrink: 0;
    transition: background 0.2s;
}

.btn-remove:hover {
    background: #fecaca;
}

.btn-add-tech {
    background: transparent;
    color: #3b82f6;
    border: 1px dashed #3b82f6;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    width: 100%;
    transition: all 0.2s;
}

.btn-add-tech:hover {
    background: #eff6ff;
}

.wizard-footer {
    padding: 2rem;
    background: #f8fafc;
}

.btn-complete {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 1rem 2rem;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 600;
    width: 100%;
    cursor: pointer;
    transition: background 0.2s;
    box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
}

.btn-complete:hover {
    background: #2563eb;
}
</style>

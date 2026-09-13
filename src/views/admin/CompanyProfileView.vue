<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/authStore'
import { storeToRefs } from 'pinia'
import { apiFetch } from '../../api/apiClient'
import { 
    Building2, 
    User, 
    Mail, 
    UploadCloud, 
    Users, 
    Settings,
    Save,
    Send,
    CreditCard
} from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const { currentUser } = storeToRefs(authStore)

// 1. Security & Access Control: Roles 1 y 2 (Administradores)
if (!currentUser.value || (currentUser.value.rol !== 1 && currentUser.value.rol !== 2)) {
    router.push({ name: 'dashboard' })
}

// 2. Estado de la empresa desde MySQL
const company = ref<any>({
    idDependencia: currentUser.value?.idDependencia || 1,
    nombre: currentUser.value?.empresa?.nombre || 'Mi Empresa',
    rfc: currentUser.value?.empresa?.rfc || '',
    tipoLicencia: 'Prueba gratuita',
    fechaExpiracionLicencia: '',
    correoContacto: currentUser.value?.correo || '',
    correoReportes: '',
    telefono: '',
    datosFacturacion: '',
    activo: true,
    fechaRegistro: '',
    nivelUsuarios: 'Básico',
    limiteUsuarios: 5,
    logo: currentUser.value?.empresa?.logo || ''
})

const isLoadingCompany = ref(false)
const isSavingCompany = ref(false)
const isUploadingLogo = ref(false)
const logoInputRef = ref<HTMLInputElement | null>(null)

const fetchCompany = async () => {
    isLoadingCompany.value = true
    try {
        const res = await apiFetch('/empresa')
        if (res.data) {
            company.value = { ...company.value, ...res.data }
            if (currentUser.value && currentUser.value.empresa) {
                currentUser.value.empresa.logo = res.data.logo
                currentUser.value.empresa.nombre = res.data.nombre
            }
        }
    } catch (err) {
        console.error('Error al cargar datos de empresa:', err)
    } finally {
        isLoadingCompany.value = false
    }
}

const triggerLogoInput = () => {
    logoInputRef.value?.click()
}

const onLogoFileChange = async (event: Event) => {
    const input = event.target as HTMLInputElement
    if (!input.files || input.files.length === 0) return

    const file = input.files[0]
    if (file.size > 4 * 1024 * 1024) {
        alert('La imagen no debe superar los 4 MB.')
        input.value = ''
        return
    }

    isUploadingLogo.value = true
    try {
        const reader = new FileReader()
        reader.onload = async (e) => {
            const base64 = e.target?.result as string
            if (!base64) return

            // Vista previa inmediata
            company.value.logo = base64

            const res = await apiFetch('/empresa/logo', {
                method: 'POST',
                body: JSON.stringify({ logo: base64 })
            })

            if (res.data?.logo) {
                company.value.logo = res.data.logo
                if (currentUser.value && currentUser.value.empresa) {
                    currentUser.value.empresa.logo = res.data.logo
                }
                alert('¡Logotipo de la empresa actualizado con éxito! Ahora saldrá en el encabezado de todos los reportes de tu empresa.')
            }
        }
        reader.readAsDataURL(file)
    } catch (err: any) {
        console.error('Error al subir logotipo:', err)
        alert('Error: ' + (err.message || 'No se pudo subir el logotipo al servidor.'))
    } finally {
        isUploadingLogo.value = false
        input.value = ''
    }
}

const saveCompanyInfo = async () => {
    isSavingCompany.value = true
    try {
        const res = await apiFetch('/empresa', {
            method: 'PUT',
            body: JSON.stringify({
                nombre: company.value.nombre,
                correoContacto: company.value.correoContacto,
                correoReportes: company.value.correoReportes,
                telefono: company.value.telefono,
                datosFacturacion: company.value.datosFacturacion
            })
        })

        if (res.data) {
            company.value = { ...company.value, ...res.data }
            if (currentUser.value && currentUser.value.empresa) {
                currentUser.value.empresa.nombre = res.data.nombre
            }
            alert('¡Datos de la empresa actualizados exitosamente!')
        }
    } catch (err: any) {
        console.error('Error al actualizar datos de empresa:', err)
        alert('Error: ' + (err.message || 'No se pudo actualizar la información.'))
    } finally {
        isSavingCompany.value = false
    }
}

// Usuarios reales desde Laravel API
const localUsers = ref<any[]>([])
const isLoadingUsers = ref(true)
const isSavingUser = ref(false)

const fetchUsers = async () => {
    isLoadingUsers.value = true
    try {
        const res = await apiFetch('/usuarios')
        if (res.data) {
            localUsers.value = res.data
        }
    } catch (err: any) {
        console.error('Error al cargar usuarios:', err)
    } finally {
        isLoadingUsers.value = false
    }
}

onMounted(() => {
    fetchUsers()
    fetchCompany()
})

const teamMembers = computed(() => {
    return localUsers.value
})

const usedSeats = computed(() => {
    if (!company.value) return 0
    return localUsers.value.filter(u => u.estado === 1 && u.rol === 3).length
})

const seatsPercentage = computed(() => {
    if (!company.value || !company.value.limiteUsuarios) return 0
    return (usedSeats.value / company.value.limiteUsuarios) * 100
})

// Current user details to populate the admin field
const adminName = computed(() => {
    return currentUser.value ? `${currentUser.value.nombre} ${currentUser.value.apellidos}` : 'N/A'
})

// Helper to get role text
const getRoleText = (rol: number) => {
    switch(rol) {
        case 0: return 'Usuario Básico'
        case 1: return 'Administrador Técnico'
        case 2: return 'Administrador Comercial'
        case 3: return 'Técnico'
        default: return 'Desconocido'
    }
}

// SMTP Form State (mock)
const smtpConfig = ref({
    enabled: true,
    authRequired: true,
    host: 'smtp.office365.com',
    port: '587',
    security: 'STARTTLS',
    user: 'reportes@miempresa.com',
    password: 'password123',
    senderName: 'Notificaciones Sistema',
    replyTo: 'soporte@miempresa.com'
})

// UI State
const showPassword = ref(false)

// User Modal State
const isUserModalOpen = ref(false)
const isEditing = ref(false)
const userForm = ref({
    idUsuario: 0,
    nombre: '',
    apellidos: '',
    correo: '',
    numeroEmpleado: '',
    rol: 0,
    password: ''
})

const openModalForAdd = () => {
    userForm.value = {
        idUsuario: 0,
        nombre: '',
        apellidos: '',
        correo: '',
        numeroEmpleado: `EMP-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        rol: 0,
        password: ''
    }
    isEditing.value = false
    isUserModalOpen.value = true
}

const openModalForEdit = (user: any) => {
    userForm.value = {
        idUsuario: user.idUsuario,
        nombre: user.nombre,
        apellidos: user.apellidos,
        correo: user.correo,
        numeroEmpleado: user.numeroEmpleado,
        rol: user.rol,
        password: '' // Don't populate password
    }
    isEditing.value = true
    isUserModalOpen.value = true
}

const saveUser = async () => {
    if (isSavingUser.value) return
    isSavingUser.value = true

    try {
        if (isEditing.value) {
            const payload: any = {
                nombre: userForm.value.nombre,
                apellidos: userForm.value.apellidos,
                correo: userForm.value.correo,
                numeroEmpleado: userForm.value.numeroEmpleado,
                rol: Number(userForm.value.rol)
            }
            if (userForm.value.password) {
                payload.password = userForm.value.password
            }

            const res = await apiFetch(`/usuarios/${userForm.value.idUsuario}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            })

            if (res.data) {
                const index = localUsers.value.findIndex(u => u.idUsuario === userForm.value.idUsuario)
                if (index !== -1) {
                    localUsers.value[index] = res.data
                }
                alert('¡Usuario actualizado exitosamente en MySQL!')
                isUserModalOpen.value = false
            }
        } else {
            const res = await apiFetch('/usuarios', {
                method: 'POST',
                body: JSON.stringify({
                    nombre: userForm.value.nombre,
                    apellidos: userForm.value.apellidos,
                    correo: userForm.value.correo,
                    password: userForm.value.password,
                    rol: Number(userForm.value.rol),
                    numeroEmpleado: userForm.value.numeroEmpleado
                })
            })

            if (res.data) {
                localUsers.value.push(res.data)
                alert(`¡Usuario ${res.data.nombre} (${getRoleText(res.data.rol)}) registrado exitosamente en MySQL!`)
                isUserModalOpen.value = false
            }
        }
    } catch (err: any) {
        console.error('Error al guardar usuario:', err)
        alert('Error: ' + (err.message || 'No se pudo guardar el usuario en el servidor.'))
    } finally {
        isSavingUser.value = false
    }
}

</script>

<template>
    <div class="page-container-company">
        <!-- Main Header -->
        <div class="page-header">
            <div>
                <h2>Perfil de Empresa</h2>
                <p class="text-slate-500 mt-1">Configuración comercial y administración de usuarios</p>
            </div>
        </div>

        <div v-if="company" class="dashboard-grid">
            <!-- SECTION A: Datos de empresa -->
            <section class="settings-section">
                <div class="section-header flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <Building2 class="text-blue-600" :size="20"/>
                        <h3>Datos de la Empresa</h3>
                    </div>
                    <button @click="saveCompanyInfo" :disabled="isSavingCompany" class="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3">
                        <Save :size="14"/>
                        <span>{{ isSavingCompany ? 'Guardando...' : 'Guardar Información' }}</span>
                    </button>
                </div>
                
                <div class="section-body card">
                    <div class="form-grid-company">
                        <!-- Left Side: Inputs -->
                        <div class="inputs-area">
                            <div class="form-group">
                                <label>Nombre de la Empresa</label>
                                <div class="input-with-icon">
                                    <Building2 :size="16" class="icon-input" />
                                    <input type="text" v-model="company.nombre" class="editable-input" />
                                </div>
                            </div>

                            <div class="form-group">
                                <label>RFC</label>
                                <input type="text" :value="company.rfc" readonly class="readonly-input font-mono" />
                            </div>

                            <div class="form-group">
                                <label>Administrador</label>
                                <div class="input-with-icon">
                                    <User :size="16" class="icon-input" />
                                    <input type="text" :value="adminName" readonly class="readonly-input" />
                                </div>
                            </div>

                            <div class="form-group">
                                <label>Correo de Contacto</label>
                                <div class="input-with-icon">
                                    <Mail :size="16" class="icon-input" />
                                    <input type="email" v-model="company.correoContacto" class="editable-input" />
                                </div>
                            </div>

                            <div class="form-group">
                                <label>Teléfono</label>
                                <input type="text" v-model="company.telefono" class="editable-input" placeholder="Ej. 442-123-4567" />
                            </div>
                        </div>

                        <!-- Right Side: Logo Upload -->
                        <div class="logo-area">
                            <label class="block mb-2 font-medium text-slate-700 text-sm">Logotipo de la empresa (Para reportes impresos y PDF)</label>
                            <input 
                                type="file" 
                                ref="logoInputRef" 
                                accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml" 
                                class="hidden" 
                                @change="onLogoFileChange" 
                            />
                            
                            <div v-if="company.logo" class="border-2 border-dashed border-slate-300 rounded-xl p-4 bg-slate-50 flex flex-col items-center justify-center relative group min-h-[160px]">
                                <img :src="company.logo" alt="Logo empresa" class="max-h-24 max-w-full object-contain mb-3 rounded shadow-sm bg-white p-2 border border-slate-200" />
                                <div class="flex items-center gap-3">
                                    <button 
                                        @click="triggerLogoInput" 
                                        :disabled="isUploadingLogo" 
                                        class="btn-outline text-xs flex items-center gap-1 py-1.5 px-3 bg-white hover:bg-blue-50 hover:border-blue-300"
                                    >
                                        <UploadCloud :size="14" class="text-blue-600"/>
                                        <span>{{ isUploadingLogo ? 'Subiendo...' : 'Cambiar Logotipo' }}</span>
                                    </button>
                                </div>
                                <span class="text-xs text-slate-400 mt-2">Este logo aparecerá en el encabezado de tus reportes</span>
                            </div>

                            <div v-else @click="triggerLogoInput" class="upload-box border-dashed cursor-pointer hover:bg-blue-50/50 hover:border-blue-400 transition-all min-h-[160px] flex flex-col items-center justify-center">
                                <UploadCloud :size="32" class="text-slate-400 mb-2"/>
                                <span class="text-sm text-blue-600 font-semibold py-1">
                                    {{ isUploadingLogo ? 'Subiendo imagen...' : 'Haz clic para subir logotipo' }}
                                </span>
                                <span class="text-xs text-slate-500 mt-1">o arrastra tu archivo PNG, JPG o SVG</span>
                                <span class="text-xs text-slate-400 mt-2">Máximo 4MB (Recomendado fondo transparente)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- SECTION B: Suscripción y Facturación -->
            <section class="settings-section">
                <div class="section-header">
                    <CreditCard class="text-purple-600" :size="20"/>
                    <h3>Suscripción y Facturación</h3>
                </div>
                
                <div class="section-body card flex flex-col gap-6">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div>
                            <p class="text-sm font-semibold text-slate-500 mb-1">Plan Actual</p>
                            <div class="flex items-center gap-2">
                                <span class="text-lg font-bold text-slate-800">{{ company.tipoLicencia }}</span>
                                <span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Expira: {{ company.fechaExpiracionLicencia }}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div class="flex justify-between items-end mb-2">
                            <p class="text-sm font-semibold text-slate-700">
                                Uso de Licencias (Seats): <span class="font-normal text-slate-500">Usuarios Asignados: {{ usedSeats }} de {{ company.limiteUsuarios }} (Plan {{ company.nivelUsuarios }})</span>
                            </p>
                            <span class="text-xs font-bold" :class="seatsPercentage >= 100 ? 'text-red-500' : 'text-blue-600'">{{ Math.round(seatsPercentage) }}%</span>
                        </div>
                        
                        <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                            <div class="h-2.5 rounded-full transition-all duration-500"
                                :class="seatsPercentage >= 100 ? 'bg-red-500' : 'bg-blue-600'"
                                :style="{ width: `${Math.min(seatsPercentage, 100)}%` }">
                            </div>
                        </div>
                    </div>

                    <div class="pt-2">
                        <button v-if="usedSeats < company.limiteUsuarios" @click="openModalForAdd" class="btn-primary flex items-center gap-2">
                            <User :size="16"/>
                            + Añadir Nuevo Usuario
                        </button>
                        <div v-else class="flex flex-col gap-3">
                            <button class="btn-primary flex items-center gap-2 opacity-50 cursor-not-allowed w-max" disabled>
                                <User :size="16"/>
                                + Añadir Nuevo Usuario
                            </button>
                            <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
                                <div class="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 text-amber-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                                </div>
                                <button class="text-amber-800 font-bold text-sm text-left hover:underline">
                                    Límite alcanzado. Actualizar al Plan Intermedio (hasta 20 usuarios)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- SECTION C: Usuarios (Team Grid) -->
            <section class="settings-section">
                <div class="section-header">
                    <Users class="text-indigo-600" :size="20"/>
                    <h3>Usuarios Asignados</h3>
                </div>
                
                <div class="section-body">
                    <div class="users-grid">
                        <div v-for="user in teamMembers" :key="user.idUsuario" class="user-card card relative group">
                            <button v-if="currentUser?.rol === 2" @click="openModalForEdit(user)" class="absolute top-3 right-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-blue-600">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                            </button>
                            <div class="user-avatar">
                                {{ user.nombre.charAt(0) }}{{ user.apellidos.charAt(0) }}
                            </div>
                            <div class="user-info">
                                <h4>{{ user.nombre }} {{ user.apellidos }}</h4>
                                <div class="user-meta mt-1">
                                    <span class="user-badge">{{ getRoleText(user.rol) }}</span>
                                    <span class="text-xs text-slate-500 block mt-1">ID: {{ user.numeroEmpleado }}</span>
                                    <div class="text-sm text-slate-600 mt-2 flex items-center gap-1">
                                        <Mail :size="12" class="text-slate-400"/>
                                        <span class="truncate">{{ user.correo }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- SECTION D: Configuración SMTP -->
            <section class="settings-section">
                <div class="section-header">
                    <Settings class="text-emerald-600" :size="20"/>
                    <h3>Configuración SMTP (Envío de reportes)</h3>
                </div>
                
                <div class="section-body card">
                    <div class="form-block">
                        <div class="checkbox-row mb-6 pb-4 border-b border-slate-100 flex gap-6">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" v-model="smtpConfig.enabled" class="rounded text-blue-600 focus:ring-blue-500"/>
                                <span class="text-sm font-medium text-slate-700">Habilitar SMTP</span>
                            </label>
                            
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" v-model="smtpConfig.authRequired" :disabled="!smtpConfig.enabled" class="rounded text-blue-600 focus:ring-blue-500"/>
                                <span class="text-sm font-medium text-slate-700" :class="{'opacity-50': !smtpConfig.enabled}">Requiere autenticación</span>
                            </label>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-5 transition-opacity" :class="{'opacity-50 pointer-events-none': !smtpConfig.enabled}">
                            <div class="form-group">
                                <label>Servidor SMTP (Host)</label>
                                <input type="text" v-model="smtpConfig.host" class="editable-input w-full" placeholder="ej. smtp.tudominio.com"/>
                            </div>
                            
                            <div class="form-group">
                                <label>Puerto</label>
                                <input type="text" v-model="smtpConfig.port" class="editable-input w-full" placeholder="ej. 587"/>
                            </div>
                            
                            <div class="form-group">
                                <label>Seguridad</label>
                                <select v-model="smtpConfig.security" class="editable-input w-full">
                                    <option value="NONE">Ninguna</option>
                                    <option value="STARTTLS">STARTTLS</option>
                                    <option value="SSL/TLS">SSL/TLS</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label>Usuario SMTP</label>
                                <input type="text" v-model="smtpConfig.user" class="editable-input w-full" :disabled="!smtpConfig.authRequired"/>
                            </div>
                            
                            <div class="form-group relative">
                                <label>Contraseña SMTP</label>
                                <div class="relative">
                                    <input :type="showPassword ? 'text' : 'password'" v-model="smtpConfig.password" class="editable-input w-full" :disabled="!smtpConfig.authRequired"/>
                                    <button @click="showPassword = !showPassword" type="button" class="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                                        <!-- Eye Icon placeholder -->
                                        <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
                                        <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5 transition-opacity" :class="{'opacity-50 pointer-events-none': !smtpConfig.enabled}">
                            <div class="form-group">
                                <label>Nombre del Remitente</label>
                                <input type="text" v-model="smtpConfig.senderName" class="editable-input w-full" placeholder="Nombre que verán los clientes"/>
                            </div>
                            
                            <div class="form-group">
                                <label>Responder a (Reply-To)</label>
                                <input type="text" v-model="smtpConfig.replyTo" class="editable-input w-full" placeholder="Correo para recibir respuestas"/>
                            </div>
                        </div>
                    </div>

                    <!-- Footer Actions -->
                    <div class="smtp-actions mt-8 pt-5 border-t border-slate-100 flex flex-wrap gap-3 items-center justify-end">

                        <button class="btn-outline flex items-center gap-2">
                            <Send :size="16"/>
                            Probar envío de correo
                        </button>
                        <button class="btn-primary flex items-center gap-2">
                            <Save :size="16"/>
                            Guardar Configuración
                        </button>
                    </div>
                </div>
            </section>
        </div>
        
        <div v-else class="empty-state">
            <p>No se encontraron datos de la empresa. Por favor, contacte a soporte.</p>
        </div>

        <!-- User Form Modal -->
        <Teleport to="body">
            <div v-if="isUserModalOpen" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                    <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 class="text-lg font-bold text-slate-800">{{ isEditing ? 'Editar Usuario' : 'Añadir Nuevo Usuario' }}</h3>
                        <button @click="isUserModalOpen = false" class="text-slate-400 hover:text-slate-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                    </div>
                    
                    <div class="p-6 overflow-y-auto form-modal-content">
                        <div class="grid grid-cols-2 gap-4 mb-4">
                            <div class="form-group mb-0">
                                <label>Nombre</label>
                                <input type="text" v-model="userForm.nombre" class="editable-input" placeholder="Nombre" />
                            </div>
                            <div class="form-group mb-0">
                                <label>Apellidos</label>
                                <input type="text" v-model="userForm.apellidos" class="editable-input" placeholder="Apellidos" />
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Correo Electrónico</label>
                            <input type="email" v-model="userForm.correo" class="editable-input" placeholder="ejemplo@empresa.com" />
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4 mb-4">
                            <div class="form-group mb-0">
                                <label>Número de Empleado</label>
                                <input type="text" v-model="userForm.numeroEmpleado" class="editable-input" placeholder="EMP-000" />
                            </div>
                            <div class="form-group mb-0">
                                <label>Rol</label>
                                <select v-model="userForm.rol" class="editable-input">
                                    <option :value="0">Usuario Básico</option>
                                    <option :value="1">Admin Técnico</option>
                                    <option :value="2">Admin Comercial</option>
                                    <option :value="3">Técnico</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Contraseña</label>
                            <input type="password" v-model="userForm.password" class="editable-input" placeholder="••••••••" />
                            <p v-if="isEditing" class="text-xs text-slate-500 mt-1">Dejar en blanco para mantener la contraseña actual.</p>
                        </div>
                    </div>
                    
                    <div class="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                        <button @click="isUserModalOpen = false" class="btn-outline">Cancelar</button>
                        <button @click="saveUser" class="btn-primary">Guardar Usuario</button>
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

.page-header {
    margin-bottom: 2rem;
}
.page-header h2 {
    color: #0f172a;
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0;
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

.input-with-icon {
    position: relative;
    display: flex;
    align-items: center;
}
.icon-input {
    position: absolute;
    left: 1rem;
    color: #94a3b8;
}

.readonly-input, .editable-input {
    width: 100%;
    padding: 0.65rem 1rem;
    border-radius: 6px;
    font-size: 0.95rem;
    outline: none;
    transition: all 0.2s;
}

.readonly-input {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    color: #475569;
    padding-left: 2.5rem;
    cursor: default;
}

.editable-input {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    color: #0f172a;
}
.input-with-icon .editable-input {
    padding-left: 2.5rem;
}

.editable-input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* SECTION A: Company Layout */
.form-grid-company {
    display: grid;
    grid-template-columns: 3fr 2fr;
    gap: 2.5rem;
}
.inputs-area {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.upload-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 180px;
    border: 2px dashed #cbd5e1;
    border-radius: 8px;
    background: #f8fafc;
    transition: all 0.2s;
}
.upload-box:hover {
    border-color: #3b82f6;
    background: #f0f9ff;
}

/* SECTION B: Users Grid */
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
    font-weight: 700;
    letter-spacing: 0.5px;
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

.empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: #64748b;
    background: white;
    border-radius: 12px;
    border: 1px dashed #cbd5e1;
}

@media (max-width: 768px) {
    .form-grid-company {
        grid-template-columns: 1fr;
    }
}
</style>

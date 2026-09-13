<script setup lang = "ts">

    import { computed } from 'vue'
    import { Bell, Menu } from 'lucide-vue-next'
    import { useAuthStore } from '../../stores/authStore'
    import { storeToRefs } from 'pinia'
    import { getDependenciaName } from '../../data/mockDependencias'

    const emit = defineEmits(['toggle-sidebar'])

    const authStore = useAuthStore()
    const { currentUser } = storeToRefs(authStore)

    const enterpriseName = computed(() => {
        return currentUser.value?.empresa?.nombre 
            || (currentUser.value ? getDependenciaName(currentUser.value.idDependencia) : 'Sin Empresa')
    })

    // Returns the first letter of the user's name and last name to be shown in the avatar
    const initialName = computed(() => {
        const nombre = currentUser.value?.nombre;
        return nombre ? nombre.charAt(0).toUpperCase() : '';
    });
    const initialLastName = computed(() => {
        const apellidos = currentUser.value?.apellidos;
        return apellidos ? apellidos.charAt(0).toUpperCase() : '';
    });

    // Shows role as a label in header
    const roleLabel = computed(() => {
        if (!currentUser.value) return 'Desconocido'
        if (currentUser.value.rol === 0) return 'Default'
        else if (currentUser.value.rol === 1) return 'Administrador Técnico'
        else if (currentUser.value.rol === 2) return 'Administrador Comercial'
        else if (currentUser.value.rol === 3) return 'Técnico'
        else return 'Desconocido'
    });

    //{{ initialName }}{{ initialLastName }}
</script>

<!------------------------------------------------------------------------------------------------------------------>

<template>
    <div class = "page-container-app-header">
    <header class = "app-header">
        <div class = "header-left">
            <!-- Hamburger menu for mobile -->
            <button class="hamburger-btn" @click="$emit('toggle-sidebar')">
                <Menu :size="24" />
            </button>
            <div class = "title-header">
                Plataforma Integral de Servicios e Incidencias
            </div>
            <div class = "enterprise-header">
                {{ enterpriseName }}
            </div>
        </div>
        <!--Search bar-->

        <!-- Right Header -->
        <div class = "header-right">

            <!--Icon-->
            <div class = "icon-btn">
                <Bell :size = "20" />
                <span class = "badge">3</span>
            </div>

            <!--User Profile-->

            <div class = "user-profile">
                <div class = "avatar">{{ initialName }}{{ initialLastName }}</div>
                <div class = "user-info">
                    <span class = "name">{{ currentUser?.nombre }} {{ currentUser?.apellidos }}</span>
                    <span class = "role">{{ roleLabel }}</span>
                </div>
            </div>
        </div>
           
    </header>
    </div>
</template>

<!------------------------------------------------------------------------------------------------------------------>

<style scoped lang="scss">
    .app-header {
        height: 70px;
        background-color: white;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 2rem;
        position: sticky;
        top: 0;
        z-index: 50;
        gap: 2rem;
    }
 
    .header-left {
        display: flex;
        align-items: center;
        overflow: hidden;
    }

    .hamburger-btn {
        display: none;
        background: none;
        border: none;
        cursor: pointer;
        color: #1e293b;
        padding: 0;
        margin-right: 1rem;
    }

    @media (max-width: 768px) {
        .hamburger-btn {
            display: flex;
            align-items: center;
            flex-shrink: 0;
        }

        .enterprise-header,
        .title-header {
            display: none; // Hide on mobile to save space
        }
        
        .user-info {
            display: none; // Hide name/role text, show only avatar
        }

        .user-profile {
            padding-left: 0.5rem;
            border-left: none;
        }

        .header-right {
            gap: 0.75rem;
        }

        .app-header {
            padding: 0 1rem;
            gap: 0.5rem;
        }
    }

    .header-right {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        flex-shrink: 0;
        position: relative;
        z-index: 20;
    }

    .title-header{
        font-size: 1.1rem;
        font-weight: 600;
        color:#1e293b;
        letter-spacing: 0.04em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-right: 1rem;
    }

    .enterprise-header {
        font-size: 0.9rem;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex-shrink: 0;
    }

    .icon-btn {
        background: none;
        border: none;
        position: relative;
        cursor: pointer;
        color: #64748b;
        padding: 5px;
        display: flex;
        align-items: center;
        justify-content: center;
  
        &:hover {
            color: #3b82f6;
        }
  
        .badge {
            position: absolute;
            top: 0;
            right: 0;
            background-color: #ef4444;
            color: white;
            font-size: 0.65rem;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            border: 2px solid white;
        }
    }

    .user-profile {
        display: flex;
        align-items: center;
        gap: 12px;
        padding-left: 1.5rem;
        border-left: 1px solid #e2e8f0;
  
        .avatar {
            width: 36px;
            height: 36px;
            background-color: #1e293b;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 0.9rem;
        }
  
        .user-info {
            display: flex;
            flex-direction: column;
    
            .name {
                font-size: 0.85rem;
                font-weight: 600;
                color: #1e293b;
                white-space: nowrap;
            }
    
            .role {
                font-size: 0.75rem;
                color: #64748b;
            }
        }
    }
</style>
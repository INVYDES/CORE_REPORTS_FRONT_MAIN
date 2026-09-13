<script setup lang="ts">
    import { computed } from 'vue'
    import { useRoute, useRouter } from 'vue-router'
    import { useAuthStore } from '../../stores/authStore'
    import { storeToRefs } from 'pinia'
    import {
        LayoutDashboard,
        Ticket,
        FileText,
        CalendarClock,
        CalendarPlus,
        BarChart3,
        Building2,
        Network,
        LogOut,
        TicketPlus,
        FilePlus2,
        CalendarDays
    } from 'lucide-vue-next'
    
    // Store initialization
    const authStore = useAuthStore()
    const { currentUser } = storeToRefs(authStore)

    const router = useRouter()
    const route = useRoute()

    const handleLogout = async () => {
        await authStore.logout()
        router.push({ name: 'login' })
    }

    const buildTime = __BUILD_TIME__

    
    // Props
    const props = defineProps<{
        isOpen: boolean
    }>()
    
    // Emits
    const emit = defineEmits(['close'])
    
    // Menu Items
    const menuItems = computed(() => {
        const items = [

            // General overview (For Everyone)
            {
                label: 'Vista general',
                path: 'dashboard',
                icon: LayoutDashboard,
                roles: [1, 2, 3] // Admin Tec, Admin Com, Tech
            },

            // History (Calendar) view
            {
                label: 'Historial',
                path: 'history',
                icon: CalendarDays,
                roles: [1, 2, 3]
            },

            // ------------------------- REPORTES ---------------------------------
            // Reports
            {
                label: 'Reportes',
                path: 'reports',
                icon: FileText,
                roles: [1, 2, 3] 
            },
            // New Report
            {
                label: 'Nuevo Reporte',
                path: 'reports-new',
                icon: FilePlus2,
                roles: [1, 2, 3] 
            },

            // ------------------------- TICKETS ---------------------------------

            // Tickets
            {
                label: 'Tickets',
                path: 'tickets',
                icon: Ticket,
                roles: [1, 2, 3]
            },
            
            {
                label: 'Nuevo Ticket',
                path: 'create-ticket',
                icon: TicketPlus,
                roles: [0, 1, 2, 3],
                target: '_blank'
            },

            // ------------------ SERVICIOS PROGRAMADOS -----------------------
            // Scheduled (Servicios Programados)
            {
                label: 'Servicios Programados',
                path: 'schedule-list',
                icon: CalendarClock,
                roles: [1, 2, 3]
            },

            // Scheduling
            {
                label: 'Programar Nuevo Servicio',
                path: 'schedule-manager',
                icon: CalendarPlus,
                roles: [1, 2] 
            },


            // ----------------------- MÉTRICAS Y PERFIL DE LA EMPRESA -----------------------------
            // Analysis
            {
                label: 'Análisis',
                path: 'analysis',
                icon: BarChart3,
                roles: [1, 2] // Both Admins
            },
            // Subareas Management
            {
                label: 'Gestión de Subdependencias/Áreas',
                path: 'subareas-manager',
                icon: Network,
                roles: [1, 2] // Both Admins
            },
            // Profile
            {
                label: 'Perfil de Empresa',
                path: 'company-profile',
                icon: Building2,
                roles: [1, 2] // Admins
            },
        ]
        
        // 3. Filter using the numeric role from our active session
        return items.filter(item => currentUser.value && item.roles.includes(currentUser.value.rol))
    })
</script>

<!------------------------------------------------------------------------------------------------------------------>

<template>
    <div class="page-container-app-sidebar">
    <aside class="sidebar" :class="{ 'sidebar-open': isOpen }">

        <!-- Cabecera de la barra lateral-->
        <div class = "sidebar-header">
            <div class = "logo-text">coreReports</div>
        </div>

        <nav class = "sidebar-nav">

            <!--Router links-->
            <router-link
                v-for="item in menuItems"
                :key= "item.path"
                :to = "{ name: item.path }"
                :target="item.target"
                class = "nav-item"
                :class = "{ 'active' : route.name === item.path }"
            >
                <!-- Item icons-->
                <component 
                    :is = "item.icon"
                    :size = "20"
                />
                <span>{{ item.label }}</span>            
            </router-link>
        </nav>

        <!-- Sidebar Footer-->
        <div class = "sidebar-footer">


            <button @click="handleLogout" class = "logout-btn">
                <LogOut :size = "18" />
                <span>Sign Out</span>
            </button>
            <div class="build-time">
                Built: {{ buildTime }}
            </div>
        </div>
    </aside>
    </div>
</template>


<!------------------------------------------------------------------------------------------------------------------>

<style scoped lang="scss">
    $dark-bg: #0f172a;
    $darker-bg: #020617;
    $primary-blue: #3b82f6;
    $text-color: #cbd5e1;

    .sidebar {
        width: 260px;
        height: 100vh;
        background-color: $dark-bg;
        color: $text-color;
        display: flex;
        flex-direction: column;
        border-right: 1px solid rgba(255,255,255,0.05);
        transition: transform 0.3s ease, width 0.3s ease;
        flex-shrink: 0;
    }

    @media (max-width: 768px) {
        .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            z-index: 40;
            transform: translateX(-100%);
            
            &.sidebar-open {
                transform: translateX(0);
            }
        }
    }

    .sidebar-header {
        height: 70px;
        display: flex;
        align-items: center;
        padding: 0 1.5rem;
        border-bottom: 1px solid rgba(255,255,255,0.05);

    .logo-text {
        font-size: 1.1rem;
        font-weight: 700;
        color: white;
        letter-spacing: -0.5px;
    }
    }

    .sidebar-nav {
        flex: 1;
        padding: 1.5rem 1rem;
        overflow-y: auto;
  
  .nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    margin-bottom: 4px;
    color: $text-color;
    text-decoration: none;
    border-radius: 8px;
    transition: all 0.2s;
    font-size: 0.95rem;
    font-weight: 500;

    &:hover {
      background-color: rgba(255,255,255,0.05);
      color: white;
    }

    &.active {
      background: linear-gradient(90deg, rgba($primary-blue, 0.15), transparent);
      color: $primary-blue;
      border-left: 3px solid $primary-blue;
    }
  }
    }

    .sidebar-footer {
        padding: 1.5rem;
        border-top: 1px solid rgba(255,255,255,0.05);
  
    .logout-btn {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 10px;
        background: transparent;
        border: 1px solid rgba(255,255,255,0.1);
        color: $text-color;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
    
        &:hover {    
        background-color: rgba(239, 68, 68, 0.1); // Red tint
        color: #ef4444; // Red text
        border-color: rgba(239, 68, 68, 0.2);
        }
    }

    .build-time {
        margin-top: 1rem;
        font-size: 0.7rem;
        color: rgba($text-color, 0.4);
        text-align: center;
        font-family: monospace;
    }

}

</style>
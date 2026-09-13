import { createRouter, createWebHistory } from 'vue-router'

import AuthLayout from '../layouts/AuthLayout.vue'
import AppLayout from '../layouts/AppLayout.vue'
import { useAuthStore } from '../stores/authStore'

const router = createRouter
    (
        {
            history: createWebHistory(import.meta.env.BASE_URL),
            routes:
                [
                    // Auth Layout
                    {
                        path: '/',
                        component: AuthLayout,
                        children:
                            [
                                // Login
                                {
                                    path: '', //root of AuthLayout OK
                                    name: 'login',
                                    component: () => import('../views/auth/LoginView.vue')
                                },

                                // Register OK
                                {
                                    path: 'register',
                                    name: 'register',
                                    component: () => import('../views/auth/RegisterView.vue')
                                },

                                // Onboarding Wizard (First Steps)
                                {
                                    path: 'onboarding',
                                    name: 'onboarding',
                                    component: () => import('../views/auth/OnboardingWizardView.vue')
                                }
                            ]
                    },

                    // Creador de Tickets OK
                    {
                        path: '/new-ticket',
                        name: 'create-ticket',
                        component: () => import('../views/admin/tickets/TicketCreateView.vue')
                    },

                    //App Layout
                    {
                        path: '/app',
                        component: AppLayout,
                        children:
                            [
                                //Dashboard OK
                                {
                                    path: 'dashboard',
                                    name: 'dashboard',
                                    component: () => import('../views/admin/DashboardView.vue')
                                },

                                // History (Calendar) View
                                {
                                    path: 'history',
                                    name: 'history',
                                    component: () => import('../views/admin/HistoryView.vue')
                                },


                                // ---------------------------------------------------------------------------
                                // Crear reportes OK — Roles 1, 2 y 3
                                {
                                    path: 'reports/new',
                                    name: 'reports-new',
                                    component: () => import('../views/admin/reports/ReportCreateView.vue'),
                                    meta: { allowedRoles: [1, 2, 3] }
                                },

                                // Vista de lista de reportes OK — Roles 1, 2 y 3
                                {
                                    path: 'reports/list',
                                    name: 'reports',
                                    component: () => import('../views/admin/reports/ReportListView.vue'),
                                    meta: { allowedRoles: [1, 2, 3] }
                                },

                                // Detalle de reportes — Roles 1, 2 y 3
                                {
                                    path: 'reports/:id',
                                    name: 'report-detail',
                                    component: () => import('../views/admin/reports/ReportDetailView.vue'),
                                    meta: { allowedRoles: [1, 2, 3] }
                                },

                                // Editar reporte técnico completo — Roles 1, 2 y 3
                                {
                                    path: 'reports/edit/:id',
                                    name: 'report-edit',
                                    component: () => import('../views/admin/reports/ReportCreateView.vue'),
                                    meta: { allowedRoles: [1, 2, 3] }
                                },

                                // -------------------------------------------------------------------------

                                // Lista de tickets (Vista general) OK
                                {
                                    path: 'tickets',
                                    name: 'tickets',
                                    component: () => import('../views/admin/tickets/TicketListView.vue')
                                },

                                // Detalle de tickets OK
                                {
                                    path: 'tickets/:id',
                                    name: 'ticket-detail',
                                    component: () => import('../views/admin/tickets/TicketDetailedView.vue')
                                },

                                // -------------------------------------------------------------------------

                                // Asignación de servicios programados OK
                                {
                                    path: 'schedule/manager',
                                    name: 'schedule-manager',
                                    component: () => import('../views/admin/services/ServiceCreateView.vue')
                                },

                                // Lista de servicios programados (Vista general) OK
                                {
                                    path: 'schedule/list',
                                    name: 'schedule-list',
                                    component: () => import('../views/admin/services/ServiceListView.vue')
                                },

                                // Detalle de servicios OK
                                {
                                    path: 'services/:id',
                                    name: 'service-detail',
                                    component: () => import('../views/admin/services/ServiceDetailedView.vue')
                                },

                                // -------------------------------------------------------------------------

                                // Métricas y análisis
                                {
                                    path: 'analysis',
                                    name: 'analysis',
                                    component: () => import('../views/admin/AnalysisView.vue')
                                },

                                // Perfil
                                {
                                    path: 'company-profile',
                                    name: 'company-profile',
                                    component: () => import('../views/admin/CompanyProfileView.vue'),
                                    meta: { allowedRoles: [1, 2] }
                                },

                                // Gestión de Subdependencias/Áreas
                                {
                                    path: 'subareas',
                                    name: 'subareas-manager',
                                    component: () => import('../views/admin/company/SubareaManagerView.vue'),
                                    meta: { allowedRoles: [1, 2] } // Tech Admin & Commer Admin only
                                },

                                // Encuesta al Cliente / Evaluación de Servicio
                                {
                                    path: 'evaluacion-servicio/:id',
                                    name: 'report-survey',
                                    component: () => import('../views/admin/reports/ReportSurveyView.vue'),
                                    meta: { allowedRoles: [1, 2, 3] }
                                }
                            ]
                    }


                ]
        })

// ── Global Navigation Guard: Role-based access control ──
router.beforeEach((to, _from, next) => {
    const authStore = useAuthStore()

    // 1. Proteger rutas de la aplicación: si no hay sesión, ir al login
    if (to.path.startsWith('/app') && !authStore.isAuthenticated) {
        return next({ name: 'login' })
    }

    // 2. Si ya está logueado y va al login, enviarlo directo al dashboard
    if (to.name === 'login' && authStore.isAuthenticated) {
        return next({ name: 'dashboard' })
    }

    // 3. Control de acceso por roles
    const allowedRoles = to.meta.allowedRoles as number[] | undefined

    if (allowedRoles && allowedRoles.length > 0) {
        const userRole = authStore.currentUser?.rol

        if (userRole === undefined || !allowedRoles.includes(userRole)) {
            return next({ name: 'dashboard' })
        }
    }

    next()
})

export default router
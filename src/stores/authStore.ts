import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { mockUsers } from '../data/mockUsers';
import type { Usuario } from '../data/mockUsers';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export const useAuthStore = defineStore('auth', () => {
    // 1. Token de Sanctum
    const token = ref<string | null>(localStorage.getItem('auth_token'));

    // 2. Usuario cargado desde localStorage si existe
    const savedUserJson = localStorage.getItem('auth_user');
    let parsedUser: Usuario | null = null;
    if (savedUserJson) {
        try {
            parsedUser = JSON.parse(savedUserJson);
        } catch (e) {
            console.error('Error al parsear auth_user de localStorage', e);
        }
    }

    const currentUser = ref<Usuario | null>(parsedUser);

    // Computed para saber si hay sesión activa
    const isAuthenticated = computed(() => !!token.value && !!currentUser.value);

    /**
     * Iniciar sesión contra el backend de Laravel (POST /api/login)
     */
    const login = async (correo: string, password: string): Promise<{ success: boolean; message: string }> => {
        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ correo, password })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                return {
                    success: false,
                    message: data.message || 'Credenciales inválidas. Verifica tu correo y contraseña.'
                };
            }

            // 1. Guardar token
            const authToken = data.data.token;
            token.value = authToken;
            localStorage.setItem('auth_token', authToken);

            // 2. Guardar datos del usuario
            const backendUser = data.data.usuario;
            const mappedUser: Usuario = {
                idUsuario: backendUser.idUsuario,
                idDependencia: backendUser.idDependencia,
                numeroEmpleado: backendUser.numeroEmpleado || 'EMP-001',
                rol: backendUser.rol,
                nombre: backendUser.nombre,
                apellidos: backendUser.apellidos || '',
                correo: backendUser.correo,
                estado: 1,
                fechaCreacion: new Date().toISOString().split('T')[0],
                ultimoAcceso: new Date().toISOString(),
                empresa: backendUser.empresa
            };

            currentUser.value = mappedUser;
            localStorage.setItem('auth_user', JSON.stringify(mappedUser));

            return {
                success: true,
                message: data.message || 'Inicio de sesión exitoso.'
            };
        } catch (error) {
            console.error('Error al conectar con Laravel:', error);
            return {
                success: false,
                message: 'No se pudo conectar con el servidor backend (http://127.0.0.1:8000). Asegúrate de tener corriendo "php artisan serve".'
            };
        }
    };

    /**
     * Cerrar sesión en el backend (POST /api/logout) y limpiar almacenamiento local
     */
    const logout = async () => {
        if (token.value) {
            try {
                await fetch(`${API_BASE_URL}/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token.value}`,
                        'Accept': 'application/json'
                    }
                });
            } catch (error) {
                console.warn('Error al notificar logout al backend:', error);
            }
        }

        token.value = null;
        currentUser.value = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
    };

    /**
     * Selector temporal de desarrollo
     */
    const changeUser = (idUsuario: number) => {
        const user = mockUsers.find(u => u.idUsuario === idUsuario);
        if (user) {
            currentUser.value = user;
            localStorage.setItem('auth_user', JSON.stringify(user));
        }
    };

    return {
        token,
        currentUser,
        isAuthenticated,
        login,
        logout,
        changeUser
    };
});

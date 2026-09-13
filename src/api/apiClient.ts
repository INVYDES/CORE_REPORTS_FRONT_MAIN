/**
 * Cliente HTTP centralizado para comunicación Frontend (Vue 3) -> Backend (Laravel API)
 * Incluye automáticamente la URL base y el Bearer Token de Sanctum.
 */

const BASE_URL = 'http://127.0.0.1:8000/api';

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    errors?: Record<string, string[]>;
}

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = localStorage.getItem('auth_token');

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers as Record<string, string> || {})
    };

    // Si el usuario ya inició sesión, adjuntamos automáticamente su Bearer Token
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Error en la petición al servidor');
    }

    return data;
}

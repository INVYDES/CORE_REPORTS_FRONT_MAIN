export interface Usuario {
    idUsuario: number;
    idDependencia: number;
    numeroEmpleado: string;
    rol: number;
    nombre: string;
    apellidos: string;
    correo: string;
    password?: string;
    estado: number;
    fechaCreacion: string;
    ultimoAcceso: string;
    empresa?: {
        idDependencia: number;
        nombre: string;
        rfc?: string;
        logo?: string | null;
    };
}

// Datos falsos eliminados: los usuarios se gestionan desde MySQL
export const mockUsers: Usuario[] = [];

export const technicianList: string[] = [];
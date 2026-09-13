import type { HistorialModificacion } from './mockReportes';

export interface Service {
    id: number;
    folio: string;
    asunto: string;
    descripcion: string;
    solicitante: string;
    cargo: string;
    idDependencia: number;
    idSubdependencia?: number;
    asignadoA: string | null;
    fechaAsignacion: string;
    fechaVencimiento: string;
    estatus: 'Programado' | 'En Proceso' | 'Realizado' | 'Vencido';
    prioridad: string;
    historialModificaciones?: HistorialModificacion[];
}

// Datos falsos eliminados: listo para conectarse con la API de MySQL
export const mockServices: Service[] = [];
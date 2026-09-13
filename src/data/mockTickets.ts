import type { HistorialModificacion } from './mockReportes';

export interface Ticket {
    id: number;
    folio: string;
    asunto: string;
    descripcion: string;
    solicitante: string;
    cargo: string;
    prioridad: 'Alta' | 'Media' | 'Baja';
    estatus: 'Abierto' | 'En Proceso' | 'Cerrado' | 'Resuelto';
    fechaSolicitud: string;
    fechaAtencion: string;
    atendio: string;
    idDependencia: number;
    idSubdependencia?: number;
    historialModificaciones?: HistorialModificacion[];
    dependencia?: any;
    tecnico?: any;
}

// Datos falsos eliminados: los tickets se consultan directamente desde MySQL (API Laravel)
export const mockTickets: Ticket[] = [];
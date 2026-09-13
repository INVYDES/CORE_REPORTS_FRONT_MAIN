export interface ReporteMaterial {
    idItem: number;
    material: string;
    cantidad: number;
    unidad: string;
}

export interface HistorialModificacion {
    idModificacion: string | number;
    fechaModificacion: string;
    idUsuario: number;
    descripcion: string;
}

export interface EvidenciaFotografica {
    url: string;
    comentario: string;
}

export interface Reporte {
    idReporte: number;
    folio: string;
    idDependencia: number;
    idSubdependencia?: number;
    creadoPor: number;
    tipoReporte: 'Ticket' | 'Servicio Programado' | 'Libre';
    origenDatosId: number | null;
    categoria: 'Mantenimiento Preventivo' | 'Mantenimiento Correctivo' | 'Instalación' | 'Mejora' | 'Diagnóstico';
    fechaElaboracion: string;
    responsableId?: number | null;
    responsableTexto?: string;
    cargoTexto?: string;
    ejecutoresIds: number[];
    fechaHoraInicio: string;
    fechaHoraFin: string;
    horaSalidaBase?: string;
    horaLlegadaSitio?: string;
    horaRegresoABase?: string;
    fallaReportada?: string;
    desarrolloActividades: string;
    materiales: ReporteMaterial[];
    evidenciaFotografica: EvidenciaFotografica[];
    esRetrabajo?: boolean;
    estatusReporte: 'Abierto / Trabajo Parcial' | 'Cerrado / Trabajo Finalizado' | 'Descartado / Cancelado';
    conclusionTrabajo?: string;
    historialModificaciones?: HistorialModificacion[];
}

// Datos falsos eliminados: listo para conectarse con la API de MySQL
export const mockReportes: Reporte[] = [];

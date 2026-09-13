export interface Encuesta {
    idEncuesta: number;
    idReporte: number;
    calificacion: number;
    comentarios: string;
    nombreFirma: string;
    fecha: string;
}

// Datos falsos eliminados: listo para conectarse con la API de MySQL
export const mockEncuestas: Encuesta[] = [];

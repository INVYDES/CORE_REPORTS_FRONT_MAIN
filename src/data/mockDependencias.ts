export interface Dependencia {
    idDependencia: number;
    nombre: string;
    rfc: string;
    tipoLicencia: 'Prueba gratuita' | 'Mensual' | 'Anual';
    fechaExpiracionLicencia: string;
    correoContacto: string;
    correoReportes: string;
    telefono: string;
    datosFacturacion: string;
    activo: boolean;
    fechaRegistro: string;
    nivelUsuarios: 'Básico' | 'Intermedio' | 'Ilimitado';
    limiteUsuarios: number;
    logo?: string;
}

// Datos falsos eliminados: las dependencias se gestionan desde MySQL
export const mockDependencias: Dependencia[] = [];

export const getDependenciaName = (id: number): string => {
    const dep = mockDependencias.find(d => d.idDependencia === id);
    return dep ? dep.nombre : 'Empresa';
};

// ---------------------- SUBAREAS / SUBDEPENDENCIAS -------------------------
export interface Subdependencia {
    idSubdependencia: number;
    idDependencia: number;
    nombre: string;
    activo: boolean;
}

export const mockSubdependencias: Subdependencia[] = [];

export const getSubdependenciaName = (id: number | undefined): string => {
    if (!id) return '---';
    const subdep = mockSubdependencias.find(s => s.idSubdependencia === id);
    return subdep ? subdep.nombre : 'General';
};
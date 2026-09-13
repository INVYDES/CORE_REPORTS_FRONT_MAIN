-- =====================================================================
-- SISTEMA CORE REPORTS - ESQUEMA DE BASE DE DATOS MULTI-EMPRESA (MYSQL)
-- Compatible con MySQL 8.0+ / MariaDB 10.4+ / Laravel Migrations
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `core_reports_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `core_reports_db`;

-- Desactivar temporalmente revisión de llaves foráneas para creación limpia
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `encuestas`;
DROP TABLE IF EXISTS `reporte_evidencias`;
DROP TABLE IF EXISTS `reporte_materiales`;
DROP TABLE IF EXISTS `reporte_ejecutores`;
DROP TABLE IF EXISTS `reportes`;
DROP TABLE IF EXISTS `historial_modificaciones`;
DROP TABLE IF EXISTS `servicios_programados`;
DROP TABLE IF EXISTS `tickets`;
DROP TABLE IF EXISTS `subdependencias`;
DROP TABLE IF EXISTS `usuarios`;
DROP TABLE IF EXISTS `dependencias`;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- 1. TABLA: DEPENDENCIAS (EMPRESAS / CLIENTES PRINCIPALES)
-- =====================================================================
CREATE TABLE `dependencias` (
    `id_dependencia` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(200) NOT NULL,
    `rfc` VARCHAR(20) NOT NULL,
    `tipo_licencia` ENUM('Prueba gratuita', 'Mensual', 'Anual') NOT NULL DEFAULT 'Prueba gratuita',
    `fecha_expiracion_licencia` DATE NULL,
    `correo_contacto` VARCHAR(150) NOT NULL,
    `correo_reportes` VARCHAR(150) NULL,
    `telefono` VARCHAR(50) NULL,
    `datos_facturacion` TEXT NULL,
    `activo` TINYINT(1) NOT NULL DEFAULT 1,
    `fecha_registro` DATE NOT NULL,
    `nivel_usuarios` ENUM('Básico', 'Intermedio', 'Ilimitado') NOT NULL DEFAULT 'Básico',
    `limite_usuarios` INT UNSIGNED NOT NULL DEFAULT 5,
    `logo` VARCHAR(255) NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_dep_activo` (`activo`),
    INDEX `idx_dep_rfc` (`rfc`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 2. TABLA: SUBDEPENDENCIAS (PLANTAS, ÁREAS O SUCURSALES POR EMPRESA)
-- =====================================================================
CREATE TABLE `subdependencias` (
    `id_subdependencia` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `id_dependencia` INT UNSIGNED NOT NULL,
    `nombre` VARCHAR(150) NOT NULL,
    `activo` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_subdep_dependencia` FOREIGN KEY (`id_dependencia`) 
        REFERENCES `dependencias` (`id_dependencia`) ON DELETE CASCADE,
    INDEX `idx_subdep_dep` (`id_dependencia`, `activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 3. TABLA: USUARIOS (EMPLEADOS Y ROLES POR EMPRESA)
-- =====================================================================
-- Roles:
-- 0 = Básico (Solo crea tickets)
-- 1 = Administrador Técnico (Asigna tickets y gestiona reportes)
-- 2 = Administrador Comercial (Gestiona empresa, subáreas y licencias)
-- 3 = Técnico Operativo (Ejecutor de servicios y reportes)
CREATE TABLE `usuarios` (
    `id_usuario` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `id_dependencia` INT UNSIGNED NOT NULL,
    `numero_empleado` VARCHAR(50) NOT NULL,
    `rol` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `nombre` VARCHAR(100) NOT NULL,
    `apellidos` VARCHAR(100) NOT NULL,
    `correo` VARCHAR(150) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `estado` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1: Activo, 0: Inactivo',
    `ultimo_acceso` DATETIME NULL,
    `remember_token` VARCHAR(100) NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_usuarios_dependencia` FOREIGN KEY (`id_dependencia`) 
        REFERENCES `dependencias` (`id_dependencia`) ON DELETE CASCADE,
    INDEX `idx_usuarios_dep_rol` (`id_dependencia`, `rol`),
    INDEX `idx_usuarios_correo` (`correo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 4. TABLA: TICKETS (INCIDENTES O FALLAS REPORTADAS)
-- =====================================================================
CREATE TABLE `tickets` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `folio` VARCHAR(50) NOT NULL UNIQUE,
    `id_dependencia` INT UNSIGNED NOT NULL,
    `id_subdependencia` INT UNSIGNED NULL,
    `asunto` VARCHAR(255) NOT NULL,
    `descripcion` TEXT NOT NULL,
    `solicitante` VARCHAR(150) NOT NULL,
    `cargo` VARCHAR(100) NULL,
    `prioridad` ENUM('Alta', 'Media', 'Baja') NOT NULL DEFAULT 'Media',
    `estatus` ENUM('Abierto', 'En Proceso', 'Cerrado', 'Resuelto') NOT NULL DEFAULT 'Abierto',
    `fecha_solicitud` DATE NOT NULL,
    `fecha_atencion` DATE NULL,
    `atendio` VARCHAR(150) NULL,
    `id_tecnico_atendio` INT UNSIGNED NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_tickets_dependencia` FOREIGN KEY (`id_dependencia`) 
        REFERENCES `dependencias` (`id_dependencia`) ON DELETE CASCADE,
    CONSTRAINT `fk_tickets_subdependencia` FOREIGN KEY (`id_subdependencia`) 
        REFERENCES `subdependencias` (`id_subdependencia`) ON DELETE SET NULL,
    CONSTRAINT `fk_tickets_tecnico` FOREIGN KEY (`id_tecnico_atendio`) 
        REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
    INDEX `idx_tickets_dep_estatus` (`id_dependencia`, `estatus`),
    INDEX `idx_tickets_fecha` (`fecha_solicitud`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 5. TABLA: SERVICIOS PROGRAMADOS (MANTENIMIENTOS PREVENTIVOS)
-- =====================================================================
CREATE TABLE `servicios_programados` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `folio` VARCHAR(50) NOT NULL UNIQUE,
    `id_dependencia` INT UNSIGNED NOT NULL,
    `id_subdependencia` INT UNSIGNED NULL,
    `asunto` VARCHAR(255) NOT NULL,
    `descripcion` TEXT NOT NULL,
    `solicitante` VARCHAR(150) NOT NULL,
    `cargo` VARCHAR(100) NULL,
    `id_tecnico_asignado` INT UNSIGNED NULL,
    `asignado_a` VARCHAR(150) NULL,
    `fecha_asignacion` DATE NOT NULL,
    `fecha_vencimiento` DATE NOT NULL,
    `estatus` ENUM('Programado', 'En Proceso', 'Realizado', 'Vencido') NOT NULL DEFAULT 'Programado',
    `prioridad` VARCHAR(50) NOT NULL DEFAULT 'Media',
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_servicios_dependencia` FOREIGN KEY (`id_dependencia`) 
        REFERENCES `dependencias` (`id_dependencia`) ON DELETE CASCADE,
    CONSTRAINT `fk_servicios_subdependencia` FOREIGN KEY (`id_subdependencia`) 
        REFERENCES `subdependencias` (`id_subdependencia`) ON DELETE SET NULL,
    CONSTRAINT `fk_servicios_tecnico` FOREIGN KEY (`id_tecnico_asignado`) 
        REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
    INDEX `idx_servicios_dep_estatus` (`id_dependencia`, `estatus`),
    INDEX `idx_servicios_vencimiento` (`fecha_vencimiento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 6. TABLA: REPORTES (HOJAS DE SERVICIO TÉCNICO)
-- =====================================================================
CREATE TABLE `reportes` (
    `id_reporte` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `folio` VARCHAR(50) NOT NULL UNIQUE,
    `id_dependencia` INT UNSIGNED NOT NULL,
    `id_subdependencia` INT UNSIGNED NULL,
    `creado_por` INT UNSIGNED NOT NULL,
    `tipo_reporte` ENUM('Ticket', 'Servicio Programado', 'Libre') NOT NULL,
    `origen_datos_id` INT UNSIGNED NULL COMMENT 'ID del Ticket o Servicio Programado vinculado',
    `categoria` ENUM('Mantenimiento Preventivo', 'Mantenimiento Correctivo', 'Instalación', 'Mejora', 'Diagnóstico') NOT NULL,
    `fecha_elaboracion` DATE NOT NULL,
    `responsable_id` INT UNSIGNED NULL,
    `responsable_texto` VARCHAR(150) NULL,
    `cargo_texto` VARCHAR(100) NULL,
    `fecha_hora_inicio` DATETIME NOT NULL,
    `fecha_hora_fin` DATETIME NOT NULL,
    `hora_salida_base` TIME NULL,
    `hora_llegada_sitio` TIME NULL,
    `hora_regreso_a_base` TIME NULL,
    `falla_reportada` TEXT NULL,
    `desarrollo_actividades` TEXT NOT NULL,
    `es_retrabajo` TINYINT(1) NOT NULL DEFAULT 0,
    `estatus_reporte` ENUM('Abierto / Trabajo Parcial', 'Cerrado / Trabajo Finalizado', 'Descartado / Cancelado') NOT NULL DEFAULT 'Cerrado / Trabajo Finalizado',
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_reportes_dependencia` FOREIGN KEY (`id_dependencia`) 
        REFERENCES `dependencias` (`id_dependencia`) ON DELETE CASCADE,
    CONSTRAINT `fk_reportes_subdependencia` FOREIGN KEY (`id_subdependencia`) 
        REFERENCES `subdependencias` (`id_subdependencia`) ON DELETE SET NULL,
    CONSTRAINT `fk_reportes_creador` FOREIGN KEY (`creado_por`) 
        REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT,
    CONSTRAINT `fk_reportes_responsable` FOREIGN KEY (`responsable_id`) 
        REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
    INDEX `idx_reportes_dep_fecha` (`id_dependencia`, `fecha_elaboracion`),
    INDEX `idx_reportes_origen` (`tipo_reporte`, `origen_datos_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 7. TABLA: REPORTE_EJECUTORES (RELACIÓN MUCHOS A MUCHOS REPORTE <-> TÉCNICOS)
-- =====================================================================
CREATE TABLE `reporte_ejecutores` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `id_reporte` INT UNSIGNED NOT NULL,
    `id_usuario` INT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_rep_ejecutores_reporte` FOREIGN KEY (`id_reporte`) 
        REFERENCES `reportes` (`id_reporte`) ON DELETE CASCADE,
    CONSTRAINT `fk_rep_ejecutores_usuario` FOREIGN KEY (`id_usuario`) 
        REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
    UNIQUE KEY `uk_reporte_usuario` (`id_reporte`, `id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 8. TABLA: REPORTE_MATERIALES (ITEMS USADOS EN EL SERVICIO)
-- =====================================================================
CREATE TABLE `reporte_materiales` (
    `id_item` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `id_reporte` INT UNSIGNED NOT NULL,
    `material` VARCHAR(255) NOT NULL,
    `cantidad` DECIMAL(10, 2) NOT NULL,
    `unidad` VARCHAR(50) NOT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_materiales_reporte` FOREIGN KEY (`id_reporte`) 
        REFERENCES `reportes` (`id_reporte`) ON DELETE CASCADE,
    INDEX `idx_materiales_rep` (`id_reporte`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 9. TABLA: REPORTE_EVIDENCIAS (FOTOS Y DOCUMENTOS DEL SERVICIO)
-- =====================================================================
CREATE TABLE `reporte_evidencias` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `id_reporte` INT UNSIGNED NOT NULL,
    `url` VARCHAR(255) NOT NULL,
    `comentario` TEXT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_evidencias_reporte` FOREIGN KEY (`id_reporte`) 
        REFERENCES `reportes` (`id_reporte`) ON DELETE CASCADE,
    INDEX `idx_evidencias_rep` (`id_reporte`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 10. TABLA: ENCUESTAS (EVALUACIÓN DE SATISFACCIÓN POR REPORTE)
-- =====================================================================
CREATE TABLE `encuestas` (
    `id_encuesta` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `id_reporte` INT UNSIGNED NOT NULL UNIQUE,
    `calificacion` TINYINT UNSIGNED NOT NULL COMMENT 'Escala 1 a 10',
    `comentarios` TEXT NULL,
    `nombre_firma` VARCHAR(150) NOT NULL,
    `fecha` DATETIME NOT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_encuestas_reporte` FOREIGN KEY (`id_reporte`) 
        REFERENCES `reportes` (`id_reporte`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 11. TABLA: HISTORIAL_MODIFICACIONES (AUDITORÍA DE CAMBIOS)
-- =====================================================================
CREATE TABLE `historial_modificaciones` (
    `id_modificacion` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `entidad_tipo` ENUM('ticket', 'servicio', 'reporte') NOT NULL,
    `entidad_id` INT UNSIGNED NOT NULL,
    `id_usuario` INT UNSIGNED NOT NULL,
    `descripcion` TEXT NOT NULL,
    `fecha_modificacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_historial_entidad` (`entidad_tipo`, `entidad_id`),
    CONSTRAINT `fk_historial_usuario` FOREIGN KEY (`id_usuario`) 
        REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

USE `core_reports_db`;

-- 1. Insertar empresa demo
INSERT INTO `dependencias` (
    `id_dependencia`, 
    `nombre`, 
    `rfc`, 
    `tipo_licencia`, 
    `correo_contacto`, 
    `activo`, 
    `fecha_registro`, 
    `nivel_usuarios`, 
    `limite_usuarios`
) VALUES (
    1, 
    'Empresa de Prueba S.A. de C.V.', 
    'PRU-240101-AAA', 
    'Anual', 
    'contacto@empresa.com', 
    1, 
    CURDATE(), 
    'Ilimitado', 
    50
) ON DUPLICATE KEY UPDATE `id_dependencia` = `id_dependencia`;

-- 2. Insertar sucursal / planta inicial
INSERT INTO `subdependencias` (
    `id_subdependencia`,
    `id_dependencia`,
    `nombre`,
    `activo`
) VALUES (
    1,
    1,
    'Planta Matriz',
    1
) ON DUPLICATE KEY UPDATE `id_subdependencia` = `id_subdependencia`;

-- 3. Insertar usuario administrador
-- Correo: admin@empresa.com
-- Contraseña: password
INSERT INTO `usuarios` (
    `id_usuario`, 
    `id_dependencia`, 
    `numero_empleado`, 
    `rol`, 
    `nombre`, 
    `apellidos`, 
    `correo`, 
    `password`, 
    `estado`
) VALUES (
    1, 
    1, 
    'EMP-001', 
    2, 
    'Administrador', 
    'Principal', 
    'admin@empresa.com', 
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
    1
) ON DUPLICATE KEY UPDATE `id_usuario` = `id_usuario`;

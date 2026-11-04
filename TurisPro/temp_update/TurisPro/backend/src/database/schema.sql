-- Esquema de Base de Datos para TurisPro
-- Modelo Relacional alineado al Diagrama de Clases UML y Reglas de Negocio

PRAGMA foreign_keys = ON;

-- 1. Tabla de Usuarios (HU-01, HU-02, HU-22, HU-23)
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    correo TEXT UNIQUE NOT NULL,
    contrasena_hash TEXT NOT NULL,
    rol TEXT NOT NULL CHECK(rol IN ('ADMINISTRADOR', 'GESTOR_PROVEEDORES', 'EVALUADOR')),
    activo INTEGER NOT NULL DEFAULT 1,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Zonas de Cobertura
CREATE TABLE IF NOT EXISTS zonas_cobertura (
    id_zona INTEGER PRIMARY KEY AUTOINCREMENT,
    pais TEXT NOT NULL,
    ciudad TEXT NOT NULL,
    descripcion TEXT
);

-- 3. Tabla de Proveedores (HU-03, HU-04, HU-05, HU-16)
CREATE TABLE IF NOT EXISTS proveedores (
    id_proveedor INTEGER PRIMARY KEY AUTOINCREMENT,
    razon_social TEXT NOT NULL,
    nit TEXT UNIQUE NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('HOTEL', 'AEROLINEA', 'TRANSPORTADOR', 'OPERADOR', 'GUIA', 'RESTAURANTE', 'ASEGURADORA')),
    correo TEXT NOT NULL,
    telefono TEXT,
    direccion TEXT,
    activo INTEGER NOT NULL DEFAULT 1,
    estado_ciclo TEXT NOT NULL DEFAULT 'Registrado', -- 'Registrado', 'Activo', 'Inactivo'
    nivel_riesgo TEXT DEFAULT 'SIN_DATOS',           -- 'BAJO', 'MEDIO', 'ALTO', 'SIN_DATOS'
    puntaje_riesgo INTEGER DEFAULT NULL,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla intermedia: Proveedor <-> Zonas de Cobertura (Muchos a Muchos)
CREATE TABLE IF NOT EXISTS proveedor_zonas (
    id_proveedor INTEGER NOT NULL,
    id_zona INTEGER NOT NULL,
    PRIMARY KEY (id_proveedor, id_zona),
    FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor) ON DELETE CASCADE,
    FOREIGN KEY (id_zona) REFERENCES zonas_cobertura(id_zona) ON DELETE CASCADE
);

-- 4. Tabla de Servicios (HU-06, HU-17)
CREATE TABLE IF NOT EXISTS servicios (
    id_servicio INTEGER PRIMARY KEY AUTOINCREMENT,
    id_proveedor INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    tarifa REAL NOT NULL CHECK(tarifa > 0), -- Regla: tarifa estrictamente positiva
    unidad TEXT NOT NULL,
    vigente_desde DATE NOT NULL,
    vigente_hasta DATE NOT NULL,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor) ON DELETE CASCADE
);

-- 5. Tabla de Documentos (HU-07, HU-08, HU-18)
CREATE TABLE IF NOT EXISTS documentos (
    id_documento INTEGER PRIMARY KEY AUTOINCREMENT,
    id_proveedor INTEGER NOT NULL,
    tipo TEXT NOT NULL,
    fecha_emision DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    archivo_url TEXT,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor) ON DELETE CASCADE
);

-- 6. Tabla de Evaluaciones (HU-09, HU-10, HU-30)
CREATE TABLE IF NOT EXISTS evaluaciones (
    id_evaluacion INTEGER PRIMARY KEY AUTOINCREMENT,
    id_proveedor INTEGER NOT NULL,
    id_evaluador INTEGER NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    criterio_calidad INTEGER NOT NULL CHECK(criterio_calidad BETWEEN 1 AND 5),
    criterio_plazos INTEGER NOT NULL CHECK(criterio_plazos BETWEEN 1 AND 5),
    criterio_comunicacion INTEGER NOT NULL CHECK(criterio_comunicacion BETWEEN 1 AND 5),
    criterio_documental INTEGER NOT NULL CHECK(criterio_documental BETWEEN 1 AND 5),
    criterio_precio INTEGER NOT NULL CHECK(criterio_precio BETWEEN 1 AND 5),
    promedio REAL NOT NULL,
    comentario TEXT,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor) ON DELETE CASCADE,
    FOREIGN KEY (id_evaluador) REFERENCES usuarios(id_usuario)
);

-- 7. Tabla de Incidentes (HU-11, HU-19)
CREATE TABLE IF NOT EXISTS incidentes (
    id_incidente INTEGER PRIMARY KEY AUTOINCREMENT,
    id_proveedor INTEGER NOT NULL,
    id_registrado_por INTEGER NOT NULL,
    tipo TEXT NOT NULL,
    severidad TEXT NOT NULL CHECK(severidad IN ('BAJA', 'MEDIA', 'ALTA')),
    estado TEXT NOT NULL CHECK(estado IN ('ABIERTO', 'EN_SEGUIMIENTO', 'CERRADO')),
    descripcion TEXT NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor) ON DELETE CASCADE,
    FOREIGN KEY (id_registrado_por) REFERENCES usuarios(id_usuario)
);

-- 8. Tabla de Análisis de Riesgo (HU-12, HU-13, HU-20, HU-29, HU-31)
CREATE TABLE IF NOT EXISTS analisis_riesgo (
    id_analisis INTEGER PRIMARY KEY AUTOINCREMENT,
    id_proveedor INTEGER NOT NULL,
    puntaje INTEGER NOT NULL,
    nivel TEXT NOT NULL CHECK(nivel IN ('BAJO', 'MEDIO', 'ALTO')),
    explicacion TEXT NOT NULL,
    origen_explicacion TEXT NOT NULL CHECK(origen_explicacion IN ('LLM', 'PLANTILLA')),
    fecha_calculo DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    recomendacion TEXT,
    FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor) ON DELETE CASCADE
);

-- 9. Tabla de Factores de Riesgo (HU-13)
CREATE TABLE IF NOT EXISTS factores_riesgo (
    id_factor INTEGER PRIMARY KEY AUTOINCREMENT,
    id_analisis INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    peso REAL NOT NULL,
    valor REAL NOT NULL,
    aporte REAL NOT NULL,
    descripcion TEXT NOT NULL,
    FOREIGN KEY (id_analisis) REFERENCES analisis_riesgo(id_analisis) ON DELETE CASCADE
);

-- 10. Tabla de Alertas (HU-26, HU-28)
CREATE TABLE IF NOT EXISTS alertas (
    id_alerta INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    canal TEXT NOT NULL CHECK(canal IN ('APP', 'CORREO')),
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    leida INTEGER NOT NULL DEFAULT 0
);

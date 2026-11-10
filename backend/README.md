# 🚀 TurisPro - Backend API (MVP Release 1)

Backend profesional y robusto para la plataforma de gestión y evaluación de proveedores turísticos **TurisPro**, desarrollado estrictamente con base en los diagramas UML (Clases, Estados, Secuencia y Comunicaciones) y las Historias de Usuario (HU-01 a HU-15) del Backlog Priorizado.

---

## 🏛️ Arquitectura del Sistema

El backend sigue los principios de **Clean Architecture** y **Domain-Driven Design (DDD)**, estructurado en capas desacopladas y sin dependencias externas pesadas gracias al motor nativo de **Node.js 22** y **SQLite** (`node:sqlite`).

```
backend/
├── package.json               # Configuración del paquete y scripts
├── secrets/                   # Carpeta privada para claves locales (no subir a Git)
│   ├── .env                   # Archivo local donde pegas tu API key
│   ├── .env.example           # Plantilla sin credenciales reales
│   └── README.txt             # Instrucciones de seguridad
├── .gitignore                 # Exclusiones de Git (base de datos y secretos)
├── README.md                  # Documentación completa de la API
├── src/
│   ├── index.js               # Servidor HTTP nativo y punto de arranque
│   ├── config/
│   │   └── config.js          # Pesos de riesgo, umbrales, puertos y configuración LLM
│   ├── database/
│   │   ├── connection.js      # Conexión nativa SQLite (WAL mode, foreign keys)
│   │   ├── schema.sql         # Esquema relacional DDL alineado al Diagrama de Clases
│   │   └── seed.js            # Datos iniciales (usuarios, zonas, Hotel Los Andes, etc.)
│   ├── domain/                # Entidades puras y lógica de dominio UML
│   │   ├── enums.js           # Rol, TipoProveedor, SeveridadIncidente, Estados
│   │   ├── Usuario.js         # Autenticación, hashing PBKDF2 y permisos por Rol
│   │   ├── Proveedor.js       # Registro, filtros combinables, detalle y ciclo de vida
│   │   ├── Servicio.js        # Tarifas positivas, unidad y periodos de vigencia
│   │   ├── Documento.js       # Cálculo dinámico de vigencia (<= 30 días, < 0 días)
│   │   ├── Evaluacion.js      # 5 criterios (1-5), cálculo de promedio simple
│   │   ├── Incidente.js       # Severidad (BAJA, MEDIA, ALTA) y transiciones de estado
│   │   ├── FactorRiesgo.js    # Aporte ponderado por factor (peso * valor * 100)
│   │   ├── AnalisisRiesgo.js  # Puntaje, nivel, explicación, aviso humano obligatorio
│   │   ├── ZonaCobertura.js   # Zonas geográficas (país, ciudad)
│   │   └── Reporte.js         # 4 indicadores de dashboard y comparador
│   ├── services/
│   │   ├── MotorRiesgo.js     # Orquestación de cálculo de riesgo según Secuencia UML
│   │   ├── ClienteLLM.js      # Explicaciones con IA (Gemini) o Plantilla de Respaldo
│   │   └── AuthService.js     # Emisión y verificación de tokens JWT sin librerías
│   ├── middlewares/
│   │   ├── authMiddleware.js  # Validación de tokens y autorización RBAC por Rol
│   │   └── corsMiddleware.js  # Soporte CORS para integración con el frontend
│   ├── controllers/           # Controladores HTTP REST
│   │   ├── authController.js
│   │   ├── proveedorController.js
│   │   ├── servicioController.js
│   │   ├── documentoController.js
│   │   ├── evaluacionController.js
│   │   ├── incidenteController.js
│   │   ├── riesgoController.js
│   │   └── dashboardController.js
│   └── routes/
│       └── router.js          # Enrutador REST con soporte de parámetros de ruta
└── tests/                     # Suite de pruebas automatizadas con node:test
    ├── auth.test.js           # Pruebas de autenticación y matriz de permisos
    ├── estados.test.js        # Pruebas de diagramas de estados (Documento, Incidente)
    ├── motorRiesgo.test.js    # Pruebas de fórmula de riesgo, factores y umbrales
    └── api.test.js            # Pruebas de integración E2E de los endpoints HTTP
```

---

## 📐 Cumplimiento de Especificaciones UML y Reglas de Negocio

### 1. Diagrama de Estados UML
- **`stm Proveedor`**: Inicia en `Registrado`. Al calcular el análisis de riesgo pasa a `Activo` con su estado de riesgo correspondiente (`Riesgo bajo`, `Riesgo medio`, `Riesgo alto`). Puede ser desactivado a `Inactivo` conservando todo su historial.
- **`stm Documento`**: Estado dinámico calculado al consultar:
  - `diasParaVencer() > 30` ➔ **Vigente**
  - `0 <= diasParaVencer() <= 30` ➔ **Por vencer**
  - `diasParaVencer() < 0` ➔ **Vencido**
- **`stm Incidente`**:
  - `Abierto` ➔ `cambiarEstado(EN_SEGUIMIENTO)` ➔ `En seguimiento`
  - `En seguimiento` ➔ `cambiarEstado(CERRADO)` ➔ `Cerrado`
  - `Abierto` ➔ `cambiarEstado(CERRADO)` ➔ `Cerrado`

### 2. Diagrama de Secuencia y Comunicaciones UML (`Consultar riesgo`)
1. **Reutilización de análisis vigente**: Si ya existe un análisis y no hay evaluaciones, incidentes ni documentos nuevos o cambios de vigencia desde su fecha de cálculo, el análisis se reutiliza instantáneamente.
2. **Cálculo de factores**:
   - **Evaluaciones ($E$)**: $E = \frac{5 - \text{promedio}}{4}$. Si no tiene evaluaciones, se responde *"sin datos suficientes"*.
   - **Incidentes ($I$)**: $I = \min(1.0, \frac{\text{puntos}}{10})$, donde severidad Baja = 1, Media = 3, Alta = 5 en incidentes abiertos o en seguimiento.
   - **Documentos ($D$)**: $D = \frac{\text{documentos vencidos}}{\text{total documentos registrados}}$.
3. **Fórmula del puntaje de riesgo**:
   $$\text{Riesgo} = 100 \times (0.40 \cdot E + 0.35 \cdot I + 0.25 \cdot D)$$
4. **Clasificación del nivel**:
   - **Bajo**: $0 \le \text{Puntaje} < 34$
   - **Medio**: $34 \le \text{Puntaje} < 67$
   - **Alto**: $67 \le \text{Puntaje} \le 100$
5. **Cliente LLM y Plantilla de Respaldo**: Si `GEMINI_API_KEY` está configurada, intenta generar la explicación con Google Gemini. Si falta la clave o el servicio falla/vence el tiempo límite (`LLM_TIMEOUT_MS`), el cálculo y guardado del riesgo continúan con una explicación determinística basada en los factores. La respuesta queda marcada como `PLANTILLA`, nunca como IA.
6. **Aviso Humano Obligatorio (HU-13)**: Toda consulta de riesgo incluye la advertencia explícita:
   > *"La decisión final sobre el proveedor siempre la toma una persona."*

---

## ⚙️ Configuración local

1. Abre `backend/secrets/.env` y pega tu clave después de `GEMINI_API_KEY=` (el valor está vacío).
2. Guarda el archivo. El backend carga primero `backend/secrets/.env`; también admite `backend/.env` por compatibilidad. Las variables definidas en el sistema tienen prioridad.
3. Ejecuta `npm start` desde `backend/`.
4. Si no configuras la clave, el motor sigue calculando el riesgo real y la pantalla identifica claramente que la explicación proviene de reglas locales, no de Gemini.

## 👥 Usuarios Pre-cargados por Defecto (Seed)

El sistema incluye 3 roles fijos listos para usar:

| Rol | Correo | Contraseña | Capacidades |
|---|---|---|---|
| **ADMINISTRADOR** | `admin@turispro.com` | `Admin123*` | Control total, gestión de usuarios, auditoría y configuración |
| **GESTOR_PROVEEDORES** | `gestor@turispro.com` | `Gestor123*` | Registro y edición de proveedores, servicios, documentos y consultas |
| **EVALUADOR** | `evaluador@turispro.com` | `Evaluador123*` | Calificación de 5 criterios, registro de incidentes y seguimiento |

---

## 🔌 Catálogo de Endpoints REST

### Autenticación y Usuarios
- `POST /api/auth/login`: Iniciar sesión (correo y contraseña). HU-01.
- `GET /api/auth/perfil`: Datos y permisos del usuario autenticado. HU-23.
- `GET /api/auth/menu`: Opciones del menú lateral según el rol activo. HU-02.
- `POST /api/auth/usuarios`: Crear nuevo usuario (solo Administrador). HU-22.
- `GET /api/auth/usuarios`: Listar usuarios del sistema (solo Administrador).

### Dashboard y Comparación
- `GET /api/dashboard`: 4 indicadores clave + tabla de atención prioritaria. HU-14.
- `GET /api/dashboard/ranking`: Ranking de proveedores ordenados por riesgo y calificación.
- `POST /api/proveedores/comparar`: Comparación lado a lado de 2 o 3 proveedores. HU-15.
- `GET /api/zonas`: Listado de zonas de cobertura geográfica.

### Proveedores
- `GET /api/proveedores`: Listar, buscar por texto y filtrar por tipo, zona, estado y riesgo. HU-04.
- `POST /api/proveedores`: Registrar nuevo proveedor con NIT único y cobertura. HU-03.
- `GET /api/proveedores/:id`: Ficha detallada con datos organizados en pestañas. HU-05.
- `PUT /api/proveedores/:id`: Editar información general del proveedor. HU-16.
- `PATCH /api/proveedores/:id/desactivar`: Desactivar proveedor a estado `Inactivo`. HU-16.
- `PATCH /api/proveedores/:id/reactivar`: Reactivar proveedor a estado `Activo`.

### Servicios y Tarifas
- `GET /api/proveedores/:id/servicios`: Listar servicios de un proveedor.
- `POST /api/proveedores/:id/servicios`: Agregar servicio con tarifa positiva y vigencia. HU-06.
- `PUT /api/servicios/:id`: Editar servicio existente. HU-17.
- `DELETE /api/servicios/:id`: Eliminar servicio con confirmación previa. HU-17.

### Documentos
- `GET /api/proveedores/:id/documentos`: Listar documentos con vigencia calculada. HU-08.
- `POST /api/proveedores/:id/documentos`: Registrar documento con fecha de vencimiento. HU-07.
- `GET /api/documentos`: Vista global transversal de documentos. HU-18.
- `DELETE /api/documentos/:id`: Eliminar documento.

### Evaluaciones
- `GET /api/proveedores/:id/evaluaciones`: Historial y promedio de calificaciones. HU-10.
- `POST /api/proveedores/:id/evaluaciones`: Registrar evaluación con los 5 criterios y comentario. HU-09.
- `GET /api/evaluaciones`: Vista transversal de evaluaciones registradas. HU-30.

### Incidentes
- `GET /api/proveedores/:id/incidentes`: Listar incidentes de un proveedor.
- `POST /api/proveedores/:id/incidentes`: Registrar incidente con severidad y estado. HU-11.
- `PATCH /api/incidentes/:id/estado`: Transición de estado (`ABIERTO` ➔ `EN_SEGUIMIENTO` ➔ `CERRADO`).
- `GET /api/incidentes`: Vista global con filtros de severidad y estado. HU-19.

### Análisis de Riesgo e Inteligencia Artificial
- `GET /api/proveedores/:id/riesgo`: Consultar análisis de riesgo (reutiliza o calcula). HU-12, HU-13.
- `POST /api/proveedores/:id/riesgo/recalcular`: Forzar recálculo del análisis ante cambios. HU-29.
- `GET /api/riesgo/global`: Vista global de riesgo de todos los proveedores. HU-31.

---

## 🧪 Ejecución y Pruebas Automatizadas

### Requisitos
- **Node.js**: Versión 22.5.0 o superior (requerida por `node:sqlite`).
- Sin instalación obligatoria de paquetes npm (cero dependencias externas).

### Comandos disponibles

```bash
# Entrar a la carpeta del backend
cd backend

# Ejecutar el seed de base de datos
npm run seed
# o directamente: node src/database/seed.js

# Correr toda la suite de pruebas unitarias y de integración
npm test
# o directamente: node --test tests/*.test.js

# Iniciar el servidor en desarrollo
npm start
# o directamente: node src/index.js
```

### Catálogo hotelero inicial

Al iniciar el backend (`npm start`) o ejecutar el seed (`npm run seed`), TurisPro carga de forma idempotente 10 hoteles reales de Colombia en la tabla `proveedores` (`tipo = HOTEL`). El directorio consulta estos registros mediante la API; no utiliza una lista de hoteles simulada en el navegador.

Los nombres y ciudades se basan en información pública. Los NIT y datos de contacto no se inventan: aparecen marcados como pendientes de verificación hasta que el equipo los complete con información empresarial confirmada.

## Análisis de riesgo asistido por IA

La pantalla `frontend/src/pages/risk/ai-risk-analysis.html` consulta proveedores desde SQLite mediante `/api/proveedores` y ejecuta el análisis individual con `/api/proveedores/:id/riesgo` o su recálculo con `/api/proveedores/:id/riesgo/recalcular`.

El análisis combina:
- Motor de reglas ponderadas: evaluaciones (40%), incidentes activos (35%) y documentos vencidos (25%). Cuando una categoría no tiene registros para calcularse, no se inventa un valor: se excluye y los pesos disponibles se normalizan proporcionalmente.
- Explicación generativa opcional con Google Gemini. Para activarla, configura `GEMINI_API_KEY` en el entorno del backend. La clave nunca se envía al navegador. Sin esa clave, el motor sigue calculando la clasificación real y genera una explicación de respaldo basada en los factores de SQLite; la interfaz identifica ese origen sin presentarlo como texto generado por un LLM.

Variables: `GEMINI_API_KEY`, `LLM_MODEL` (por defecto `gemini-3.8-flash`) y `LLM_TIMEOUT_MS` (por defecto 45000 ms). La clasificación es apoyo a la decisión y requiere supervisión humana.


## Activar análisis con IA real (Google Gemini)

1. Abre `backend/secrets/.env`.
2. Pega tu clave después de `GEMINI_API_KEY=` (el valor está vacío).
3. Conserva `LLM_MODEL=gemini-3.8-flash`, modelo Flash estable configurado para esta versión.
4. Reinicia el backend con `npm start`.
5. En TurisPro busca un proveedor y pulsa **Analizar riesgo**.

El backend calcula los indicadores con los datos de SQLite y envía esos factores a Gemini para redactar la explicación. Si falta la clave o Gemini falla, la pantalla mostrará un aviso y marcará el texto como explicación basada en reglas locales; nunca presentará una plantilla como si fuera una respuesta de IA. La clave se mantiene exclusivamente en el backend y se envía en el encabezado `x-goog-api-key`, no en la URL. Para despliegue, configura las variables en el panel privado del hosting; no publiques el archivo `.env`.


## Preparar el despliegue (hosting)

En el panel de variables privadas/Secrets del proveedor de hosting configura:

- `NODE_ENV` = `production`
- `GEMINI_API_KEY` = tu clave de Google AI Studio
- `LLM_MODEL` = `gemini-3.8-flash`
- `LLM_TIMEOUT_MS` = `45000`
- `JWT_SECRET` = una cadena aleatoria larga y exclusiva (mínimo 32 caracteres).
- `PORT` = usa el puerto que proporcione automáticamente el hosting; si lo exige, permite que la plataforma lo inyecte.

No subas `backend/secrets/.env` al repositorio. El `.gitignore` ya lo excluye. El archivo incluido en el ZIP tiene `GEMINI_API_KEY` vacío, no contiene una API key real.

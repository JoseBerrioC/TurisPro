# TurisPro

Plataforma web de gestión y evaluación de proveedores turísticos (hoteles, transporte, tours). Este repositorio contiene el **prototipo navegable** del diseño UX/UI, generado en Google Stitch con HTML y Tailwind CSS.

## Cómo ejecutarlo

Lo más simple es levantar el backend, que también sirve el frontend:

```
cd backend && npm start        # http://localhost:3000
```

También puedes abrir `frontend/index.html`: redirige automáticamente a la pantalla de **inicio de sesión**.

- Con VS Code: extensión *Live Server* → clic derecho en `index.html` → *Open with Live Server*.
- Con Python: `python -m http.server 5500 (desde la carpeta frontend)` y abre http://localhost:5500

Requiere internet (Tailwind CSS, Inter y Material Symbols se cargan por CDN).

## Flujo del prototipo

`Login` → `Dashboard` → menú lateral: Proveedores (directorio), Comparar, Documentos, Evaluaciones, Incidentes, Reportes, Análisis IA y Configuración. Desde el directorio se accede a la ficha de **Hotel Los Andes** y a sus pestañas (información, servicios y tarifas, documentos, evaluaciones, incidentes). El botón de cerrar sesión regresa al login.

## Estructura

```
TurisPro/                         # raíz del repositorio
├── index.html                    # Redirige al frontend
├── backend/                      # API REST (Node 22 + SQLite) - ver backend/README.md
└── frontend/
    ├── index.html                # Punto de entrada (redirige al login)
    ├── src/
    │   ├── assets/
    │   │   ├── css/turispro-sidebar.css   # Estilos del menú lateral (compartidos)
    │   │   ├── css/turispro-base.css      # Normalización responsive (aún sin enlazar)
    │   │   └── js/
    │   │       ├── sidebar.js    # Menú lateral compartido: opciones, usuario, logout
    │   │       ├── clock.js      # Reloj en vivo (zona America/Bogota)
    │   │       ├── api.js        # Cliente de la API REST (con modo demo)
    │   │       └── nav-layout.js # Toasts y menú móvil (aún sin enlazar)
    │   ├── pages/                # Pantallas principales
    │   │   ├── auth/             # login
    │   │   ├── dashboard/        # dashboard
    │   │   ├── providers/        # directory, register, compare
    │   │   │   └── hotel-los-andes/  # detail, services-and-rates, documents, evaluations, incidents
    │   │   ├── risk/             # ai-risk-analysis
    │   │   ├── reports/          # executive-analytics
    │   │   └── settings/         # settings
    │   └── variants/             # Diseños alternativos (mismo esquema de carpetas)
    ├── assets/images/            # Logo de TurisPro
    ├── design-system/            # TurisPro Corporate System y Celeste Corporate System
    └── docs/                     # Índice de pantallas y capturas
```

### Menú lateral compartido

El menú ya no se copia en cada HTML. Cada pantalla incluye, donde va el menú:

```html
<script src="../../assets/js/sidebar.js"></script>
```

y, en el `<head>`, `turispro-sidebar.css`. Para agregar o cambiar una opción se edita
solo el arreglo `NAV_ITEMS` de `sidebar.js`. La opción activa se calcula según la URL.

## Variantes

| Archivo | Descripción |
|---|---|
| `variants/auth/login-alt.html` | Login con cabecera de texto en lugar del logo |
| `variants/dashboard/dashboard-celeste.html` | Versión con el sistema de diseño Celeste |
| `variants/providers/compare-alt.html` | Segunda versión de comparar proveedores |
| `variants/providers/hotel-los-andes/detail-celeste.html` | Ficha del proveedor en tema Celeste |
| `variants/reports/executive-analytics-alt.html` | Segunda versión de reportes |
| `variants/settings/settings-alt.html` | Segunda versión de configuración |

## Sistema de diseño

Los tokens (colores, tipografía, espaciado) están documentados en `design-system/`.

## Pendiente

- Los datos son estáticos (maquetas); falta conectar un backend y autenticación real.
- Extraer la cabecera superior y la configuración de Tailwind (`tailwind-config`) a archivos compartidos; hoy hay variantes de paleta distintas entre pantallas.
- Enlazar `turispro-base.css` y `nav-layout.js` (menú móvil, toasts) cuando se decida activar la versión responsive.

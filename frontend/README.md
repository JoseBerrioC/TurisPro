# TurisPro

Plataforma web de gestión y evaluación de proveedores turísticos (hoteles, transporte, tours). Este repositorio contiene el **prototipo navegable** del diseño UX/UI, generado en Google Stitch con HTML y Tailwind CSS.

## Cómo ejecutarlo

Abre `index.html`: redirige automáticamente a la pantalla de **inicio de sesión**.

- Con VS Code: extensión *Live Server* → clic derecho en `index.html` → *Open with Live Server*.
- Con Python: `python -m http.server 5500` y abre http://localhost:5500

Requiere internet (Tailwind CSS, Inter y Material Symbols se cargan por CDN).

## Flujo del prototipo

`Login` → `Dashboard` → menú lateral: Proveedores (directorio), Comparar, Documentos, Evaluaciones, Incidentes, Reportes, Análisis IA y Configuración. Desde el directorio se accede a la ficha de **Hotel Los Andes** y a sus pestañas (información, servicios y tarifas, documentos, evaluaciones, incidentes). El botón de cerrar sesión regresa al login.

## Estructura

```
TurisPro/
├── index.html                  # Punto de entrada (redirige al login)
├── src/
│   ├── pages/                  # Pantallas principales
│   │   ├── auth/               # login
│   │   ├── dashboard/          # dashboard
│   │   ├── providers/          # directory, register, compare
│   │   │   └── hotel-los-andes/  # detail, services-and-rates, documents, evaluations, incidents
│   │   ├── risk/               # ai-risk-analysis
│   │   ├── reports/            # executive-analytics
│   │   └── settings/           # settings
│   └── variants/               # Diseños alternativos (mismo esquema de carpetas)
├── assets/images/              # Logo de TurisPro
├── design-system/              # TurisPro Corporate System y Celeste Corporate System
└── docs/
    ├── screens.html            # Índice de todas las pantallas y variantes
    └── screenshots/            # Capturas de cada pantalla
```

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
- Extraer el estilo y componentes repetidos (menú lateral, cabecera) a archivos compartidos.

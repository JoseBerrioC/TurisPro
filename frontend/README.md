# TurisPro

## Ejecución recomendada

1. Abre una terminal en `backend/` y ejecuta `npm start`.
2. Abre `http://localhost:3000` en el navegador. El backend también sirve el frontend y evita el mecanismo de recarga automática de Live Server.

## Alternativa con VS Code Live Server

El proyecto incluye `.vscode/settings.json` con `liveServer.settings.root` apuntando a `/frontend`. Abre la carpeta raíz `TurisPro` en VS Code y ejecuta Live Server sobre `frontend/index.html`. Así Live Server sirve únicamente los archivos del frontend y no observa la base de datos SQLite ni los archivos cargados en `backend/uploads`.

**No inicies Live Server desde la raíz antigua del proyecto sin esta configuración.** Cuando Live Server vigila también `backend/`, los cambios de SQLite al guardar evaluaciones, incidentes o documentos pueden ser detectados como cambios de archivos y provocar una recarga completa del navegador.

También puedes ejecutar `python server.py`; este servidor sirve únicamente `frontend/` en el puerto 5500. En cualquier caso, la API Node debe estar ejecutándose en el puerto 3000.

Se requiere Node.js 20 o superior. Tailwind, Inter y Material Symbols se cargan desde CDN y requieren conexión a internet.

## Permisos por rol

| Pantalla | Administrador | Gestor | Evaluador |
|---|---|---|---|
| Inicio, Proveedores, Comparar, Configuración | ✅ | ✅ | ✅ |
| Documentos (global), Reportes, Registrar proveedor | ✅ | ✅ | ❌ |
| Servicios/tarifas y documentos del proveedor (crear, editar) | ✅ | ✅ | solo lectura |
| Evaluaciones, Incidentes (crear), recalcular Análisis IA | ✅ | solo lectura | ✅ |

- El menú, la guardia de páginas y los botones se controlan en `src/assets/js/sidebar.js` (`NAV_ITEMS`, `PAGE_ACCESS`).
- Para ocultar un botón o bloque a ciertos roles: `data-tp-roles="ADMINISTRADOR GESTOR_PROVEEDORES"`.
- La seguridad real está en el backend (`requerirRol` en `router.js`); `menuPorRol` en `authController.js` debe mantenerse igual que `NAV_ITEMS`.

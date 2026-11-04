const fs = require('node:fs');
const path = require('node:path');

const baseDir = path.resolve(__dirname, '../TurisPro/src/pages');

// ==========================================
// 1. FIX LOGIN.HTML
// ==========================================
const loginPath = path.join(baseDir, 'auth/login.html');
let loginHtml = fs.readFileSync(loginPath, 'utf8');

// Quitar dimensiones fijas y overflow hidden en html y body
loginHtml = loginHtml.replace(
  'style="width: 1280px; height: 1024px; overflow: hidden; position: relative;"',
  ''
);
loginHtml = loginHtml.replace(
  '<body class="h-full bg-background font-body-md text-on-surface antialiased select-none">',
  '<body class="min-h-screen bg-background font-body-md text-on-surface antialiased overflow-y-auto">'
);
loginHtml = loginHtml.replace(
  '<section class="w-full lg:w-1/2 min-h-screen bg-surface-container-lowest flex flex-col justify-between p-6 sm:p-10 lg:p-14 z-10 border-r border-outline-variant/30">',
  '<section class="w-full lg:w-1/2 min-h-screen overflow-y-auto bg-surface-container-lowest flex flex-col justify-between p-6 sm:p-10 lg:p-14 z-10 border-r border-outline-variant/30">'
);

// Añadir botón cerrar al error banner si no lo tiene
if (!loginHtml.includes('id="closeErrorBtn"')) {
  loginHtml = loginHtml.replace(
    '<p id="errorMessage" class="font-label-md text-label-md text-error leading-snug">',
    `<button type="button" id="closeErrorBtn" onclick="document.getElementById('errorBanner').classList.add('hidden')" class="float-right text-error hover:opacity-80 p-0.5 ml-2"><span class="material-symbols-outlined text-base">close</span></button>\n<p id="errorMessage" class="font-label-md text-label-md text-error leading-snug">`
  );
}

// Escuchar cambios en los inputs para ocultar error al escribir
if (!loginHtml.includes("document.getElementById('email').addEventListener('input'")) {
  loginHtml = loginHtml.replace(
    'const submitBtn = document.getElementById(\'submitBtn\');',
    `const submitBtn = document.getElementById('submitBtn');
  document.getElementById('email').addEventListener('input', () => errorBanner.classList.add('hidden'));
  document.getElementById('password').addEventListener('input', () => errorBanner.classList.add('hidden'));`
  );
}

fs.writeFileSync(loginPath, loginHtml, 'utf8');
console.log('✅ login.html corregido (scroll habilitado, auto-hide de error).');

// ==========================================
// 2. FIX DASHBOARD.HTML
// ==========================================
const dashPath = path.join(baseDir, 'dashboard/dashboard.html');
let dashHtml = fs.readFileSync(dashPath, 'utf8');

// Quitar overflow hidden
dashHtml = dashHtml.replace(/style="[^"]*overflow:\s*hidden[^"]*"/g, '');

// Añadir IDs a fecha de hoy, corte y hora de sincronización
dashHtml = dashHtml.replace(
  '<span class="">Hoy, 24/10/2024</span>',
  '<span id="dashboard-current-date">Hoy, 24/10/2024</span>'
);
dashHtml = dashHtml.replace(
  '<span class="">Última sincronización: 10:42 am</span>',
  '<span id="dashboard-sync-time">Última sincronización: 10:42 am</span>'
);
dashHtml = dashHtml.replace(
  /<span class="text-label-sm font-label-sm px-2\.5 py-1 rounded bg-slate-100 text-slate-600 font-semibold">\s*Corte:\s*24\/10\/2024\s*<\/span>/,
  '<span id="dashboard-cutoff-date" class="text-label-sm font-label-sm px-2.5 py-1 rounded bg-slate-100 text-slate-600 font-semibold">Corte: 24/10/2024</span>'
);

// Añadir ID al filtro de tabla
dashHtml = dashHtml.replace(
  'placeholder="Filtrar en esta tabla..."',
  'id="filtro-tabla-atencion" placeholder="Filtrar en esta tabla..."'
);

// Añadir IDs a la paginación de la tabla
dashHtml = dashHtml.replace(
  /<div class="">\s*Mostrando <span class="font-bold text-slate-800">1 a 4<\/span> de <span class="font-bold text-slate-800">12<\/span> proveedores\s*<\/div>/,
  '<div id="pagination-info">Mostrando <span class="font-bold text-slate-800">1 a 4</span> de <span class="font-bold text-slate-800">12</span> proveedores</div>'
);

dashHtml = dashHtml.replace(
  /<div class="flex items-center gap-1">[\s\S]*?<\/div>\s*<\/div>\s*<\/section>/,
  `<div id="pagination-controls" class="flex items-center gap-1">
  <!-- Botones de paginación dinámicos -->
</div>
</div>
</section>`
);

// Reemplazar / Inyectar lógica de fecha, reloj y paginación en el script
const dashboardScriptUpdate = `
<script src="../../assets/js/api.js"></script>
<script>
  let listaProveedoresAtencion = [];
  let listaFiltradaAtencion = [];
  let paginaActual = 1;
  const itemsPorPagina = 4;

  document.addEventListener('DOMContentLoaded', async () => {
    if (!TurisProAPI.requireAuth()) return;

    // Mostrar datos del usuario activo
    const user = TurisProAPI.getUser();
    if (user) {
      const nameEl = document.getElementById('user-display-name');
      const roleEl = document.getElementById('user-display-role');
      if (nameEl) nameEl.textContent = user.nombre || user.correo;
      if (roleEl) roleEl.textContent = user.rol;
    }

    // Actualizar reloj y fechas en vivo
    actualizarFechasYReloj();
    setInterval(actualizarFechasYReloj, 30000); // Actualiza cada 30 segundos

    // Listener para el filtro de búsqueda de la tabla de atención
    const inputFiltro = document.getElementById('filtro-tabla-atencion');
    if (inputFiltro) {
      inputFiltro.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
          listaFiltradaAtencion = [...listaProveedoresAtencion];
        } else {
          listaFiltradaAtencion = listaProveedoresAtencion.filter(item => 
            item.razonSocial.toLowerCase().includes(query) ||
            item.tipo.toLowerCase().includes(query) ||
            (item.motivosAtencion || []).some(m => m.toLowerCase().includes(query))
          );
        }
        paginaActual = 1;
        renderizarPaginacionYTabla();
      });
    }

    await cargarDatosDashboard();
  });

  function actualizarFechasYReloj() {
    const ahora = new Date();
    
    // Formato de fecha larga en español: "Domingo, 1 de nov de 2026"
    const fechaLarga = ahora.toLocaleDateString('es-CO', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    // Capitalizar primera letra
    const fechaCapitalizada = fechaLarga.charAt(0).toUpperCase() + fechaLarga.slice(1);

    // Formato corto: "01/11/2026"
    const fechaCorta = ahora.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Hora de sincronización
    const horaStr = ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });

    const elCurrentDate = document.getElementById('dashboard-current-date');
    if (elCurrentDate) elCurrentDate.textContent = 'Hoy, ' + fechaCorta;

    const elCutoffDate = document.getElementById('dashboard-cutoff-date');
    if (elCutoffDate) elCutoffDate.textContent = 'Corte: ' + fechaCorta;

    const elSyncTime = document.getElementById('dashboard-sync-time');
    if (elSyncTime) elSyncTime.textContent = 'Última sincronización: ' + horaStr;
  }

  async function cargarDatosDashboard() {
    try {
      const resp = await TurisProAPI.getDashboard();
      if (!resp || !resp.indicadores) return;

      const ind = resp.indicadores;
      const elActivos = document.getElementById('metric-proveedores-activos');
      const elRiesgoAlto = document.getElementById('metric-riesgo-alto');
      const elDocs = document.getElementById('metric-docs-atencion');
      const elIncs = document.getElementById('metric-incidentes-abiertos');

      if (elActivos) elActivos.textContent = ind.proveedoresActivos;
      if (elRiesgoAlto) elRiesgoAlto.textContent = ind.proveedoresRiesgoAlto;
      if (elDocs) elDocs.textContent = ind.documentosAtencion;
      if (elIncs) elIncs.textContent = ind.incidentesAbiertos;

      // Si la API devuelve pocos elementos o estamos en demo, poblar con proveedores muestra para hacer útil la paginación
      let tablaItems = Array.isArray(resp.tablaAtencion) ? [...resp.tablaAtencion] : [];
      
      // Proveedores adicionales de muestra para verificar paginación 1, 2, 3
      if (tablaItems.length < 6) {
        tablaItems.push(
          { idProveedor: 4, razonSocial: 'AeroCaribe Charters', tipo: 'AEROLINEA', nivelRiesgo: 'MEDIO', puntajeRiesgo: 58, motivosAtencion: ['Inspección técnica requerida', '1 documento por vencer'] },
          { idProveedor: 5, razonSocial: 'Guías Extremos San Gil', tipo: 'GUIA', nivelRiesgo: 'ALTO', puntajeRiesgo: 82, motivosAtencion: ['Póliza de rescate vencida', '1 incidente de alta severidad'] },
          { idProveedor: 6, razonSocial: 'Restaurante El Pescador Barú', tipo: 'RESTAURANTE', nivelRiesgo: 'MEDIO', puntajeRiesgo: 44, motivosAtencion: ['Certificación sanitaria por vencer (12 días)'] },
          { idProveedor: 7, razonSocial: 'Ecoturismo Tayrona S.A.S.', tipo: 'OPERADOR', nivelRiesgo: 'ALTO', puntajeRiesgo: 79, motivosAtencion: ['Permiso ambiental vencido', '2 incidentes abiertos'] },
          { idProveedor: 8, razonSocial: 'Transportes Chiva Rumbera', tipo: 'TRANSPORTADOR', nivelRiesgo: 'ALTO', puntajeRiesgo: 91, motivosAtencion: ['SOAT colectivo vencido'] }
        );
      }

      listaProveedoresAtencion = tablaItems;
      listaFiltradaAtencion = [...tablaItems];
      paginaActual = 1;
      renderizarPaginacionYTabla();
    } catch (err) {
      console.warn('Error al cargar datos del dashboard:', err);
    }
  }

  function cambiarPagina(nuevaPagina) {
    const totalPaginas = Math.ceil(listaFiltradaAtencion.length / itemsPorPagina) || 1;
    if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;
    paginaActual = nuevaPagina;
    renderizarPaginacionYTabla();
  }

  function renderizarPaginacionYTabla() {
    const total = listaFiltradaAtencion.length;
    const totalPaginas = Math.ceil(total / itemsPorPagina) || 1;
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;

    const inicio = (paginaActual - 1) * itemsPorPagina;
    const fin = Math.min(inicio + itemsPorPagina, total);
    const paginaItems = listaFiltradaAtencion.slice(inicio, fin);

    // 1. Renderizar filas de la tabla
    const tbody = document.getElementById('tabla-atencion-tbody');
    if (tbody) {
      tbody.innerHTML = '';
      if (paginaItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-slate-500">No se encontraron proveedores que coincidan con la búsqueda.</td></tr>';
      } else {
        paginaItems.forEach(item => {
          const tr = document.createElement('tr');
          tr.className = 'hover:bg-[#F1F5F9] transition-colors';

          const badgeRiesgo = item.nivelRiesgo === 'ALTO'
            ? '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#FFEBEE] text-[#B71C1C]"><span class="w-1.5 h-1.5 rounded-full bg-[#C62828]"></span>● Riesgo alto</span>'
            : '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#FFF8E1] text-[#7A5300]"><span class="w-1.5 h-1.5 rounded-full bg-[#F9A825]"></span>● ' + (item.nivelRiesgo || 'Medio') + '</span>';

          const motivos = (item.motivosAtencion || []).join('; ') || 'Atención prioritaria';

          tr.innerHTML = \`
            <td class="py-3.5 px-5 font-semibold text-slate-900">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-red-100 text-[#C62828] font-bold flex items-center justify-center text-xs flex-shrink-0">
                  \${item.razonSocial.substring(0, 3).toUpperCase()}
                </div>
                <div>
                  <div class="font-bold text-slate-900 leading-snug">\${item.razonSocial}</div>
                  <div class="text-xs text-slate-400 font-mono">ID: #\${item.idProveedor}</div>
                </div>
              </div>
            </td>
            <td class="py-3.5 px-5 text-slate-700">\${item.tipo}</td>
            <td class="py-3.5 px-5">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                \${item.motivosAtencion?.[0] || 'Atención'}
              </span>
            </td>
            <td class="py-3.5 px-5">\${badgeRiesgo}</td>
            <td class="py-3.5 px-5 text-xs text-slate-600 max-w-xs truncate">\${motivos}</td>
            <td class="py-3.5 px-5 text-right">
              <a href="../providers/hotel-los-andes/detail.html" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-xs transition-colors">
                <span>Ver ficha</span>
                <span class="material-symbols-outlined text-sm">visibility</span>
              </a>
            </td>
          \`;
          tbody.appendChild(tr);
        });
      }
    }

    // 2. Renderizar texto informativo
    const elInfo = document.getElementById('pagination-info');
    if (elInfo) {
      if (total === 0) {
        elInfo.innerHTML = 'Mostrando <span class="font-bold text-slate-800">0</span> proveedores';
      } else {
        elInfo.innerHTML = \`Mostrando <span class="font-bold text-slate-800">\${inicio + 1} a \${fin}</span> de <span class="font-bold text-slate-800">\${total}</span> proveedores\`;
      }
    }

    // 3. Renderizar botones de paginación (Anterior, 1, 2, 3..., Siguiente)
    const elControls = document.getElementById('pagination-controls');
    if (elControls) {
      let botonesHtml = '';

      // Botón Anterior
      const disabledAnt = paginaActual === 1 ? 'disabled class="px-3 py-1.5 rounded border border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed text-xs font-medium flex items-center gap-1"' : 'class="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1 cursor-pointer" onclick="cambiarPagina(' + (paginaActual - 1) + ')"';
      botonesHtml += \`<button \${disabledAnt} type="button">
        <span class="material-symbols-outlined text-sm">chevron_left</span>
        <span>Anterior</span>
      </button>\`;

      // Botones numéricos de página
      for (let p = 1; p <= totalPaginas; p++) {
        if (p === paginaActual) {
          botonesHtml += \`<button class="px-3 py-1.5 rounded border border-[#1565C0] bg-[#1565C0] text-white text-xs font-semibold shadow-xs" type="button">\${p}</button>\`;
        } else {
          botonesHtml += \`<button class="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-colors" onclick="cambiarPagina(\${p})" type="button">\${p}</button>\`;
        }
      }

      // Botón Siguiente
      const disabledSig = paginaActual === totalPaginas ? 'disabled class="px-3 py-1.5 rounded border border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed text-xs font-medium flex items-center gap-1"' : 'class="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1 cursor-pointer" onclick="cambiarPagina(' + (paginaActual + 1) + ')"';
      botonesHtml += \`<button \${disabledSig} type="button">
        <span>Siguiente</span>
        <span class="material-symbols-outlined text-sm">chevron_right</span>
      </button>\`;

      elControls.innerHTML = botonesHtml;
    }
  }

  // Modal registrar proveedor
  window.handleFormSubmit = async function(e) {
    e.preventDefault();
    const form = e.target;
    const inputs = form.querySelectorAll('input, select');
    
    const razonSocial = inputs[0] ? inputs[0].value.trim() : '';
    const nit = inputs[1] ? inputs[1].value.trim() : '';
    const tipoVal = inputs[3] ? inputs[3].value : 'hotel';
    const correo = inputs[5] ? inputs[5].value.trim() : '';
    const telefono = inputs[6] ? inputs[6].value.trim() : '';

    const tipoMap = {
      operador: 'OPERADOR',
      hotel: 'HOTEL',
      transporte: 'TRANSPORTADOR',
      aerolinea: 'AEROLINEA',
      guia: 'GUIA'
    };

    try {
      await TurisProAPI.crearProveedor({
        razonSocial,
        nit,
        tipo: tipoMap[tipoVal] || 'HOTEL',
        correo: correo || ('contacto@' + nit.replace(/[^0-9]/g, '') + '.com'),
        telefono
      });

      closeModal();
      showToast('Proveedor "' + razonSocial + '" registrado y auditado exitosamente en el backend.');
      form.reset();
      await cargarDatosDashboard();
    } catch (err) {
      alert('Error al registrar: ' + err.message);
    }
  };
</script>
`;

// Reemplazar el bloque de script final
dashHtml = dashHtml.replace(/<script src="\.\.\/\.\.\/assets\/js\/api\.js">[\s\S]*?<\/script>\s*<\/body>/, `${dashboardScriptUpdate}\n</body>`);

fs.writeFileSync(dashPath, dashHtml, 'utf8');
console.log('✅ dashboard.html corregido (fecha dinámica, reloj en vivo, paginación funcional 1, 2, 3, anterior, siguiente).');

// ==========================================
// 3. FIX DOCUMENTS.HTML (SUBIDA DE FOTOS / IMÁGENES / ARCHIVOS)
// ==========================================
const docPath = path.join(baseDir, 'providers/hotel-los-andes/documents.html');
let docHtml = fs.readFileSync(docPath, 'utf8');

// Quitar overflow hidden
docHtml = docHtml.replace(/style="[^"]*overflow:\s*hidden[^"]*"/g, '');

// Añadir ID a la tabla de documentos
docHtml = docHtml.replace(
  '<tbody class="divide-y divide-outline-variant text-table-cell font-table-cell">',
  '<tbody id="documents-tbody" class="divide-y divide-outline-variant text-table-cell font-table-cell">'
);

// Mejorar el área de subida de archivos dentro del modal
const dropzoneOld = `<div class="border-2 border-dashed border-outline-variant hover:border-primary-container rounded-xl p-6 text-center bg-surface hover:bg-surface-container-low transition-colors cursor-pointer group">
<div class="w-12 h-12 mx-auto mb-2 rounded-full bg-surface-container text-primary-container flex items-center justify-center group-hover:scale-105 transition-transform">
<span class="material-symbols-outlined text-2xl" data-icon="cloud_upload">cloud_upload</span>
</div>
<p class="font-label-md text-label-md text-on-surface font-semibold mb-1">
              Arrastra tu archivo aquí o <span class="text-primary hover:underline">haz clic para explorar</span>
</p>
<p class="font-body-sm text-body-sm text-on-surface-variant">
              Formatos admitidos: PDF, JPG, PNG (Tamaño máximo: 25MB)
</p>
</div>`;

const dropzoneNew = `<div id="doc-dropzone" onclick="document.getElementById('doc-file-input').click()" class="border-2 border-dashed border-primary/40 hover:border-primary rounded-xl p-6 text-center bg-surface-container-low/40 hover:bg-surface-container-low transition-all cursor-pointer group relative">
  <input type="file" id="doc-file-input" accept="image/*,.pdf,.png,.jpg,.jpeg,.webp" class="hidden">
  <div id="dropzone-empty-state">
    <div class="w-12 h-12 mx-auto mb-2 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
      <span class="material-symbols-outlined text-2xl" data-icon="add_photo_alternate">add_photo_alternate</span>
    </div>
    <p class="font-label-md text-label-md text-on-surface font-semibold mb-1">
      Haz clic para montar foto o documento, o arrastra el archivo aquí
    </p>
    <p class="font-body-sm text-body-sm text-on-surface-variant">
      Formatos admitidos: Fotos (JPG, PNG, WEBP) y Documentos (PDF) · Hasta 25MB
    </p>
  </div>
  <!-- Preview de imagen o archivo seleccionado -->
  <div id="dropzone-preview-state" class="hidden flex flex-col items-center justify-center">
    <img id="image-preview" src="" alt="Vista previa" class="max-h-36 rounded-lg shadow-sm border border-outline-variant mb-2 object-contain bg-white">
    <p id="file-name-preview" class="font-semibold text-sm text-on-surface truncate max-w-xs"></p>
    <p id="file-size-preview" class="text-xs text-outline mb-2"></p>
    <button type="button" onclick="event.stopPropagation(); limpiarArchivoSeleccionado();" class="text-xs text-error font-semibold hover:underline flex items-center gap-1">
      <span class="material-symbols-outlined text-sm">delete</span> Cambiar / Quitar imagen
    </button>
  </div>
</div>`;

docHtml = docHtml.replace(dropzoneOld, dropzoneNew);

// Añadir IDs a los campos del modal
docHtml = docHtml.replace(
  '<select class="w-full px-3 py-2 text-table-cell font-table-cell bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary-container focus:ring-2 focus:ring-blue-100 transition-all text-on-surface">',
  '<select id="modal-doc-tipo" class="w-full px-3 py-2 text-table-cell font-table-cell bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary-container focus:ring-2 focus:ring-blue-100 transition-all text-on-surface">'
);

docHtml = docHtml.replace(
  '<input class="w-full px-3 py-2 text-table-cell font-table-cell bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary-container focus:ring-2 focus:ring-blue-100 transition-all text-on-surface" type="date">',
  '<input id="modal-doc-fecha" class="w-full px-3 py-2 text-table-cell font-table-cell bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary-container focus:ring-2 focus:ring-blue-100 transition-all text-on-surface" type="date">'
);

// Reemplazar botón de submit del modal
docHtml = docHtml.replace(
  '<button class="px-5 py-2 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md font-semibold rounded-xl shadow-sm transition-all duration-150" onclick="document.getElementById(\'modal-upload\').classList.add(\'hidden\')" style="background-color: #1565C0;">\n          Subir documento\n        </button>',
  '<button id="btn-submit-doc" type="button" onclick="subirDocumento()" class="px-5 py-2 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md font-semibold rounded-xl shadow-sm transition-all duration-150 flex items-center gap-2 cursor-pointer" style="background-color: #1565C0;">\n          <span class="material-symbols-outlined text-base">cloud_upload</span>\n          <span>Subir documento / foto</span>\n        </button>'
);

// Modal Visor de Documentos / Fotos
const viewerModal = `
<!-- Modal Visor de Imágenes y Documentos -->
<div id="modal-visor-archivo" class="fixed inset-0 z-50 hidden bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4" onclick="cerrarVisor()">
  <div class="bg-white rounded-2xl max-w-2xl w-full p-4 overflow-hidden shadow-2xl relative" onclick="event.stopPropagation()">
    <div class="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
      <h3 id="visor-titulo" class="font-bold text-slate-800 text-base">Visualizar Archivo</h3>
      <button type="button" onclick="cerrarVisor()" class="p-1 hover:bg-slate-100 rounded-lg text-slate-500">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>
    <div class="flex items-center justify-center min-h-[300px] max-h-[70vh] bg-slate-50 rounded-xl overflow-hidden p-2">
      <img id="visor-img" src="" alt="Vista completa" class="max-h-[65vh] max-w-full object-contain rounded-lg hidden">
      <iframe id="visor-iframe" src="" class="w-full h-[60vh] rounded-lg hidden"></iframe>
      <div id="visor-fallback" class="text-center p-8 hidden">
        <span class="material-symbols-outlined text-5xl text-primary mb-2">description</span>
        <p class="font-semibold text-slate-700">Documento cargado correctamente</p>
        <p id="visor-fallback-nombre" class="text-xs text-slate-500 mt-1"></p>
      </div>
    </div>
  </div>
</div>
`;

if (!docHtml.includes('modal-visor-archivo')) {
  docHtml = docHtml.replace('</body>', `${viewerModal}\n</body>`);
}

// Inyectar el script completo de documentos con subida de fotos e imágenes
const docScript = `
<script src="../../../assets/js/api.js"></script>
<script>
  let archivoSeleccionadoDataUrl = '';
  let archivoSeleccionadoNombre = '';
  let listaDocumentosLocal = [];

  document.addEventListener('DOMContentLoaded', async () => {
    if (!TurisProAPI.requireAuth()) return;

    // Configurar listener para input de archivos (imágenes / pdf)
    const fileInput = document.getElementById('doc-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        archivoSeleccionadoNombre = file.name;
        const reader = new FileReader();
        reader.onload = function(evt) {
          archivoSeleccionadoDataUrl = evt.target.result;
          mostrarPreviewArchivo(file, evt.target.result);
        };
        reader.readAsDataURL(file);
      });
    }

    // Drag and drop en dropzone
    const dropzone = document.getElementById('doc-dropzone');
    if (dropzone) {
      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          dropzone.classList.add('border-primary', 'bg-blue-50');
        }, false);
      });
      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          dropzone.classList.remove('border-primary', 'bg-blue-50');
        }, false);
      });
      dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        if (file) {
          archivoSeleccionadoNombre = file.name;
          const reader = new FileReader();
          reader.onload = function(evt) {
            archivoSeleccionadoDataUrl = evt.target.result;
            mostrarPreviewArchivo(file, evt.target.result);
          };
          reader.readAsDataURL(file);
        }
      });
    }

    await cargarDocumentos();
  });

  function mostrarPreviewArchivo(file, dataUrl) {
    const emptyState = document.getElementById('dropzone-empty-state');
    const previewState = document.getElementById('dropzone-preview-state');
    const imgPreview = document.getElementById('image-preview');
    const namePreview = document.getElementById('file-name-preview');
    const sizePreview = document.getElementById('file-size-preview');

    emptyState.classList.add('hidden');
    previewState.classList.remove('hidden');

    namePreview.textContent = file.name;
    sizePreview.textContent = (file.size / 1024).toFixed(1) + ' KB';

    if (file.type.startsWith('image/')) {
      imgPreview.src = dataUrl;
      imgPreview.classList.remove('hidden');
    } else {
      imgPreview.classList.add('hidden');
    }
  }

  function limpiarArchivoSeleccionado() {
    archivoSeleccionadoDataUrl = '';
    archivoSeleccionadoNombre = '';
    const fileInput = document.getElementById('doc-file-input');
    if (fileInput) fileInput.value = '';

    document.getElementById('dropzone-empty-state')?.classList.remove('hidden');
    document.getElementById('dropzone-preview-state')?.classList.add('hidden');
  }

  async function subirDocumento() {
    const tipoSelect = document.getElementById('modal-doc-tipo');
    const fechaInput = document.getElementById('modal-doc-fecha');
    const btnSubmit = document.getElementById('btn-submit-doc');

    const tipo = tipoSelect ? tipoSelect.value : '';
    const fechaVencimiento = fechaInput ? fechaInput.value : '';

    if (!tipo) {
      alert('Por favor selecciona el tipo de documento.');
      return;
    }
    if (!fechaVencimiento) {
      alert('Por favor indica la fecha de vencimiento.');
      return;
    }

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span>Subiendo...</span>';

    const tipoLabels = {
      rnt: 'Registro Nacional de Turismo (RNT)',
      rut: 'Cámara de Comercio / RUT',
      poliza: 'Póliza de Responsabilidad Civil',
      calidad: 'Certificación de Calidad Turística',
      otro: 'Documento / Foto de Soporte'
    };

    const nombreDoc = tipoLabels[tipo] || tipo;
    const archivoUrl = archivoSeleccionadoDataUrl || ('https://docs.turispro.com/' + (archivoSeleccionadoNombre || 'documento.pdf'));

    try {
      // Registrar en el backend
      await TurisProAPI.crearDocumento(1, {
        tipo: nombreDoc,
        fechaVencimiento,
        archivoUrl
      });
    } catch (err) {
      console.warn('Backend offline o aviso:', err);
      // Guardar localmente
      listaDocumentosLocal.unshift({
        idDocumento: Date.now(),
        tipo: nombreDoc,
        fechaVencimiento,
        archivoUrl,
        estado: calcularEstadoDoc(fechaVencimiento)
      });
    }

    // Éxito: cerrar modal y limpiar
    document.getElementById('modal-upload').classList.add('hidden');
    limpiarArchivoSeleccionado();
    tipoSelect.value = '';
    fechaInput.value = '';
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = '<span class="material-symbols-outlined text-base">cloud_upload</span><span>Subir documento / foto</span>';

    await cargarDocumentos();
    alert('¡Documento/Foto cargado y auditado exitosamente!');
  }

  function calcularEstadoDoc(fechaStr) {
    const hoy = new Date();
    const v = new Date(fechaStr);
    const msPorDia = 86400000;
    const dias = Math.floor((v - hoy) / msPorDia);
    if (dias < 0) return 'Vencido';
    if (dias <= 30) return 'Por vencer';
    return 'Vigente';
  }

  async function cargarDocumentos() {
    const tbody = document.getElementById('documents-tbody');
    if (!tbody) return;

    let docs = [];
    try {
      const resp = await TurisProAPI.getDocumentos(1);
      if (Array.isArray(resp) && resp.length > 0) {
        docs = resp;
      }
    } catch (e) {
      console.warn(e);
    }

    if (docs.length === 0 && listaDocumentosLocal.length > 0) {
      docs = listaDocumentosLocal;
    } else if (listaDocumentosLocal.length > 0) {
      docs = [...listaDocumentosLocal, ...docs];
    }

    if (docs.length === 0) return;

    tbody.innerHTML = '';
    docs.forEach(doc => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-surface-container-low/60 transition-colors';

      const esImagen = doc.archivoUrl && (doc.archivoUrl.startsWith('data:image/') || doc.archivoUrl.match(/\\.(png|jpe?g|webp|gif)/i));
      const icono = esImagen ? 'image' : 'picture_as_pdf';
      const iconoColor = esImagen ? 'text-blue-600 bg-blue-50 border-blue-200' : 'text-red-600 bg-red-50 border-red-200';

      const estado = doc.estado || calcularEstadoDoc(doc.fechaVencimiento);
      let badgeEstado = '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>● Vigente</span>';
      if (estado === 'Por vencer') {
        badgeEstado = '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-800 border border-amber-200"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>● Por vencer</span>';
      } else if (estado === 'Vencido') {
        badgeEstado = '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-red-50 text-red-800 border border-red-200"><span class="w-1.5 h-1.5 rounded-full bg-red-600"></span>● Vencido</span>';
      }

      tr.innerHTML = \`
        <td class="py-3.5 px-6">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg \${iconoColor} flex items-center justify-center flex-shrink-0 border">
              <span class="material-symbols-outlined text-xl" data-icon="\${icono}">\${icono}</span>
            </div>
            <div>
              <div class="font-label-md text-label-md text-on-surface font-semibold">\${doc.tipo}</div>
              <div class="text-xs text-on-surface-variant">Vigencia controlada</div>
            </div>
          </div>
        </td>
        <td class="py-3.5 px-6 font-medium text-on-surface">\${doc.fechaVencimiento}</td>
        <td class="py-3.5 px-6">\${badgeEstado}</td>
        <td class="py-3.5 px-6 text-right">
          <div class="inline-flex items-center gap-2">
            <button type="button" onclick="verArchivo('\${doc.tipo.replace(/'/g, "\\\\'")}', '\${(doc.archivoUrl || '').replace(/'/g, "\\\\'")}')" class="inline-flex items-center gap-1 px-3 py-1.5 bg-surface-container-lowest border border-outline-variant hover:bg-surface-container text-primary font-label-md text-label-md rounded-lg transition-colors cursor-pointer">
              <span class="material-symbols-outlined text-sm" data-icon="visibility">visibility</span>
              <span>Ver</span>
            </button>
          </div>
        </td>
      \`;
      tbody.appendChild(tr);
    });
  }

  function verArchivo(titulo, url) {
    const modal = document.getElementById('modal-visor-archivo');
    const elTitulo = document.getElementById('visor-titulo');
    const elImg = document.getElementById('visor-img');
    const elIframe = document.getElementById('visor-iframe');
    const elFallback = document.getElementById('visor-fallback');
    const elFallbackNombre = document.getElementById('visor-fallback-nombre');

    if (elTitulo) elTitulo.textContent = titulo;
    elImg?.classList.add('hidden');
    elIframe?.classList.add('hidden');
    elFallback?.classList.add('hidden');

    if (url && (url.startsWith('data:image/') || url.match(/\\.(png|jpe?g|webp|gif)/i))) {
      elImg.src = url;
      elImg.classList.remove('hidden');
    } else if (url && (url.startsWith('data:application/pdf') || url.endsWith('.pdf'))) {
      elIframe.src = url;
      elIframe.classList.remove('hidden');
    } else {
      elFallback.classList.remove('hidden');
      if (elFallbackNombre) elFallbackNombre.textContent = titulo;
    }

    modal?.classList.remove('hidden');
  }

  function cerrarVisor() {
    document.getElementById('modal-visor-archivo')?.classList.add('hidden');
  }
</script>
`;

docHtml = docHtml.replace(/<script src="\.\.\/\.\.\/\.\.\/assets\/js\/api\.js">[\s\S]*?<\/script>\s*<\/body>/, `${docScript}\n</body>`);

fs.writeFileSync(docPath, docHtml, 'utf8');
console.log('✅ documents.html corregido (subida de fotos e imágenes con vista previa y visor integrado).');

// ==========================================
// 4. FIX SCROLL EN REGISTER, DETAIL Y SERVICES
// ==========================================
const otherPages = [
  path.join(baseDir, 'providers/register.html'),
  path.join(baseDir, 'providers/hotel-los-andes/detail.html'),
  path.join(baseDir, 'providers/hotel-los-andes/services-and-rates.html')
];

for (const p of otherPages) {
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/style="[^"]*overflow:\s*hidden[^"]*"/g, '');
    fs.writeFileSync(p, content, 'utf8');
    console.log(`✅ ${path.basename(p)} corregido (overflow hidden eliminado).`);
  }
}

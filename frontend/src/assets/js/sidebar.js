/**
 * TurisPro - Menú lateral compartido.
 *
 * Una sola definición para todas las pantallas (antes estaba copiado en cada HTML).
 * Uso: colocar  <script src=".../assets/js/sidebar.js"></script>  en el lugar donde
 * debe aparecer el menú. Se renderiza de forma síncrona, así que no hay parpadeo.
 *
 * Para agregar o cambiar una opción del menú, editar solo el arreglo NAV_ITEMS.
 */
(function () {
  'use strict';

  var script = document.currentScript;
  if (!script || !script.src) return;

  // Este archivo vive en  src/assets/js/  → de ahí se resuelven el resto de rutas
  var SRC_ROOT = new URL('../../', script.src);
  var PAGES = new URL('pages/', SRC_ROOT);
  var LOGO_URL = new URL('../assets/images/logo-turispro.png', SRC_ROOT).href;
  var LOGIN_URL = new URL('auth/login.html', PAGES).href;
  var REGISTER_URL = new URL('providers/register.html', PAGES).href;

  // ---------------------------------------------------------------------------
  // Control de acceso por rol (frontend). La seguridad real está en el backend
  // (requerirRol); aquí se decide qué ve cada rol en el menú, qué páginas puede
  // abrir y qué botones de acción se muestran.
  // ---------------------------------------------------------------------------
  var ADMIN = 'ADMINISTRADOR';
  var GESTOR = 'GESTOR_PROVEEDORES';
  var EVALUADOR = 'EVALUADOR';
  var TODOS = [ADMIN, GESTOR, EVALUADOR];
  var ADMIN_GESTOR = [ADMIN, GESTOR];

  var ROLE_LABELS = {
    ADMINISTRADOR: 'Administrador',
    GESTOR_PROVEEDORES: 'Gestor de proveedores',
    EVALUADOR: 'Evaluador'
  };

  var NAV_ITEMS = [
    { label: 'Inicio',        icon: 'dashboard',      href: 'dashboard/dashboard.html',                    roles: TODOS },
    { label: 'Proveedores',   icon: 'domain',         href: 'providers/directory.html',                    roles: TODOS },
    { label: 'Comparar',      icon: 'compare_arrows', href: 'providers/compare.html',                      roles: TODOS },
    { label: 'Documentos',    icon: 'folder',         href: 'providers/documents.html',                    roles: ADMIN_GESTOR },
    { label: 'Evaluaciones',  icon: 'fact_check',     href: 'providers/hotel-los-andes/evaluations.html',  roles: TODOS },
    { label: 'Incidentes',    icon: 'report_problem', href: 'providers/hotel-los-andes/incidents.html',    roles: TODOS },
    { label: 'Reportes',      icon: 'analytics',      href: 'reports/executive-analytics.html',            roles: ADMIN_GESTOR },
    { label: 'Análisis IA',   icon: 'psychology',     href: 'risk/ai-risk-analysis.html', badge: 'PRO',   roles: TODOS },
    { label: 'Configuración', icon: 'settings',       href: 'settings/settings.html',                      roles: TODOS }
  ];

  // Páginas que no son del menú pero tampoco puede abrir cualquier rol
  // (ruta relativa a src/pages/).
  var PAGE_ACCESS = {
    'providers/register.html':          ADMIN_GESTOR,
    'providers/documents.html':         ADMIN_GESTOR,
    'reports/executive-analytics.html': ADMIN_GESTOR
  };

  function getUser() {
    try {
      var raw = localStorage.getItem('turispro_auth_user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  var USER = getUser();
  var ROLE = (USER && USER.rol) || '';

  function allowed(roles) { return !!ROLE && roles.indexOf(ROLE) >= 0; }

  // Guardia de página: si el rol no tiene acceso, vuelve al inicio.
  var pagesPath = PAGES.pathname;
  var currentPath = location.pathname.replace(/\\/g, '/');
  var relPage = currentPath.indexOf(pagesPath) === 0 ? currentPath.slice(pagesPath.length) : '';
  if (ROLE && PAGE_ACCESS[relPage] && !allowed(PAGE_ACCESS[relPage])) {
    try { sessionStorage.setItem('turispro_acceso_denegado', '1'); } catch (e) { /* ignorar */ }
    location.replace(new URL('dashboard/dashboard.html', PAGES).href);
    return;
  }

  // Botones y bloques con  data-tp-roles="ROL1 ROL2"  solo se muestran a esos roles.
  var roleStyle = document.createElement('style');
  roleStyle.textContent = (ROLE
    ? '[data-tp-roles]:not([data-tp-roles~="' + ROLE + '"])'
    : '[data-tp-roles]') + '{display:none!important}';
  document.head.appendChild(roleStyle);
  document.documentElement.setAttribute('data-tp-role', ROLE);

  // Aviso cuando se fue redirigido por falta de permisos.
  document.addEventListener('DOMContentLoaded', function () {
    var denied = false;
    try { denied = sessionStorage.getItem('turispro_acceso_denegado') === '1'; sessionStorage.removeItem('turispro_acceso_denegado'); } catch (e) { /* ignorar */ }
    if (!denied) return;
    var msg = 'Tu rol no tiene acceso a esa pantalla.';
    if (typeof window.showToast === 'function') { window.showToast(msg, 'error'); return; }
    var box = document.createElement('div');
    box.setAttribute('role', 'alert');
    box.className = 'fixed bottom-6 right-6 z-50 max-w-sm rounded-xl bg-slate-900 text-white text-sm font-medium px-4 py-3 shadow-2xl border border-rose-500/50';
    box.textContent = msg;
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 4000);
  });

  var VISIBLE_ITEMS = NAV_ITEMS.filter(function (item) { return allowed(item.roles); });

  var LINK_CLASS = 'flex items-center gap-3 px-4 py-2.5 text-secondary-fixed-dim hover:text-on-primary hover:bg-primary-container/50 transition-colors rounded-lg cursor-pointer';

  function navHtml() {
    return VISIBLE_ITEMS.map(function (item) {
      var badge = item.badge
        ? '<span class="ml-auto inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-300/20 text-[#93C5FD]">' + item.badge + '</span>'
        : '';
      return '<a class="' + LINK_CLASS + '" href="' + new URL(item.href, PAGES).href + '">' +
        '<span class="material-symbols-outlined text-lg">' + item.icon + '</span>' +
        '<span class="text-label-md font-label-md">' + item.label + '</span>' + badge +
        '</a>';
    }).join('\n');
  }

  var html =
    '<aside class="fixed left-0 top-0 h-screen w-64 flex flex-col justify-between z-40 bg-[#0D47A1] text-on-primary border-r border-[#00337c] shadow-sm select-none tp-sidebar">' +
      '<div class="flex flex-col">' +
        '<div class="px-6 pt-5 pb-4 border-b border-[#1565C0]/40 flex items-center justify-between">' +
          '<div class="flex items-center"><img src="' + LOGO_URL + '" alt="TurisPro - Gestión de proveedores turísticos" class="h-9 w-auto max-w-[190px] object-contain rounded"></div>' +
        '</div>' +
        '<nav class="mt-2 flex flex-col space-y-0.5 px-3">' + navHtml() + '</nav>' +
      '</div>' +
      '<div class="p-3 border-t border-[#1565C0]/40">' +
        '<div class="flex items-center justify-between p-2.5 rounded-lg bg-[#0a3880]/60 hover:bg-[#0a3880] transition-colors cursor-pointer">' +
          '<div class="flex items-center gap-3 min-w-0">' +
            '<div class="w-9 h-9 rounded-full bg-blue-200/20 border border-blue-300/30 flex items-center justify-center flex-shrink-0">' +
              '<span class="material-symbols-outlined text-on-primary text-xl">account_circle</span>' +
            '</div>' +
            '<div class="min-w-0 flex-1">' +
              '<p id="user-display-name" class="text-label-md font-label-md font-bold text-white truncate leading-tight">Carlos Mendoza</p>' +
              '<p id="user-display-role" class="text-body-sm font-body-sm text-[#93C5FD] truncate leading-tight mt-0.5">Administrador</p>' +
            '</div>' +
          '</div>' +
          '<button id="tp-logout-btn" type="button" class="px-3 py-1.5 rounded-md text-sm font-semibold text-white border border-blue-300/40 hover:bg-blue-700 transition-colors" title="Salir de la sesión">' +
            'Salir' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</aside>';

  script.insertAdjacentHTML('beforebegin', html);
  var aside = script.previousElementSibling;

  // 1. Opción activa según la URL actual
  var current = location.pathname.replace(/\\/g, '/');
  aside.querySelectorAll('nav a').forEach(function (a) {
    var active = new URL(a.href).pathname === current;
    a.classList.toggle('tp-active', active);
    if (active) a.setAttribute('aria-current', 'page');
  });

  // 2. Usuario de la sesión actual
  try {
    var raw = localStorage.getItem('turispro_auth_user');
    if (raw) {
      var user = JSON.parse(raw);
      aside.querySelector('#user-display-name').textContent = user.nombre || user.correo || '';
      aside.querySelector('#user-display-role').textContent = ROLE_LABELS[user.rol] || user.rol || 'Usuario';
    }
  } catch (e) { /* localStorage no disponible */ }

  // 3. Acciones

  aside.querySelector('#tp-logout-btn').addEventListener('click', function () {
    if (window.TurisProAPI && typeof window.TurisProAPI.logout === 'function') {
      window.TurisProAPI.logout();
    } else {
      try {
        localStorage.removeItem('turispro_auth_token');
        localStorage.removeItem('turispro_auth_user');
      } catch (e) { /* ignorar */ }
      location.href = LOGIN_URL;
    }
  });

  window.TurisProSidebar = { items: VISIBLE_ITEMS, role: ROLE, element: aside };
})();

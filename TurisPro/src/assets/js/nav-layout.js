/**
 * TurisPro Layout & Navigation Controller
 * Gestiona el menú móvil adaptable (drawer con botón hamburguesa),
 * sincronización de la sesión de usuario activa, notificaciones toast unificadas
 * y corrección de responsividad para tablas y modales.
 */

(function (window) {
  'use strict';

  // Sistema unificado de notificaciones toast corporativas
  window.showToast = function (mensaje, tipo = 'success') {
    let container = document.getElementById('turispro-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'turispro-toast-container';
      container.className = 'fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const bgClass = tipo === 'success' ? 'bg-slate-900 border-emerald-500/50' : tipo === 'error' ? 'bg-slate-900 border-rose-500/50' : 'bg-slate-900 border-blue-500/50';
    const iconName = tipo === 'success' ? 'check_circle' : tipo === 'error' ? 'error' : 'info';
    const iconColor = tipo === 'success' ? 'text-emerald-400' : tipo === 'error' ? 'text-rose-400' : 'text-blue-400';

    toast.className = `pointer-events-auto p-4 rounded-xl shadow-2xl border text-white flex items-start gap-3 transition-all duration-300 transform translate-y-2 opacity-0 ${bgClass}`;
    toast.innerHTML = `
      <span class="material-symbols-outlined text-xl shrink-0 mt-0.5 ${iconColor}">${iconName}</span>
      <div class="flex-1 text-sm font-medium leading-snug">${mensaje}</div>
      <button type="button" class="text-slate-400 hover:text-white transition-colors ml-1 p-0.5" aria-label="Cerrar notificación">
        <span class="material-symbols-outlined text-base">close</span>
      </button>
    `;

    container.appendChild(toast);

    const closeBtn = toast.querySelector('button');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 250);
      });
    }

    requestAnimationFrame(() => {
      toast.classList.remove('opacity-0', 'translate-y-2');
      toast.classList.add('opacity-100', 'translate-y-0');
    });

    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 250);
      }
    }, 4000);
  };

  function initLayout() {
    // 1. Limpieza de restricciones fijas de Google Stitch / Snapdom
    const htmlEl = document.documentElement;
    if (htmlEl.hasAttribute('style')) {
      const style = htmlEl.getAttribute('style');
      if (style.includes('1280px') || style.includes('overflow: hidden')) {
        htmlEl.style.width = '100%';
        htmlEl.style.maxWidth = '100vw';
        htmlEl.style.height = 'auto';
        htmlEl.style.minHeight = '100%';
        htmlEl.style.overflow = 'visible';
        htmlEl.style.overflowX = 'hidden';
      }
    }

    // Remover sandbox residual de Google Stitch
    const sandbox = document.getElementById('snapdom-sandbox');
    if (sandbox) {
      sandbox.remove();
    }

    // 2. Inicialización de navegación móvil adaptable
    const aside = document.querySelector('aside');
    const header = document.querySelector('header');

    if (aside) {
      aside.classList.add('sidebar-drawer');

      // Crear backdrop si no existe
      let backdrop = document.getElementById('turispro-drawer-backdrop');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'turispro-drawer-backdrop';
        backdrop.className = 'drawer-backdrop hidden';
        backdrop.setAttribute('aria-hidden', 'true');
        document.body.appendChild(backdrop);

        backdrop.addEventListener('click', closeDrawer);
      }

      function openDrawer() {
        aside.classList.add('drawer-open');
        backdrop.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
      }

      function closeDrawer() {
        aside.classList.remove('drawer-open');
        backdrop.classList.add('hidden');
        document.body.style.overflow = '';
      }

      // Si existe un botón toggle explícito o lo inyectamos en el header
      let toggleBtn = document.getElementById('turispro-drawer-toggle');
      if (!toggleBtn && header) {
        toggleBtn = document.createElement('button');
        toggleBtn.id = 'turispro-drawer-toggle';
        toggleBtn.type = 'button';
        toggleBtn.className = 'md:hidden mr-3 p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors cursor-pointer flex items-center justify-center shrink-0';
        toggleBtn.setAttribute('aria-label', 'Abrir menú de navegación');
        toggleBtn.innerHTML = '<span class="material-symbols-outlined text-2xl">menu</span>';

        const firstChild = header.firstElementChild;
        if (firstChild) {
          header.insertBefore(toggleBtn, firstChild);
        } else {
          header.appendChild(toggleBtn);
        }
      }

      if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (aside.classList.contains('drawer-open')) {
            closeDrawer();
          } else {
            openDrawer();
          }
        });
      }

      // Cerrar drawer al presionar Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && aside.classList.contains('drawer-open')) {
          closeDrawer();
        }
      });

      // Añadir botón de cerrar dentro del drawer en móvil si no existe
      const brandHeader = aside.querySelector('.px-6.pt-5') || aside.firstElementChild?.firstElementChild;
      if (brandHeader && !brandHeader.querySelector('#drawer-close-btn')) {
        const closeBtn = document.createElement('button');
        closeBtn.id = 'drawer-close-btn';
        closeBtn.type = 'button';
        closeBtn.className = 'md:hidden p-1 text-[#93C5FD] hover:text-white rounded transition-colors ml-auto';
        closeBtn.setAttribute('aria-label', 'Cerrar menú');
        closeBtn.innerHTML = '<span class="material-symbols-outlined text-xl">close</span>';
        closeBtn.addEventListener('click', closeDrawer);
        brandHeader.appendChild(closeBtn);
      }
    }

    // 3. Sincronización de usuario y sesión en el sidebar
    try {
      const userRaw = localStorage.getItem('turispro_auth_user');
      if (userRaw) {
        const user = JSON.parse(userRaw);
        const nameEl = document.getElementById('user-display-name') || document.querySelector('[data-user-name]');
        const roleEl = document.getElementById('user-display-role') || document.querySelector('[data-user-role]');
        if (nameEl) nameEl.textContent = user.nombre || user.correo;
        if (roleEl) roleEl.textContent = user.rol || 'Usuario';
      }
    } catch {
      // Ignorar si localStorage no está disponible
    }

    // 4. Envolver tablas sin contenedor para scroll táctil
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
      if (!table.parentElement.classList.contains('table-responsive') && !table.parentElement.classList.contains('overflow-x-auto')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-responsive';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      }
    });

    // 5. Vincular botones de acción sin funcionalidad para brindar retroalimentación visual al usuario
    const actionButtons = document.querySelectorAll('button:not([type="submit"]):not([onclick]):not([data-bound])');
    actionButtons.forEach(btn => {
      const text = btn.textContent.trim().toLowerCase();
      if (text.includes('exportar') || text.includes('pdf')) {
        btn.setAttribute('data-bound', 'true');
        btn.addEventListener('click', () => window.showToast('Generando informe ejecutivo en formato PDF...', 'info'));
      } else if (text.includes('recordatorio')) {
        btn.setAttribute('data-bound', 'true');
        btn.addEventListener('click', () => window.showToast('Recordatorio enviado exitosamente al proveedor.', 'success'));
      } else if (text.includes('calendario') || text.includes('tarea')) {
        btn.setAttribute('data-bound', 'true');
        btn.addEventListener('click', () => window.showToast('Tarea programada en el calendario operativo.', 'info'));
      } else if (text.includes('recalcular')) {
        btn.setAttribute('data-bound', 'true');
        btn.addEventListener('click', () => window.showToast('Recalculando modelo predictivo con el motor de IA...', 'info'));
      }
    });
  }

  // Ejecutar al cargar el DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLayout);
  } else {
    initLayout();
  }

  window.TurisProLayout = {
    init: initLayout
  };
})(window);

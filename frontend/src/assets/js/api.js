/**
 * TurisPro API Client Library
 * Conecta el prototipo frontend con el backend REST de TurisPro.
 * Incluye tolerancia a fallos y fallback en modo demo si el servidor no está corriendo.
 */

(function (window) {
  // Ruta de este script: sirve para resolver la pantalla de login desde cualquier nivel de carpetas
  const SCRIPT_SRC = document.currentScript && document.currentScript.src;
  const DEFAULT_API_BASE = 'http://localhost:3000/api';
  const API_BASE = window.TURISPRO_API_BASE || DEFAULT_API_BASE;

  const TOKEN_KEY = 'turispro_auth_token';
  const USER_KEY = 'turispro_auth_user';

  // Usuarios predeterminados para contingencia / modo local
  const USUARIOS_DEMO = {
    'admin@turispro.com': { idUsuario: 1, nombre: 'Administrador General', correo: 'admin@turispro.com', rol: 'ADMINISTRADOR', clave: 'Admin123*' },
    'gestor@turispro.com': { idUsuario: 2, nombre: 'Gestor de Proveedores', correo: 'gestor@turispro.com', rol: 'GESTOR_PROVEEDORES', clave: 'Gestor123*' },
    'evaluador@turispro.com': { idUsuario: 3, nombre: 'Evaluador Turístico', correo: 'evaluador@turispro.com', rol: 'EVALUADOR', clave: 'Evaluador123*' },
    'carlos.mendoza@turispro.co': { idUsuario: 1, nombre: 'Carlos Mendoza', correo: 'carlos.mendoza@turispro.co', rol: 'ADMINISTRADOR', clave: null }
  };

  // Control compartido de peticiones: evita duplicados, esperas infinitas y
  // permite pausar la sincronización mientras el usuario está editando formularios.
  const pendingGetRequests = new Map();
  window.__turisproPendingRequests = window.__turisproPendingRequests || 0;
  window.__turisproActiveWrites = window.__turisproActiveWrites || 0;

  async function request(endpoint, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const url = `${API_BASE}${endpoint}`;
    const token = localStorage.getItem(TOKEN_KEY);
    const isGet = method === 'GET';
    const dedupeKey = isGet ? `${method}:${url}:${token || ''}` : null;

    // Si ya existe una consulta idéntica en curso, compartir su resultado.
    if (dedupeKey && pendingGetRequests.has(dedupeKey)) {
      return pendingGetRequests.get(dedupeKey);
    }

    const execute = async () => {
      const headers = { ...(options.headers || {}) };
      if (options.body !== undefined && !(options.body instanceof FormData)) {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      }
      if (token) headers.Authorization = `Bearer ${token}`;

      const controller = new AbortController();
      const timeoutMs = Number(options.timeoutMs) || (isGet ? 20000 : 70000);
      // El timeout propio siempre debe aplicar, incluso si el consumidor entrega
      // una señal externa para cancelar la petición.
      const externalSignal = options.signal;
      const onExternalAbort = () => controller.abort(externalSignal && externalSignal.reason);
      if (externalSignal) {
        if (externalSignal.aborted) onExternalAbort();
        else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
      }
      const timeoutId = window.setTimeout(() => controller.abort(new DOMException('Tiempo de espera agotado', 'TimeoutError')), timeoutMs);
      window.__turisproPendingRequests += 1;
      if (!isGet) window.__turisproActiveWrites += 1;
      window.dispatchEvent(new CustomEvent('turispro:request-start', { detail: { method, endpoint } }));

      try {
        const fetchOptions = {
          method,
          headers,
          signal: controller.signal
        };
        if (options.body !== undefined) {
          fetchOptions.body = options.body instanceof FormData
            ? options.body
            : JSON.stringify(options.body);
        }

        const response = await fetch(url, fetchOptions);
        const raw = await response.text();
        let data = {};
        if (raw) {
          try { data = JSON.parse(raw); }
          catch (_) { data = { mensaje: raw }; }
        }

        if (!response.ok) {
          const error = new Error(data.error || data.mensaje || `Error en la petición: HTTP ${response.status}`);
          error.status = response.status;
          throw error;
        }
        return data;
      } catch (err) {
        if (err.name === 'AbortError' || err.name === 'TimeoutError') {
          const timeoutError = new Error(externalSignal && externalSignal.aborted
            ? 'La solicitud fue cancelada.'
            : 'La solicitud tardó demasiado. Intenta nuevamente.');
          timeoutError.code = externalSignal && externalSignal.aborted ? 'REQUEST_ABORTED' : 'REQUEST_TIMEOUT';
          throw timeoutError;
        }
        if (err.name === 'TypeError' || (err.message && err.message.toLowerCase().includes('fetch'))) {
          const networkError = new Error('ERR_SERVER_OFFLINE');
          networkError.isNetworkError = true;
          throw networkError;
        }
        throw err;
      } finally {
        window.clearTimeout(timeoutId);
        if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
        window.__turisproPendingRequests = Math.max(0, window.__turisproPendingRequests - 1);
        if (!isGet) window.__turisproActiveWrites = Math.max(0, window.__turisproActiveWrites - 1);
        window.dispatchEvent(new CustomEvent('turispro:request-end', { detail: { method, endpoint } }));
      }
    };

    const promise = execute();
    if (dedupeKey) {
      pendingGetRequests.set(dedupeKey, promise);
      promise.finally(() => pendingGetRequests.delete(dedupeKey)).catch(() => {});
    }
    return promise;
  }

  // Sincronización no intrusiva. También respeta filtros y controles que no están
  // dentro de formularios (por ejemplo, los selectores de ciudad de Comparar).
  let lastUserInteractionAt = 0;
  const markUserInteraction = () => { lastUserInteractionAt = Date.now(); };
  ['pointerdown', 'keydown', 'input', 'change', 'focusin'].forEach(eventName => {
    document.addEventListener(eventName, markUserInteraction, true);
  });

  window.TurisProSync = window.TurisProSync || {
    isBusy() {
      if (document.hidden || window.__turisproActiveWrites > 0 || window.__turisproPendingRequests > 0) return true;
      if (Date.now() - lastUserInteractionAt < 2000) return true;
      if (document.querySelector('.fixed:not(.hidden) form, [role="dialog"]:not(.hidden) form')) return true;
      if (document.querySelector('form[data-turispro-dirty="true"]')) return true;
      const active = document.activeElement;
      if (active && active.matches && active.matches('input, select, textarea, [contenteditable="true"]')) return true;
      if (active && active.closest && active.closest('form')) return true;
      return false;
    },
    start(callback, intervalMs = 60000) {
      let running = false;
      let stopped = false;
      let focusTimer = null;
      const run = async () => {
        if (stopped || running || this.isBusy()) return;
        running = true;
        try { await callback(); }
        catch (error) { console.warn('[TurisPro] No se pudo sincronizar la pantalla:', error); }
        finally { running = false; }
      };
      const interval = window.setInterval(run, intervalMs);
      const onReturn = () => {
        if (document.hidden) return;
        window.clearTimeout(focusTimer);
        focusTimer = window.setTimeout(run, 2000);
      };
      document.addEventListener('visibilitychange', onReturn);
      window.addEventListener('focus', onReturn);
      return () => {
        stopped = true;
        window.clearInterval(interval);
        window.clearTimeout(focusTimer);
        document.removeEventListener('visibilitychange', onReturn);
        window.removeEventListener('focus', onReturn);
      };
    }
  };

  // Marca formularios modificados para que la sincronización nunca borre trabajo sin guardar.
  document.addEventListener('input', event => {
    const form = event.target && event.target.closest && event.target.closest('form');
    if (form) form.dataset.turisproDirty = 'true';
  }, true);
  document.addEventListener('change', event => {
    const form = event.target && event.target.closest && event.target.closest('form');
    if (form) form.dataset.turisproDirty = 'true';
  }, true);
  document.addEventListener('reset', event => {
    if (event.target && event.target.matches && event.target.matches('form')) {
      delete event.target.dataset.turisproDirty;
    }
  }, true);

  const TurisProAPI = {
    // Autenticación
    async login(correo, clave) {
      const c = (correo || '').trim().toLowerCase();

      try {
        const resp = await request('/auth/login', {
          method: 'POST',
          body: { correo: c, clave }
        });

        if (resp.token && resp.usuario) {
          localStorage.setItem(TOKEN_KEY, resp.token);
          localStorage.setItem(USER_KEY, JSON.stringify(resp.usuario));
        }
        return resp;
      } catch (err) {
        // Si el servidor backend está apagado, activar modo contingencia para pruebas locales
        if (err.isNetworkError) {
          console.warn('[TurisPro] Servidor backend no detectado en http://localhost:3000. Activando autenticación local de contingencia...');
          const demoUser = USUARIOS_DEMO[c];

          if (demoUser && (!demoUser.clave || demoUser.clave === clave)) {
            const fakeToken = 'demo-jwt-token-' + btoa(JSON.stringify(demoUser));
            const usuarioObj = {
              idUsuario: demoUser.idUsuario,
              nombre: demoUser.nombre,
              correo: demoUser.correo,
              rol: demoUser.rol,
              modoDemo: true
            };
            localStorage.setItem(TOKEN_KEY, fakeToken);
            localStorage.setItem(USER_KEY, JSON.stringify(usuarioObj));
            return {
              usuario: usuarioObj,
              token: fakeToken,
              aviso: 'Iniciado en modo demostración local (servidor desconectado).'
            };
          }

          throw new Error('No se puede conectar al servidor en http://localhost:3000. Comprueba que el backend esté ejecutándose con "npm start" o usa una de las cuentas demo.');
        }

        // Error real emitido por el backend (ej. contraseña incorrecta)
        throw err;
      }
    },

    logout() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      const loginPath = SCRIPT_SRC
        ? new URL('../../pages/auth/login.html', SCRIPT_SRC).href
        : (window.location.pathname.includes('/auth/') ? 'login.html' : '../auth/login.html');
      window.location.href = loginPath;
    },

    getToken() {
      return localStorage.getItem(TOKEN_KEY);
    },

    getUser() {
      const u = localStorage.getItem(USER_KEY);
      return u ? JSON.parse(u) : null;
    },

    isAuthenticated() {
      return Boolean(this.getToken() && this.getUser());
    },

    requireAuth() {
      if (!this.isAuthenticated()) {
        const loginPath = SCRIPT_SRC
          ? new URL('../../pages/auth/login.html', SCRIPT_SRC).href
          : (window.location.pathname.includes('/auth/') ? 'login.html' : '../auth/login.html');
        window.location.replace(loginPath);
        return false;
      }
      return true;
    },

    async getPerfil() {
      try {
        return await request('/auth/perfil');
      } catch (e) {
        const u = this.getUser();
        return { usuario: u, permisos: {} };
      }
    },

    async getMenu() {
      try {
        return await request('/auth/menu');
      } catch (e) {
        return { rol: this.getUser()?.rol || 'ADMINISTRADOR', items: [] };
      }
    },

    async actualizarPerfil(datos) {
      return request('/auth/perfil', { method: 'PUT', body: datos });
    },

    async cambiarContrasena(datos) {
      return request('/auth/contrasena', { method: 'PATCH', body: datos });
    },

    // Dashboard & Comparador
    async getDashboard() {
      return request('/dashboard');
    },

    async getRanking() {
      try {
        return await request('/dashboard/ranking');
      } catch (e) {
        return [];
      }
    },

    async getReporteAnalitica(periodo = 'todo') {
      const q = new URLSearchParams({ periodo }).toString();
      return request(`/reportes/analitica?${q}`);
    },

    async compararProveedores(ids) {
      return request('/proveedores/comparar', {
        method: 'POST',
        body: { ids }
      });
    },

    async getZonas() {
      return request('/zonas');
    },

    // Proveedores
    async getProveedores(params = {}) {
      const q = new URLSearchParams(params).toString();
      // El directorio se alimenta únicamente de la API y, por tanto, de SQLite.
      // No se mezclan registros de demostración ni proveedores guardados en localStorage.
      return request(`/proveedores${q ? '?' + q : ''}`);
    },

    async getProveedorDetalle(id) {
      return request(`/proveedores/${id}`);
    },

    async crearProveedor(datos) {
      // El registro solo se confirma cuando el backend guarda el proveedor en SQLite.
      return request('/proveedores', { method: 'POST', body: datos });
    },

    async editarProveedor(id, datos) {
      return request(`/proveedores/${id}`, {
        method: 'PUT',
        body: datos
      });
    },

    async desactivarProveedor(id) {
      return request(`/proveedores/${id}/desactivar`, {
        method: 'PATCH'
      });
    },

    async reactivarProveedor(id) {
      return request(`/proveedores/${id}/reactivar`, {
        method: 'PATCH'
      });
    },

    // Servicios
    async getServicios(idProveedor) {
      return request(`/proveedores/${idProveedor}/servicios`);
    },

    async crearServicio(idProveedor, datos) {
      return request(`/proveedores/${idProveedor}/servicios`, {
        method: 'POST',
        body: datos
      });
    },

    async editarServicio(idServicio, datos) {
      return request(`/servicios/${idServicio}`, {
        method: 'PUT',
        body: datos
      });
    },

    async eliminarServicio(idServicio) {
      return request(`/servicios/${idServicio}`, {
        method: 'DELETE'
      });
    },

    // Documentos
    async getDocumentos(idProveedor) {
      return request(`/proveedores/${idProveedor}/documentos`);
    },

    async crearDocumento(idProveedor, datos) {
      return request(`/proveedores/${idProveedor}/documentos`, {
        method: 'POST',
        body: datos
      });
    },

    async getDocumentosGlobal() {
      return request('/documentos');
    },

    async crearDocumentoGlobal(idProveedor, datos) {
      return request(`/proveedores/${idProveedor}/documentos`, { method: 'POST', body: datos });
    },

    async eliminarDocumento(idDocumento) {
      return request(`/documentos/${idDocumento}`, {
        method: 'DELETE'
      });
    },

    // Evaluaciones
    async getEvaluaciones(idProveedor) {
      return request(`/proveedores/${idProveedor}/evaluaciones`);
    },

    async crearEvaluacion(idProveedor, datos) {
      return request(`/proveedores/${idProveedor}/evaluaciones`, {
        method: 'POST',
        body: datos
      });
    },

    async getEvaluacionesGlobal() {
      return request('/evaluaciones');
    },

    // Incidentes
    async getIncidentes(idProveedor) {
      return request(`/proveedores/${idProveedor}/incidentes`);
    },

    async crearIncidente(idProveedor, datos) {
      return request(`/proveedores/${idProveedor}/incidentes`, {
        method: 'POST',
        body: datos
      });
    },

    async cambiarEstadoIncidente(idIncidente, estado) {
      return request(`/incidentes/${idIncidente}/estado`, {
        method: 'PATCH',
        body: { estado }
      });
    },

    async getIncidentesGlobal(filtros = {}) {
      const q = new URLSearchParams(filtros).toString();
      return request(`/incidentes${q ? '?' + q : ''}`);
    },

    // Riesgo
    async consultarRiesgo(idProveedor) {
      return request(`/proveedores/${idProveedor}/riesgo`);
    },

    async recalcularRiesgo(idProveedor) {
      return request(`/proveedores/${idProveedor}/riesgo/recalcular`, {
        method: 'POST',
        timeoutMs: 70000
      });
    },

    async getRiesgoGlobal(filtros = {}) {
      const q = new URLSearchParams(filtros).toString();
      return request(`/riesgo/global${q ? '?' + q : ''}`);
    }
  };

  window.TurisProAPI = TurisProAPI;
})(window);

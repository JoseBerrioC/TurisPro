/**
 * TurisPro API Client Library
 * Conecta el prototipo frontend con el backend REST de TurisPro.
 */

(function (window) {
  // Determinar URL base de la API
  const DEFAULT_API_BASE = 'http://localhost:3000/api';
  const API_BASE = window.TURISPRO_API_BASE || DEFAULT_API_BASE;

  const TOKEN_KEY = 'turispro_auth_token';
  const USER_KEY = 'turispro_auth_user';

  async function request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = localStorage.getItem(TOKEN_KEY);

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.error || `Error en la petición: HTTP ${response.status}`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      console.error(`[TurisPro API] Error en ${endpoint}:`, err);
      throw err;
    }
  }

  const TurisProAPI = {
    // Autenticación
    async login(correo, clave) {
      const resp = await request('/auth/login', {
        method: 'POST',
        body: { correo, clave }
      });

      if (resp.token && resp.usuario) {
        localStorage.setItem(TOKEN_KEY, resp.token);
        localStorage.setItem(USER_KEY, JSON.stringify(resp.usuario));
      }
      return resp;
    },

    logout() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      const isAuthDir = window.location.pathname.includes('/auth/');
      const loginPath = isAuthDir ? 'login.html' : '../auth/login.html';
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
        const isAuthDir = window.location.pathname.includes('/auth/');
        const loginPath = isAuthDir ? 'login.html' : '../auth/login.html';
        window.location.replace(loginPath);
        return false;
      }
      return true;
    },

    async getPerfil() {
      return request('/auth/perfil');
    },

    async getMenu() {
      return request('/auth/menu');
    },

    // Dashboard & Comparador & Zonas
    async getDashboard() {
      return request('/dashboard');
    },

    async getRanking() {
      return request('/dashboard/ranking');
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
      return request(`/proveedores${q ? '?' + q : ''}`);
    },

    async getProveedorDetalle(id) {
      return request(`/proveedores/${id}`);
    },

    async crearProveedor(datos) {
      return request('/proveedores', {
        method: 'POST',
        body: datos
      });
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
        method: 'POST'
      });
    },

    async getRiesgoGlobal(filtros = {}) {
      const q = new URLSearchParams(filtros).toString();
      return request(`/riesgo/global${q ? '?' + q : ''}`);
    }
  };

  window.TurisProAPI = TurisProAPI;
})(window);

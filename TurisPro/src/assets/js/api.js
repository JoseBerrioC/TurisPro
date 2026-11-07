/**
 * TurisPro API Client Library
 * Conecta el prototipo frontend con el backend REST de TurisPro.
 * Incluye tolerancia a fallos y fallback en modo demo si el servidor no está corriendo.
 */

(function (window) {
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
        const err = new Error(errorMsg);
        err.status = response.status;
        throw err;
      }

      return data;
    } catch (err) {
      // Diferenciar fallo de conexión (servidor apagado) de error de lógica
      if (err.name === 'TypeError' || (err.message && err.message.toLowerCase().includes('fetch'))) {
        const netErr = new Error('ERR_SERVER_OFFLINE');
        netErr.isNetworkError = true;
        throw netErr;
      }
      throw err;
    }
  }

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

    // Dashboard & Comparador
    async getDashboard() {
      try {
        return await request('/dashboard');
      } catch (err) {
        // Fallback local con datos del MVP si el servidor está desconectado
        return {
          indicadores: {
            proveedoresActivos: 3,
            proveedoresRiesgoAlto: 1,
            documentosAtencion: 2,
            incidentesAbiertos: 2
          },
          tablaAtencion: [
            {
              idProveedor: 2,
              razonSocial: 'Transportes Andinos Express',
              tipo: 'TRANSPORTADOR',
              nivelRiesgo: 'ALTO',
              puntajeRiesgo: 72,
              motivosAtencion: ['Nivel de riesgo ALTO (72 pts)', '1 incidente de alta severidad sin cerrar']
            },
            {
              idProveedor: 1,
              razonSocial: 'Hotel Los Andes S.A.S.',
              tipo: 'HOTEL',
              nivelRiesgo: 'MEDIO',
              puntajeRiesgo: 38,
              motivosAtencion: ['1 documento vencido (Póliza)', '1 documento por vencer (Bomberos)']
            }
          ]
        };
      }
    },

    async getRanking() {
      try {
        return await request('/dashboard/ranking');
      } catch (e) {
        return [];
      }
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
      try {
        const q = new URLSearchParams(params).toString();
        return await request(`/proveedores${q ? '?' + q : ''}`);
      } catch (err) {
        return {
          total: 3,
          items: [
            { idProveedor: 1, razonSocial: 'Hotel Los Andes S.A.S.', nit: '900.123.456-7', tipo: 'HOTEL', correo: 'contacto@hotellosandes.com', activo: true, estadoCiclo: 'Activo', nivelRiesgo: 'MEDIO', puntajeRiesgo: 38, zonas: [{ ciudad: 'Bogotá' }] },
            { idProveedor: 2, razonSocial: 'Transportes Andinos Express', nit: '901.987.654-3', tipo: 'TRANSPORTADOR', correo: 'operaciones@transportesandinos.com', activo: true, estadoCiclo: 'Activo', nivelRiesgo: 'ALTO', puntajeRiesgo: 72, zonas: [{ ciudad: 'Medellín' }] },
            { idProveedor: 3, razonSocial: 'Rutas del Inca Tours E.I.R.L.', nit: '204.567.890-1', tipo: 'OPERADOR', correo: 'reservas@rutasdelinca.pe', activo: true, estadoCiclo: 'Registrado', nivelRiesgo: 'SIN_DATOS', puntajeRiesgo: null, zonas: [{ ciudad: 'Cusco' }] }
          ]
        };
      }
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
    // Configuración y Administración de Usuarios (Fase 4C)
    async getUsuarios(filtros = {}) {
      const q = new URLSearchParams(filtros).toString();
      try {
        const res = await request(`/auth/usuarios${q ? '?' + q : ''}`);
        return res.items || res;
      } catch (err) {
        if (err.isNetworkError) {
          return [
            { idUsuario: 1, nombre: 'Administrador General', correo: 'admin@turispro.com', rol: 'ADMINISTRADOR', activo: true, creadoEn: '2024-10-01' },
            { idUsuario: 2, nombre: 'Gestor de Proveedores', correo: 'gestor@turispro.com', rol: 'GESTOR_PROVEEDORES', activo: true, creadoEn: '2024-10-05' },
            { idUsuario: 3, nombre: 'Evaluador Turístico', correo: 'evaluador@turispro.com', rol: 'EVALUADOR', activo: true, creadoEn: '2024-10-12' }
          ];
        }
        throw err;
      }
    },

    async crearUsuario(datos) {
      return request('/auth/usuarios', {
        method: 'POST',
        body: datos
      });
    },

    async actualizarPerfil(datos) {
      const res = await request('/auth/perfil', {
        method: 'PUT',
        body: datos
      });
      if (res && res.usuario) {
        const actual = this.getUser() || {};
        localStorage.setItem(USER_KEY, JSON.stringify({ ...actual, ...res.usuario }));
        // Sincronizar UI de cabecera si existe
        const nameEl = document.getElementById('user-display-name') || document.querySelector('[data-user-name]');
        if (nameEl) nameEl.textContent = res.usuario.nombre || res.usuario.correo;
      }
      return res;
    },

    async cambiarClave(datos) {
      return request('/auth/cambiar-clave', {
        method: 'POST',
        body: datos
      });
    },

    async getPreferencias() {
      try {
        const res = await request('/configuracion/preferencias');
        return res.preferencias || res;
      } catch (e) {
        return { diasAlerta: 30, alertasIncidentes: true, alertasEvaluaciones: true };
      }
    },

    async guardarPreferencias(datos) {
      return request('/configuracion/preferencias', {
        method: 'PUT',
        body: datos
      });
    }
  };

  window.TurisProAPI = TurisProAPI;
})(window);

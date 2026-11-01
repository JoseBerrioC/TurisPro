const { URL } = require('node:url');
const { Rol } = require('../domain/enums');
const { autenticar, requerirAutenticacion, requerirRol } = require('../middlewares/authMiddleware');

const AuthController = require('../controllers/authController');
const ProveedorController = require('../controllers/proveedorController');
const ServicioController = require('../controllers/servicioController');
const DocumentoController = require('../controllers/documentoController');
const EvaluacionController = require('../controllers/evaluacionController');
const IncidenteController = require('../controllers/incidenteController');
const RiesgoController = require('../controllers/riesgoController');
const DashboardController = require('../controllers/dashboardController');

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 5 * 1024 * 1024) { // límite de 5MB
        reject(new Error('Payload Too Large'));
      }
    });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error('Cuerpo de la petición JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

function matchRoute(method, pathname, targetMethod, pattern) {
  if (method !== targetMethod) return null;
  const paramNames = [];
  const regexPattern = pattern.replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
    paramNames.push(name);
    return '([^/]+)';
  });
  const regex = new RegExp(`^${regexPattern}$`);
  const match = pathname.match(regex);
  if (!match) return null;

  const params = {};
  paramNames.forEach((name, index) => {
    params[name] = decodeURIComponent(match[index + 1]);
  });
  return params;
}

async function handleRequest(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname.replace(/\/$/, '') || '/';
  const query = Object.fromEntries(parsedUrl.searchParams);
  const method = req.method.toUpperCase();

  let body = {};
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      body = await parseBody(req);
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  const send = ({ status = 200, body: resBody = {} }) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(resBody));
  };

  try {
    // 1. Health check
    if (method === 'GET' && (pathname === '/' || pathname === '/api/health')) {
      return send({
        status: 200,
        body: {
          app: 'TurisPro Backend API',
          version: '1.0.0 (MVP Release 1)',
          status: 'UP',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 2. Auth Routes
    if (method === 'POST' && pathname === '/api/auth/login') {
      const resp = await AuthController.login(body);
      return send(resp);
    }

    if (method === 'GET' && pathname === '/api/auth/perfil') {
      const usuario = requerirAutenticacion(req, res);
      if (!usuario) return;
      return send(AuthController.perfil(usuario));
    }

    if (method === 'GET' && pathname === '/api/auth/menu') {
      const usuario = requerirAutenticacion(req, res);
      if (!usuario) return;
      return send(AuthController.menuPorRol(usuario));
    }

    if (method === 'POST' && pathname === '/api/auth/usuarios') {
      const usuario = requerirRol(Rol.ADMINISTRADOR)(req, res);
      if (!usuario) return;
      return send(AuthController.crearUsuario(body, usuario));
    }

    if (method === 'GET' && pathname === '/api/auth/usuarios') {
      const usuario = requerirRol(Rol.ADMINISTRADOR)(req, res);
      if (!usuario) return;
      return send(AuthController.listarUsuarios(usuario));
    }

    // 3. Dashboard, Ranking, Comparar, Zonas
    if (method === 'GET' && pathname === '/api/dashboard') {
      return send(DashboardController.resumenDashboard());
    }

    if (method === 'GET' && pathname === '/api/dashboard/ranking') {
      return send(DashboardController.ranking());
    }

    if (method === 'POST' && pathname === '/api/proveedores/comparar') {
      return send(DashboardController.comparar(body));
    }

    if (method === 'GET' && pathname === '/api/zonas') {
      return send(DashboardController.listarZonas());
    }

    // 4. Proveedores CRUD
    if (method === 'POST' && pathname === '/api/proveedores') {
      const usuario = requerirRol(Rol.ADMINISTRADOR, Rol.GESTOR_PROVEEDORES)(req, res);
      if (!usuario) return;
      return send(ProveedorController.registrar(body));
    }

    if (method === 'GET' && pathname === '/api/proveedores') {
      return send(ProveedorController.buscar(query));
    }

    let params;
    if ((params = matchRoute(method, pathname, 'GET', '/api/proveedores/:id'))) {
      return send(ProveedorController.verDetalle(params.id));
    }

    if ((params = matchRoute(method, pathname, 'PUT', '/api/proveedores/:id'))) {
      const usuario = requerirRol(Rol.ADMINISTRADOR, Rol.GESTOR_PROVEEDORES)(req, res);
      if (!usuario) return;
      return send(ProveedorController.editar(params.id, body));
    }

    if ((params = matchRoute(method, pathname, 'PATCH', '/api/proveedores/:id/desactivar'))) {
      const usuario = requerirRol(Rol.ADMINISTRADOR, Rol.GESTOR_PROVEEDORES)(req, res);
      if (!usuario) return;
      return send(ProveedorController.desactivar(params.id));
    }

    if ((params = matchRoute(method, pathname, 'PATCH', '/api/proveedores/:id/reactivar'))) {
      const usuario = requerirRol(Rol.ADMINISTRADOR, Rol.GESTOR_PROVEEDORES)(req, res);
      if (!usuario) return;
      return send(ProveedorController.reactivar(params.id));
    }

    // 5. Servicios
    if ((params = matchRoute(method, pathname, 'POST', '/api/proveedores/:id/servicios'))) {
      const usuario = requerirRol(Rol.ADMINISTRADOR, Rol.GESTOR_PROVEEDORES)(req, res);
      if (!usuario) return;
      return send(ServicioController.agregar(params.id, body));
    }

    if ((params = matchRoute(method, pathname, 'GET', '/api/proveedores/:id/servicios'))) {
      return send(ServicioController.listarPorProveedor(params.id));
    }

    if ((params = matchRoute(method, pathname, 'PUT', '/api/servicios/:id'))) {
      const usuario = requerirRol(Rol.ADMINISTRADOR, Rol.GESTOR_PROVEEDORES)(req, res);
      if (!usuario) return;
      return send(ServicioController.editar(params.id, body));
    }

    if ((params = matchRoute(method, pathname, 'DELETE', '/api/servicios/:id'))) {
      const usuario = requerirRol(Rol.ADMINISTRADOR, Rol.GESTOR_PROVEEDORES)(req, res);
      if (!usuario) return;
      return send(ServicioController.eliminar(params.id));
    }

    // 6. Documentos
    if ((params = matchRoute(method, pathname, 'POST', '/api/proveedores/:id/documentos'))) {
      const usuario = requerirRol(Rol.ADMINISTRADOR, Rol.GESTOR_PROVEEDORES)(req, res);
      if (!usuario) return;
      return send(DocumentoController.registrar(params.id, body));
    }

    if ((params = matchRoute(method, pathname, 'GET', '/api/proveedores/:id/documentos'))) {
      return send(DocumentoController.listarPorProveedor(params.id));
    }

    if (method === 'GET' && pathname === '/api/documentos') {
      return send(DocumentoController.listarGlobal());
    }

    if ((params = matchRoute(method, pathname, 'DELETE', '/api/documentos/:id'))) {
      const usuario = requerirRol(Rol.ADMINISTRADOR, Rol.GESTOR_PROVEEDORES)(req, res);
      if (!usuario) return;
      return send(DocumentoController.eliminar(params.id));
    }

    // 7. Evaluaciones
    if ((params = matchRoute(method, pathname, 'POST', '/api/proveedores/:id/evaluaciones'))) {
      const usuario = requerirRol(Rol.ADMINISTRADOR, Rol.EVALUADOR)(req, res);
      if (!usuario) return;
      return send(EvaluacionController.registrar(params.id, body, usuario));
    }

    if ((params = matchRoute(method, pathname, 'GET', '/api/proveedores/:id/evaluaciones'))) {
      return send(EvaluacionController.historial(params.id));
    }

    if (method === 'GET' && pathname === '/api/evaluaciones') {
      return send(EvaluacionController.listarGlobal());
    }

    // 8. Incidentes
    if ((params = matchRoute(method, pathname, 'POST', '/api/proveedores/:id/incidentes'))) {
      const usuario = requerirRol(Rol.ADMINISTRADOR, Rol.EVALUADOR)(req, res);
      if (!usuario) return;
      return send(IncidenteController.registrar(params.id, body, usuario));
    }

    if ((params = matchRoute(method, pathname, 'GET', '/api/proveedores/:id/incidentes'))) {
      return send(IncidenteController.listarPorProveedor(params.id));
    }

    if ((params = matchRoute(method, pathname, 'PATCH', '/api/incidentes/:id/estado'))) {
      const usuario = requerirRol(Rol.ADMINISTRADOR, Rol.EVALUADOR)(req, res);
      if (!usuario) return;
      return send(IncidenteController.cambiarEstado(params.id, body));
    }

    if (method === 'GET' && pathname === '/api/incidentes') {
      return send(IncidenteController.filtrarGlobal(query));
    }

    // 9. Análisis de Riesgo
    if ((params = matchRoute(method, pathname, 'GET', '/api/proveedores/:id/riesgo'))) {
      return send(await RiesgoController.consultarRiesgo(params.id));
    }

    if ((params = matchRoute(method, pathname, 'POST', '/api/proveedores/:id/riesgo/recalcular'))) {
      return send(await RiesgoController.recalcularRiesgo(params.id));
    }

    if (method === 'GET' && pathname === '/api/riesgo/global') {
      return send(RiesgoController.vistaGlobal(query));
    }

    // Ruta no encontrada
    return send({
      status: 404,
      body: {
        error: 'Ruta no encontrada',
        metodo: method,
        ruta: pathname
      }
    });

  } catch (error) {
    console.error('Error procesando petición HTTP:', error);
    return send({
      status: 400,
      body: {
        error: error.message || 'Error interno del servidor'
      }
    });
  }
}

module.exports = {
  handleRequest
};

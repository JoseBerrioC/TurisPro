const test = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('node:events');
const { handleRequest } = require('../src/routes/router');
const { getDatabase } = require('../src/database/connection');
const { seed } = require('../src/database/seed');

function callApi(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = new EventEmitter();
    req.method = method.toUpperCase();
    req.url = path;
    req.headers = {
      host: 'localhost',
      'content-type': 'application/json',
      ...headers
    };

    let resStatus = 200;
    const resHeaders = {};
    let resData = '';

    const res = {
      writeHead: (status, hdrs = {}) => {
        resStatus = status;
        Object.assign(resHeaders, hdrs);
      },
      setHeader: (key, val) => {
        resHeaders[key.toLowerCase()] = val;
      },
      end: (chunk) => {
        if (chunk) resData += chunk;
        let parsed = resData;
        try {
          parsed = JSON.parse(resData);
        } catch {
          // Dejar texto plano si no es JSON
        }
        resolve({ status: resStatus, headers: resHeaders, data: parsed });
      }
    };

    handleRequest(req, res).catch(reject);

    if (body !== null) {
      req.emit('data', Buffer.from(JSON.stringify(body)));
    }
    req.emit('end');
  });
}

test('API Integration - Setup Database & Seed', async () => {
  const db = getDatabase();
  await seed(db);
  assert.ok(db);
});

test('API Integration - Health check', async () => {
  const res = await callApi('GET', '/api/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.status, 'UP');
  assert.strictEqual(res.data.app, 'TurisPro Backend API');
});

test('API Integration - HU-01: Login con credenciales válidas e inválidas', async () => {
  // Inválido
  const resFallo = await callApi('POST', '/api/auth/login', {
    correo: 'admin@turispro.com',
    clave: 'ClaveMala'
  });
  assert.strictEqual(resFallo.status, 400);
  assert.strictEqual(resFallo.data.error, 'Credenciales incorrectas');

  // Válido
  const resExito = await callApi('POST', '/api/auth/login', {
    correo: 'admin@turispro.com',
    clave: 'Admin123*'
  });
  assert.strictEqual(resExito.status, 200);
  assert.ok(resExito.data.token);
  assert.strictEqual(resExito.data.usuario.rol, 'ADMINISTRADOR');
});

test('API Integration - HU-02: Menú y opciones según rol del usuario', async () => {
  const loginRes = await callApi('POST', '/api/auth/login', {
    correo: 'gestor@turispro.com',
    clave: 'Gestor123*'
  });
  const token = loginRes.data.token;

  const menuRes = await callApi('GET', '/api/auth/menu', null, {
    Authorization: `Bearer ${token}`
  });

  assert.strictEqual(menuRes.status, 200);
  assert.strictEqual(menuRes.data.rol, 'GESTOR_PROVEEDORES');
  const ids = menuRes.data.items.map(i => i.id);
  assert.ok(ids.includes('dashboard'));
  assert.ok(ids.includes('proveedores'));
  assert.ok(ids.includes('registrar_proveedor'));
  // Gestor no debe tener configuración de usuarios
  assert.strictEqual(ids.includes('configuracion'), false);
});

test('API Integration - HU-14: Dashboard simple con 4 indicadores y tabla de atención', async () => {
  const res = await callApi('GET', '/api/dashboard');
  assert.strictEqual(res.status, 200);
  assert.ok(res.data.indicadores);
  assert.ok(res.data.indicadores.proveedoresActivos >= 2);
  assert.ok(Array.isArray(res.data.tablaAtencion));
});

test('API Integration - HU-04: Buscar y listar proveedores', async () => {
  const res = await callApi('GET', '/api/proveedores?texto=Andes');
  assert.strictEqual(res.status, 200);
  assert.ok(res.data.total >= 1);
  assert.strictEqual(res.data.items[0].razonSocial, 'Hotel Los Andes S.A.S.');
});

test('API Integration - HU-05: Detalle del proveedor con pestañas', async () => {
  const res = await callApi('GET', '/api/proveedores/1');
  assert.strictEqual(res.status, 200);
  assert.ok(res.data.pestanas);
  assert.ok(res.data.pestanas.informacionGeneral);
  assert.ok(Array.isArray(res.data.pestanas.serviciosYTarifas));
  assert.ok(Array.isArray(res.data.pestanas.documentos));
  assert.ok(res.data.pestanas.evaluaciones);
  assert.ok(Array.isArray(res.data.pestanas.incidentes));
});

test('API Integration - HU-12 y HU-13: Consulta de Riesgo y aviso humano obligatorio', async () => {
  const res = await callApi('GET', '/api/proveedores/1/riesgo');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.avisoHumano, 'La decisión final sobre el proveedor siempre la toma una persona.');
  assert.ok(res.data.analisis);
  assert.ok(res.data.analisis.puntaje !== null);
  assert.ok(['BAJO', 'MEDIO', 'ALTO'].includes(res.data.analisis.nivel));
  assert.ok(res.data.analisis.factores.length >= 3);
});

test('API Integration - HU-15: Comparar 2 o 3 proveedores lado a lado', async () => {
  const res = await callApi('POST', '/api/proveedores/comparar', {
    ids: [1, 2]
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.totalComparados, 2);
  assert.strictEqual(res.data.proveedores[0].razonSocial, 'Hotel Los Andes S.A.S.');
  assert.strictEqual(res.data.proveedores[1].razonSocial, 'Transportes Andinos Express');
});

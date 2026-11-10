const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');

// Base de datos aislada: las pruebas nunca tocan turispro.db real.
// Debe definirse ANTES de cargar cualquier módulo que lea config.js.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'turispro-test-'));
process.env.DB_PATH = path.join(tmpDir, 'test.db');
test.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

const { handleRequest } = require('../src/routes/router');
const { getDatabase } = require('../src/database/connection');
const { seed } = require('../src/database/seed');
const Usuario = require('../src/domain/Usuario');

function callApi(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = new EventEmitter();
    req.method = method.toUpperCase();
    req.resume = () => {}; // Los streams HTTP reales exponen resume()
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
      if (typeof body === 'string') {
        req.emit('data', Buffer.from(body));
      } else {
        req.emit('data', Buffer.from(JSON.stringify(body)));
      }
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

test('API Integration - Migración progresiva de contraseña legacy tras login exitoso', async () => {
  const db = getDatabase();
  const correoLegacy = 'usuario.legacy@turispro.com';
  const claveLegacy = 'ClaveAntigua2025*';
  
  // Generar hash legacy (1,000 iteraciones, formato salt:hash sin metadato)
  const salt = crypto.randomBytes(16).toString('hex');
  const hashRaw = crypto.pbkdf2Sync(claveLegacy, salt, 1000, 64, 'sha512').toString('hex');
  const hashLegacy = `${salt}:${hashRaw}`;

  // Insertar usuario con hash legacy en la base de datos
  db.prepare(`
    INSERT OR REPLACE INTO usuarios (nombre, correo, contrasena_hash, rol, activo)
    VALUES (?, ?, ?, 'GESTOR_PROVEEDORES', 1)
  `).run('Usuario Legacy', correoLegacy, hashLegacy);

  // Iniciar sesión con la clave correcta
  const resLogin = await callApi('POST', '/api/auth/login', {
    correo: correoLegacy,
    clave: claveLegacy
  });

  assert.strictEqual(resLogin.status, 200);
  assert.ok(resLogin.data.token);

  // Comprobar que en la base de datos el hash fue actualizado a 210,000 iteraciones
  const usuarioActualizado = Usuario.buscarPorCorreo(correoLegacy);
  assert.ok(usuarioActualizado);
  const partes = usuarioActualizado.contrasenaHash.split(':');
  assert.strictEqual(partes.length, 3, 'El hash actualizado debe tener 3 partes (salt:hash:iteraciones)');
  assert.strictEqual(partes[2], '210000', 'Debe haber sido actualizado a 210,000 iteraciones');
});

async function tokenDe(correo, clave) {
  const res = await callApi('POST', '/api/auth/login', { correo, clave });
  return { Authorization: `Bearer ${res.data.token}` };
}

test('API Integration - HU-02: Menú y opciones según rol del usuario', async () => {
  const menuDe = async (correo, clave) => {
    const res = await callApi('GET', '/api/auth/menu', null, await tokenDe(correo, clave));
    assert.strictEqual(res.status, 200);
    return res.data;
  };

  const admin = await menuDe('admin@turispro.com', 'Admin123*');
  assert.strictEqual(admin.rol, 'ADMINISTRADOR');
  assert.strictEqual(admin.items.length, 9, 'El administrador ve todas las pantallas del menú');

  const gestor = await menuDe('gestor@turispro.com', 'Gestor123*');
  assert.strictEqual(gestor.rol, 'GESTOR_PROVEEDORES');
  const idsGestor = gestor.items.map(i => i.id);
  ['dashboard', 'proveedores', 'comparar', 'documentos', 'evaluaciones', 'incidentes', 'reportes', 'analisis_riesgo', 'configuracion']
    .forEach(id => assert.ok(idsGestor.includes(id), `El gestor debe ver ${id}`));

  const evaluador = await menuDe('evaluador@turispro.com', 'Evaluador123*');
  assert.strictEqual(evaluador.rol, 'EVALUADOR');
  const idsEvaluador = evaluador.items.map(i => i.id);
  ['dashboard', 'proveedores', 'comparar', 'evaluaciones', 'incidentes', 'analisis_riesgo', 'configuracion']
    .forEach(id => assert.ok(idsEvaluador.includes(id), `El evaluador debe ver ${id}`));
  // El evaluador no administra documentos ni ve los reportes ejecutivos
  assert.strictEqual(idsEvaluador.includes('documentos'), false);
  assert.strictEqual(idsEvaluador.includes('reportes'), false);
});

test('API Integration - Permisos por rol: reportes, documentos globales y recálculo de riesgo', async () => {
  const admin = await tokenDe('admin@turispro.com', 'Admin123*');
  const gestor = await tokenDe('gestor@turispro.com', 'Gestor123*');
  const evaluador = await tokenDe('evaluador@turispro.com', 'Evaluador123*');

  // Reportes y documentos globales: solo Administrador y Gestor
  for (const ruta of ['/api/reportes/analitica', '/api/documentos']) {
    assert.strictEqual((await callApi('GET', ruta)).status, 401, `${ruta} sin sesión`);
    assert.strictEqual((await callApi('GET', ruta, null, evaluador)).status, 403, `${ruta} evaluador`);
    assert.strictEqual((await callApi('GET', ruta, null, gestor)).status, 200, `${ruta} gestor`);
    assert.strictEqual((await callApi('GET', ruta, null, admin)).status, 200, `${ruta} admin`);
  }

  // Recalcular riesgo: Administrador y Evaluador (el Gestor solo consulta)
  const recalcular = '/api/proveedores/1/riesgo/recalcular';
  assert.strictEqual((await callApi('POST', recalcular, {}, gestor)).status, 403);
  assert.notStrictEqual((await callApi('POST', recalcular, {}, evaluador)).status, 403);
  assert.notStrictEqual((await callApi('POST', recalcular, {}, admin)).status, 403);
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

test('API Integration - HU-31: Vista global de riesgos sin duplicados de proveedores', async () => {
  const db = getDatabase();
  // Insertar un análisis adicional para simular historial múltiple en proveedor 1
  db.prepare(`
    INSERT INTO analisis_riesgo (id_proveedor, puntaje, nivel, explicacion, origen_explicacion, recomendacion)
    VALUES (1, 45, 'MEDIO', 'Segundo análisis histórico para pruebas', 'PLANTILLA', 'Recomendación histórica')
  `).run();

  const res = await callApi('GET', '/api/riesgo/global');
  assert.strictEqual(res.status, 200);

  // Verificar que ningún idProveedor se repita en la lista
  const ids = res.data.items.map(item => item.idProveedor);
  const idsUnicos = new Set(ids);
  assert.strictEqual(ids.length, idsUnicos.size, 'No deben existir proveedores duplicados en la vista global');
  
  // El proveedor 1 debe tener vinculado el análisis más reciente
  const prov1 = res.data.items.find(i => i.idProveedor === 1);
  assert.ok(prov1.ultimoAnalisis);
  assert.strictEqual(prov1.ultimoAnalisis.explicacion, 'Segundo análisis histórico para pruebas');
});

test('API Integration - HU-15: Comparar 2 o 3 proveedores lado a lado', async () => {
  // Comparación válida
  const res = await callApi('POST', '/api/proveedores/comparar', {
    ids: [1, 2]
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.totalComparados, 2);
  assert.strictEqual(res.data.proveedores[0].razonSocial, 'Hotel Los Andes S.A.S.');
  assert.strictEqual(res.data.proveedores[1].razonSocial, 'Transportes Andinos Express');

  // Rechazo de IDs duplicados
  const resDuplicados = await callApi('POST', '/api/proveedores/comparar', {
    ids: [1, 1]
  });
  assert.strictEqual(resDuplicados.status, 400);
  assert.ok(resDuplicados.data.error.includes('duplicados'));

  // Rechazo de cantidad menor a 2 o mayor a 3
  const resUno = await callApi('POST', '/api/proveedores/comparar', {
    ids: [1]
  });
  assert.strictEqual(resUno.status, 400);

  const resCuatro = await callApi('POST', '/api/proveedores/comparar', {
    ids: [1, 2, 3, 4]
  });
  assert.strictEqual(resCuatro.status, 400);
});

test('API Integration - Manejo de solicitudes que exceden el límite de 5 MB (HTTP 413)', async () => {
  // Petición con Content-Length declarado > 5 MB
  const resContentLength = await callApi('POST', '/api/auth/login', {}, {
    'content-length': (6 * 1024 * 1024).toString()
  });
  assert.strictEqual(resContentLength.status, 413);
  assert.ok(resContentLength.data.error.includes('Payload Too Large'));

  // Petición con cuerpo en stream > 5 MB
  const chunkGrande = 'A'.repeat(5.5 * 1024 * 1024);
  const resStreamGrande = await callApi('POST', '/api/auth/login', chunkGrande);
  assert.strictEqual(resStreamGrande.status, 413);
  assert.ok(resStreamGrande.data.error.includes('Payload Too Large'));
});

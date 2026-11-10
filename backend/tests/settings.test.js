const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'turispro-settings-'));
process.env.DB_PATH = path.join(tempDir, 'settings.db');
const { handleRequest } = require('../src/routes/router');
const { getDatabase } = require('../src/database/connection');
const { seed } = require('../src/database/seed');
test.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

function callApi(method, url, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = new EventEmitter();
    req.method = method;
    req.url = url;
    req.resume = () => {};
    req.headers = { host: 'localhost', 'content-type': 'application/json', ...headers };
    let status = 200;
    let output = '';
    const res = {
      headersSent: false,
      writeHead(code) { status = code; this.headersSent = true; },
      end(chunk) {
        if (chunk) output += chunk;
        let data = {};
        try { data = JSON.parse(output); } catch (_) {}
        resolve({ status, data });
      }
    };
    handleRequest(req, res).catch(reject);
    if (body !== null) req.emit('data', Buffer.from(JSON.stringify(body)));
    req.emit('end');
  });
}

test('Configuración: perfil y contraseña se actualizan en la base de datos', async () => {
  await seed(getDatabase());
  const login = await callApi('POST', '/api/auth/login', { correo: 'admin@turispro.com', clave: 'Admin123*' });
  assert.equal(login.status, 200);
  const auth = { authorization: `Bearer ${login.data.token}` };

  const perfil = await callApi('PUT', '/api/auth/perfil', { nombre: 'Administradora TurisPro', correo: 'admin.actualizado@turispro.com' }, auth);
  assert.equal(perfil.status, 200);
  assert.equal(perfil.data.usuario.nombre, 'Administradora TurisPro');
  assert.equal(perfil.data.usuario.correo, 'admin.actualizado@turispro.com');

  const perfilDb = getDatabase().prepare('SELECT nombre, correo FROM usuarios WHERE id_usuario = ?').get(login.data.usuario.idUsuario);
  assert.equal(perfilDb.nombre, 'Administradora TurisPro');
  assert.equal(perfilDb.correo, 'admin.actualizado@turispro.com');

  const password = await callApi('PATCH', '/api/auth/contrasena', {
    contrasenaActual: 'Admin123*', nuevaContrasena: 'NuevaClaveSegura123*'
  }, auth);
  assert.equal(password.status, 200);

  const loginNuevo = await callApi('POST', '/api/auth/login', {
    correo: 'admin.actualizado@turispro.com', clave: 'NuevaClaveSegura123*'
  });
  assert.equal(loginNuevo.status, 200);
});

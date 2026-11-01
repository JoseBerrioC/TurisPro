const test = require('node:test');
const assert = require('node:assert');
const Usuario = require('../src/domain/Usuario');
const AuthService = require('../src/services/AuthService');
const { Rol } = require('../src/domain/enums');

test('Autenticación - Hashing y verificación de contraseñas seguras', () => {
  const claveOriginal = 'ClaveTurisPro2026*';
  const hash = Usuario.hashClave(claveOriginal);

  assert.notStrictEqual(claveOriginal, hash);
  assert.ok(hash.includes(':'));
  assert.strictEqual(Usuario.verificarClave(claveOriginal, hash), true);
  assert.strictEqual(Usuario.verificarClave('ClaveIncorrecta', hash), false);
});

test('Autenticación - Generación y validación de tokens JWT sin librerías externas', () => {
  const payload = { idUsuario: 1, correo: 'admin@turispro.com', rol: Rol.ADMINISTRADOR };
  const token = AuthService.generarToken(payload);

  assert.ok(typeof token === 'string');
  assert.strictEqual(token.split('.').length, 3);

  const verificado = AuthService.verificarToken(token);
  assert.ok(verificado);
  assert.strictEqual(verificado.idUsuario, 1);
  assert.strictEqual(verificado.correo, 'admin@turispro.com');
  assert.strictEqual(verificado.rol, Rol.ADMINISTRADOR);

  // Token alterado
  const tokenManipulado = token + 'xyz';
  assert.strictEqual(AuthService.verificarToken(tokenManipulado), null);
});

test('Matriz de Permisos por Rol (HU-02)', () => {
  const admin = new Usuario({ idUsuario: 1, nombre: 'Admin', correo: 'a@t.com', rol: Rol.ADMINISTRADOR });
  const gestor = new Usuario({ idUsuario: 2, nombre: 'Gestor', correo: 'g@t.com', rol: Rol.GESTOR_PROVEEDORES });
  const evaluador = new Usuario({ idUsuario: 3, nombre: 'Eval', correo: 'e@t.com', rol: Rol.EVALUADOR });

  // Administrador tiene acceso completo
  assert.strictEqual(admin.tienePermiso('gestionar_usuarios'), true);
  assert.strictEqual(admin.tienePermiso('registrar_proveedor'), true);
  assert.strictEqual(admin.tienePermiso('evaluar_proveedor'), true);

  // Gestor de proveedores gestiona fichas, servicios y documentos pero no usuarios ni evaluaciones
  assert.strictEqual(gestor.tienePermiso('registrar_proveedor'), true);
  assert.strictEqual(gestor.tienePermiso('gestionar_servicios'), true);
  assert.strictEqual(gestor.tienePermiso('gestionar_documentos'), true);
  assert.strictEqual(gestor.tienePermiso('gestionar_usuarios'), false);
  assert.strictEqual(gestor.tienePermiso('evaluar_proveedor'), false);

  // Evaluador puede calificar e ingresar incidentes pero no alterar fichas ni usuarios
  assert.strictEqual(evaluador.tienePermiso('evaluar_proveedor'), true);
  assert.strictEqual(evaluador.tienePermiso('registrar_incidente'), true);
  assert.strictEqual(evaluador.tienePermiso('gestionar_usuarios'), false);
  assert.strictEqual(evaluador.tienePermiso('registrar_proveedor'), false);
  assert.strictEqual(evaluador.tienePermiso('gestionar_servicios'), false);
});

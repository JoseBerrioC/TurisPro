const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const Usuario = require('../src/domain/Usuario');
const AuthService = require('../src/services/AuthService');
const { Rol } = require('../src/domain/enums');

test('Autenticación - Hashing robusto con PBKDF2 (210,000 iteraciones)', () => {
  const claveOriginal = 'ClaveTurisPro2026*';
  const hash = Usuario.hashClave(claveOriginal);

  assert.notStrictEqual(claveOriginal, hash);
  const partes = hash.split(':');
  assert.strictEqual(partes.length, 3, 'El hash debe contener salt:hash:iteraciones');
  assert.strictEqual(partes[2], '210000', 'Debe utilizar 210,000 iteraciones por defecto');
  assert.strictEqual(Usuario.verificarClave(claveOriginal, hash), true);
  assert.strictEqual(Usuario.verificarClave('ClaveIncorrecta', hash), false);
  assert.strictEqual(Usuario.necesitaActualizarHash(hash), false);
});

test('Autenticación - Compatibilidad retrospectiva con hashes legacy (1,000 iteraciones)', () => {
  const claveUsuario = 'MiClaveAntigua2025';
  const salt = crypto.randomBytes(16).toString('hex');
  const hashLegacyRaw = crypto.pbkdf2Sync(claveUsuario, salt, 1000, 64, 'sha512').toString('hex');
  // Formato legacy histórico sin campo de iteraciones (2 partes)
  const hashLegacy = `${salt}:${hashLegacyRaw}`;

  assert.strictEqual(hashLegacy.split(':').length, 2);
  // Debe verificar correctamente la clave con el formato antiguo
  assert.strictEqual(Usuario.verificarClave(claveUsuario, hashLegacy), true);
  assert.strictEqual(Usuario.verificarClave('PasswordErroneo', hashLegacy), false);
  // Debe detectar que el hash necesita migración progresiva a 210,000 iteraciones
  assert.strictEqual(Usuario.necesitaActualizarHash(hashLegacy), true);
});

test('Autenticación - Validación de tokens JWT con timingSafeEqual y control de longitud', () => {
  const payload = { idUsuario: 1, correo: 'admin@turispro.com', rol: Rol.ADMINISTRADOR };
  const token = AuthService.generarToken(payload);

  assert.ok(typeof token === 'string');
  assert.strictEqual(token.split('.').length, 3);

  // Token válido
  const verificado = AuthService.verificarToken(token);
  assert.ok(verificado);
  assert.strictEqual(verificado.idUsuario, 1);
  assert.strictEqual(verificado.correo, 'admin@turispro.com');
  assert.strictEqual(verificado.rol, Rol.ADMINISTRADOR);

  // Token con firma de longitud idéntica pero alterada en 1 caracter
  const partes = token.split('.');
  const sigOriginal = partes[2];
  const charAlterado = sigOriginal[0] === 'a' ? 'b' : 'a';
  const sigMismaLongitud = charAlterado + sigOriginal.slice(1);
  const tokenAlterado1 = `${partes[0]}.${partes[1]}.${sigMismaLongitud}`;
  assert.strictEqual(AuthService.verificarToken(tokenAlterado1), null);

  // Token con firma de longitud diferente
  const tokenLongitudDistinta = token + 'extra_bytes';
  assert.strictEqual(AuthService.verificarToken(tokenLongitudDistinta), null);

  // Token con firma vacía
  const tokenSinFirma = `${partes[0]}.${partes[1]}.`;
  assert.strictEqual(AuthService.verificarToken(tokenSinFirma), null);
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

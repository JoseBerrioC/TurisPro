const crypto = require('node:crypto');
const config = require('../config/config');
const Usuario = require('../domain/Usuario');

class AuthService {
  static generarToken(payload) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const expiracion = Math.floor(Date.now() / 1000) + (config.auth.expiresInHours * 3600);
    const body = Buffer.from(JSON.stringify({ ...payload, exp: expiracion })).toString('base64url');
    const signature = crypto
      .createHmac('sha256', config.auth.secret)
      .update(`${header}.${body}`)
      .digest('base64url');

    return `${header}.${body}.${signature}`;
  }

  static verificarToken(token) {
    if (!token || typeof token !== 'string') return null;
    const partes = token.split('.');
    if (partes.length !== 3) return null;

    const [header, body, signature] = partes;
    const signatureEsperada = crypto
      .createHmac('sha256', config.auth.secret)
      .update(`${header}.${body}`)
      .digest('base64url');

    try {
      const sigBuffer = Buffer.from(signature, 'utf8');
      const sigEsperadaBuffer = Buffer.from(signatureEsperada, 'utf8');

      // Validación obligatoria de longitud para timingSafeEqual
      if (sigBuffer.length !== sigEsperadaBuffer.length) {
        return null;
      }

      // Comparación en tiempo constante para mitigar ataques de temporización (timing attacks)
      if (!crypto.timingSafeEqual(sigBuffer, sigEsperadaBuffer)) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return null; // Token expirado
      }
      return payload;
    } catch {
      return null;
    }
  }

  static async iniciarSesion(correo, clave) {
    // HU-01: "Con credenciales incorrectas o campos vacíos, se muestra un mensaje de error sin indicar cuál dato falló."
    if (!correo || !clave) {
      throw new Error('Credenciales incorrectas');
    }

    const usuario = Usuario.buscarPorCorreo(correo);
    if (!usuario || !usuario.activo) {
      throw new Error('Credenciales incorrectas');
    }

    const claveValida = Usuario.verificarClave(clave, usuario.contrasenaHash);
    if (!claveValida) {
      throw new Error('Credenciales incorrectas');
    }

    // Estrategia de actualización progresiva de hashes (rehash on login si es legacy)
    if (Usuario.necesitaActualizarHash(usuario.contrasenaHash)) {
      const nuevoHash = Usuario.hashClave(clave);
      Usuario.actualizarHash(usuario.idUsuario, nuevoHash);
      usuario.contrasenaHash = nuevoHash;
    }

    const token = this.generarToken({
      idUsuario: usuario.idUsuario,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol
    });

    return {
      usuario: usuario.toJSON(),
      token
    };
  }
}

module.exports = AuthService;

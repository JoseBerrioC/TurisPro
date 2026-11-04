const crypto = require('node:crypto');
const { Rol } = require('./enums');
const { getDatabase } = require('../database/connection');

// Constantes de seguridad criptográfica según estándares OWASP
const ITERACIONES_ACTUALES = 210000;
const ITERACIONES_LEGACY = 1000;

class Usuario {
  constructor({ idUsuario, nombre, correo, contrasenaHash, rol, activo = true, creadoEn = null }) {
    this.idUsuario = idUsuario;
    this.nombre = nombre;
    this.correo = correo;
    this.contrasenaHash = contrasenaHash;
    this.rol = rol;
    this.activo = Boolean(activo);
    this.creadoEn = creadoEn;
  }

  /**
   * Genera un hash criptográfico con PBKDF2 y SHA-512 utilizando 210,000 iteraciones.
   * Formato de almacenamiento: salt:hash:iteraciones
   */
  static hashClave(clave, iteraciones = ITERACIONES_ACTUALES) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(clave, salt, iteraciones, 64, 'sha512').toString('hex');
    return `${salt}:${hash}:${iteraciones}`;
  }

  /**
   * Verifica la contraseña garantizando compatibilidad retrospectiva con hashes legacy (1,000 iteraciones)
   * y comparando mediante crypto.timingSafeEqual para prevenir ataques de temporización.
   */
  static verificarClave(clave, contrasenaHash) {
    if (!contrasenaHash || typeof contrasenaHash !== 'string' || !contrasenaHash.includes(':')) {
      return false;
    }

    const partes = contrasenaHash.split(':');
    let salt, originalHash, iteraciones;

    if (partes.length === 2) {
      // Formato legacy histórico (1,000 iteraciones)
      [salt, originalHash] = partes;
      iteraciones = ITERACIONES_LEGACY;
    } else if (partes.length === 3) {
      // Formato mejorado con metadatos de iteraciones (210,000 iteraciones)
      [salt, originalHash, iteraciones] = partes;
      iteraciones = parseInt(iteraciones, 10);
      if (isNaN(iteraciones) || iteraciones <= 0) {
        return false;
      }
    } else {
      return false;
    }

    try {
      const hash = crypto.pbkdf2Sync(clave, salt, iteraciones, 64, 'sha512').toString('hex');
      const hashBuffer = Buffer.from(hash, 'utf8');
      const originalHashBuffer = Buffer.from(originalHash, 'utf8');

      // Validación obligatoria: los buffers deben tener exactamente la misma longitud antes de timingSafeEqual
      if (hashBuffer.length !== originalHashBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(hashBuffer, originalHashBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Determina si el hash almacenado requiere ser actualizado a los parámetros de seguridad vigentes (210,000 iteraciones)
   */
  static necesitaActualizarHash(contrasenaHash) {
    if (!contrasenaHash || typeof contrasenaHash !== 'string') return false;
    const partes = contrasenaHash.split(':');
    if (partes.length === 2) return true; // Requiere migración desde legacy
    if (partes.length === 3) {
      const iters = parseInt(partes[2], 10);
      return isNaN(iters) || iters < ITERACIONES_ACTUALES;
    }
    return false;
  }

  /**
   * Actualiza el hash de la contraseña en la base de datos de manera transparente tras login exitoso
   */
  static actualizarHash(idUsuario, nuevoHash) {
    const db = getDatabase();
    db.prepare('UPDATE usuarios SET contrasena_hash = ? WHERE id_usuario = ?').run(nuevoHash, idUsuario);
  }

  tienePermiso(accion) {
    // Definición de matriz de permisos por Rol (HU-02)
    const permisosPorRol = {
      [Rol.ADMINISTRADOR]: [
        'gestionar_usuarios',
        'ver_dashboard',
        'ver_proveedores',
        'registrar_proveedor',
        'editar_proveedor',
        'desactivar_proveedor',
        'gestionar_servicios',
        'gestionar_documentos',
        'evaluar_proveedor',
        'registrar_incidente',
        'analizar_riesgo',
        'comparar_proveedores',
        'ver_reportes',
        'configuracion'
      ],
      [Rol.GESTOR_PROVEEDORES]: [
        'ver_dashboard',
        'ver_proveedores',
        'registrar_proveedor',
        'editar_proveedor',
        'gestionar_servicios',
        'gestionar_documentos',
        'analizar_riesgo',
        'comparar_proveedores',
        'ver_reportes'
      ],
      [Rol.EVALUADOR]: [
        'ver_dashboard',
        'ver_proveedores',
        'evaluar_proveedor',
        'registrar_incidente',
        'analizar_riesgo',
        'comparar_proveedores',
        'ver_reportes'
      ]
    };

    const permisos = permisosPorRol[this.rol] || [];
    return permisos.includes(accion);
  }

  static crearUsuario({ nombre, correo, clave, rol }) {
    if (!nombre || !correo || !clave || !rol) {
      throw new Error('Faltan campos obligatorios para registrar el usuario');
    }
    if (!Object.values(Rol).includes(rol)) {
      throw new Error(`Rol inválido: ${rol}`);
    }

    const db = getDatabase();
    const contrasenaHash = this.hashClave(clave);

    const stmt = db.prepare(`
      INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, activo)
      VALUES (?, ?, ?, ?, 1)
    `);

    const result = stmt.run(nombre, correo.toLowerCase().trim(), contrasenaHash, rol);
    return new Usuario({
      idUsuario: Number(result.lastInsertRowid),
      nombre,
      correo: correo.toLowerCase().trim(),
      contrasenaHash,
      rol,
      activo: true
    });
  }

  static buscarPorCorreo(correo) {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM usuarios WHERE correo = ?').get(correo.toLowerCase().trim());
    if (!row) return null;
    return new Usuario({
      idUsuario: row.id_usuario,
      nombre: row.nombre,
      correo: row.correo,
      contrasenaHash: row.contrasena_hash,
      rol: row.rol,
      activo: row.activo,
      creadoEn: row.creado_en
    });
  }

  static buscarPorId(idUsuario) {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM usuarios WHERE id_usuario = ?').get(idUsuario);
    if (!row) return null;
    return new Usuario({
      idUsuario: row.id_usuario,
      nombre: row.nombre,
      correo: row.correo,
      contrasenaHash: row.contrasena_hash,
      rol: row.rol,
      activo: row.activo,
      creadoEn: row.creado_en
    });
  }

  static listarTodos() {
    const db = getDatabase();
    const rows = db.prepare('SELECT id_usuario, nombre, correo, rol, activo, creado_en FROM usuarios').all();
    return rows.map(r => ({
      idUsuario: r.id_usuario,
      nombre: r.nombre,
      correo: r.correo,
      rol: r.rol,
      activo: Boolean(r.activo),
      creadoEn: r.creado_en
    }));
  }

  toJSON() {
    return {
      idUsuario: this.idUsuario,
      nombre: this.nombre,
      correo: this.correo,
      rol: this.rol,
      activo: this.activo,
      creadoEn: this.creadoEn
    };
  }
}

module.exports = Usuario;

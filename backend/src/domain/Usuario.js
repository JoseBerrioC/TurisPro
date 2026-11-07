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

  static crearUsuario({ nombre, correo, clave, rol, activo = true }) {
    if (!nombre || !correo || !rol) {
      const err = new Error('Faltan campos obligatorios para registrar el usuario (nombre, correo, rol)');
      err.statusCode = 400;
      throw err;
    }

    const rolNormalizado = String(rol).toUpperCase().replace(/\s+/g, '_');
    const rolFinal = rolNormalizado === 'GESTOR_DE_PROVEEDORES' ? Rol.GESTOR_PROVEEDORES : rolNormalizado;

    if (!Object.values(Rol).includes(rolFinal)) {
      const err = new Error(`Rol inválido: ${rol}. Roles permitidos: ${Object.values(Rol).join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    const emailLimpio = correo.toLowerCase().trim();
    const db = getDatabase();

    const existente = this.buscarPorCorreo(emailLimpio);
    if (existente) {
      const err = new Error(`Ya existe un usuario corporativo registrado con el correo: ${emailLimpio}`);
      err.statusCode = 409;
      throw err;
    }

    const claveFinal = clave && String(clave).trim()
      ? String(clave).trim()
      : crypto.randomBytes(12).toString('base64url') + 'A1*!';

    const contrasenaHash = this.hashClave(claveFinal);
    const estadoActivo = activo ? 1 : 0;

    const stmt = db.prepare(`
      INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, activo)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(nombre.trim(), emailLimpio, contrasenaHash, rolFinal, estadoActivo);
    return new Usuario({
      idUsuario: Number(result.lastInsertRowid),
      nombre: nombre.trim(),
      correo: emailLimpio,
      contrasenaHash,
      rol: rolFinal,
      activo: Boolean(estadoActivo)
    });
  }

  static actualizarPerfil(idUsuario, { nombre, correo }) {
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      const err = new Error('El nombre completo es obligatorio');
      err.statusCode = 400;
      throw err;
    }
    if (!correo || typeof correo !== 'string' || !correo.trim()) {
      const err = new Error('El correo electrónico corporativo es obligatorio');
      err.statusCode = 400;
      throw err;
    }

    const emailLimpio = correo.trim().toLowerCase();
    const db = getDatabase();

    const duplicado = db.prepare('SELECT id_usuario FROM usuarios WHERE correo = ? AND id_usuario != ?').get(emailLimpio, idUsuario);
    if (duplicado) {
      const err = new Error(`El correo corporativo ya está en uso por otro usuario: ${emailLimpio}`);
      err.statusCode = 409;
      throw err;
    }

    db.prepare('UPDATE usuarios SET nombre = ?, correo = ? WHERE id_usuario = ?')
      .run(nombre.trim(), emailLimpio, idUsuario);

    return this.buscarPorId(idUsuario);
  }

  static cambiarClave(idUsuario, claveActual, claveNueva, confirmarClave) {
    if (!claveActual || !claveNueva || !confirmarClave) {
      const err = new Error('Debe ingresar la contraseña actual, la nueva contraseña y la confirmación');
      err.statusCode = 400;
      throw err;
    }

    if (claveNueva !== confirmarClave) {
      const err = new Error('La nueva contraseña y su confirmación no coinciden');
      err.statusCode = 400;
      throw err;
    }

    if (claveNueva.length < 8) {
      const err = new Error('La nueva contraseña debe tener un mínimo de 8 caracteres conforme a la política ISO 27001');
      err.statusCode = 400;
      throw err;
    }

    const db = getDatabase();
    const row = db.prepare('SELECT * FROM usuarios WHERE id_usuario = ?').get(idUsuario);
    if (!row) {
      const err = new Error('Usuario no encontrado');
      err.statusCode = 404;
      throw err;
    }

    const esValida = this.verificarClave(claveActual, row.contrasena_hash);
    if (!esValida) {
      const err = new Error('La contraseña actual ingresada es incorrecta');
      err.statusCode = 401;
      throw err;
    }

    if (claveActual === claveNueva) {
      const err = new Error('La nueva contraseña debe ser diferente a la contraseña actual');
      err.statusCode = 400;
      throw err;
    }

    const nuevoHash = this.hashClave(claveNueva, ITERACIONES_ACTUALES);
    this.actualizarHash(idUsuario, nuevoHash);

    return { exito: true };
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

  static listarTodos(filtros = {}) {
    const db = getDatabase();
    let query = 'SELECT id_usuario, nombre, correo, rol, activo, creado_en FROM usuarios WHERE 1=1';
    const params = [];

    if (filtros && filtros.busqueda) {
      query += ' AND (LOWER(nombre) LIKE ? OR LOWER(correo) LIKE ?)';
      const term = `%${filtros.busqueda.toLowerCase().trim()}%`;
      params.push(term, term);
    }

    if (filtros && filtros.rol) {
      const rolBuscado = String(filtros.rol).toUpperCase().replace(/\s+/g, '_');
      const rolFinal = rolBuscado === 'GESTOR_DE_PROVEEDORES' ? Rol.GESTOR_PROVEEDORES : rolBuscado;
      query += ' AND rol = ?';
      params.push(rolFinal);
    }

    if (filtros && filtros.activo !== undefined && filtros.activo !== null && filtros.activo !== '') {
      const act = (filtros.activo === '1' || filtros.activo === 1 || filtros.activo === 'true' || filtros.activo === true) ? 1 : 0;
      query += ' AND activo = ?';
      params.push(act);
    }

    query += ' ORDER BY id_usuario ASC';

    const rows = db.prepare(query).all(...params);
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

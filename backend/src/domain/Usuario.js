const crypto = require('node:crypto');
const { Rol } = require('./enums');
const { getDatabase } = require('../database/connection');

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

  static hashClave(clave) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(clave, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  static verificarClave(clave, contrasenaHash) {
    if (!contrasenaHash || !contrasenaHash.includes(':')) return false;
    const [salt, originalHash] = contrasenaHash.split(':');
    const hash = crypto.pbkdf2Sync(clave, salt, 1000, 64, 'sha512').toString('hex');
    return hash === originalHash;
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

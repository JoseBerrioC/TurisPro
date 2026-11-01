const { SeveridadIncidente, EstadoIncidente } = require('./enums');
const { getDatabase } = require('../database/connection');

class Incidente {
  constructor({
    idIncidente,
    idProveedor,
    idRegistradoPor,
    registradoPorNombre = null,
    tipo,
    severidad,
    estado = EstadoIncidente.ABIERTO,
    descripcion,
    fecha = null,
    actualizadoEn = null
  }) {
    this.idIncidente = idIncidente;
    this.idProveedor = idProveedor;
    this.idRegistradoPor = idRegistradoPor;
    this.registradoPorNombre = registradoPorNombre;
    this.tipo = tipo;
    this.severidad = severidad;
    this.estado = estado;
    this.descripcion = descripcion;
    this.fecha = fecha || new Date().toISOString();
    this.actualizadoEn = actualizadoEn;
  }

  static registrar({ idProveedor, idRegistradoPor, tipo, severidad, estado = EstadoIncidente.ABIERTO, descripcion }) {
    if (!idProveedor || !idRegistradoPor || !tipo || !severidad || !descripcion) {
      throw new Error('Faltan campos obligatorios para registrar el incidente');
    }

    if (!Object.values(SeveridadIncidente).includes(severidad)) {
      throw new Error(`Severidad inválida: ${severidad}. Valores permitidos: BAJA, MEDIA, ALTA`);
    }

    if (!Object.values(EstadoIncidente).includes(estado)) {
      throw new Error(`Estado inválido: ${estado}. Valores permitidos: ABIERTO, EN_SEGUIMIENTO, CERRADO`);
    }

    const db = getDatabase();
    const res = db.prepare(`
      INSERT INTO incidentes (id_proveedor, id_registrado_por, tipo, severidad, estado, descripcion)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(idProveedor, idRegistradoPor, tipo.trim(), severidad, estado, descripcion.trim());

    return new Incidente({
      idIncidente: Number(res.lastInsertRowid),
      idProveedor,
      idRegistradoPor,
      tipo: tipo.trim(),
      severidad,
      estado,
      descripcion: descripcion.trim()
    });
  }

  static cambiarEstado(idIncidente, nuevoEstado) {
    if (!Object.values(EstadoIncidente).includes(nuevoEstado)) {
      throw new Error(`Estado inválido: ${nuevoEstado}`);
    }

    const incActual = this.buscarPorId(idIncidente);
    if (!incActual) {
      throw new Error(`Incidente #${idIncidente} no encontrado`);
    }

    // Regla de transición del Diagrama de Estados UML (stm Incidente)
    // Abierto -> En seguimiento -> Cerrado  O  Abierto -> Cerrado
    if (incActual.estado === EstadoIncidente.CERRADO) {
      throw new Error('El incidente ya se encuentra cerrado y no permite nuevas transiciones');
    }

    const db = getDatabase();
    db.prepare(`
      UPDATE incidentes
      SET estado = ?, actualizado_en = CURRENT_TIMESTAMP
      WHERE id_incidente = ?
    `).run(nuevoEstado, idIncidente);

    return this.buscarPorId(idIncidente);
  }

  static listarPorProveedor(idProveedor) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT i.*, u.nombre as registrado_por_nombre
      FROM incidentes i
      LEFT JOIN usuarios u ON i.id_registrado_por = u.id_usuario
      WHERE i.id_proveedor = ?
      ORDER BY i.fecha DESC
    `).all(idProveedor);

    return rows.map(r => new Incidente({
      idIncidente: r.id_incidente,
      idProveedor: r.id_proveedor,
      idRegistradoPor: r.id_registrado_por,
      registradoPorNombre: r.registrado_por_nombre,
      tipo: r.tipo,
      severidad: r.severidad,
      estado: r.estado,
      descripcion: r.descripcion,
      fecha: r.fecha,
      actualizadoEn: r.actualizado_en
    }));
  }

  static buscarPorId(idIncidente) {
    const db = getDatabase();
    const r = db.prepare(`
      SELECT i.*, u.nombre as registrado_por_nombre
      FROM incidentes i
      LEFT JOIN usuarios u ON i.id_registrado_por = u.id_usuario
      WHERE i.id_incidente = ?
    `).get(idIncidente);

    if (!r) return null;
    return new Incidente({
      idIncidente: r.id_incidente,
      idProveedor: r.id_proveedor,
      idRegistradoPor: r.id_registrado_por,
      registradoPorNombre: r.registrado_por_nombre,
      tipo: r.tipo,
      severidad: r.severidad,
      estado: r.estado,
      descripcion: r.descripcion,
      fecha: r.fecha,
      actualizadoEn: r.actualizado_en
    });
  }

  static filtrar({ tipo, severidad, estado, idProveedor }) {
    const db = getDatabase();
    let sql = `
      SELECT i.*, u.nombre as registrado_por_nombre, p.razon_social as proveedor_nombre
      FROM incidentes i
      LEFT JOIN usuarios u ON i.id_registrado_por = u.id_usuario
      INNER JOIN proveedores p ON i.id_proveedor = p.id_proveedor
      WHERE 1=1
    `;
    const params = [];

    if (tipo) {
      sql += ' AND i.tipo LIKE ?';
      params.push(`%${tipo}%`);
    }
    if (severidad) {
      sql += ' AND i.severidad = ?';
      params.push(severidad);
    }
    if (estado) {
      sql += ' AND i.estado = ?';
      params.push(estado);
    }
    if (idProveedor) {
      sql += ' AND i.id_proveedor = ?';
      params.push(idProveedor);
    }

    sql += ' ORDER BY i.fecha DESC';
    const rows = db.prepare(sql).all(...params);

    return rows.map(r => ({
      ...new Incidente({
        idIncidente: r.id_incidente,
        idProveedor: r.id_proveedor,
        idRegistradoPor: r.id_registrado_por,
        registradoPorNombre: r.registrado_por_nombre,
        tipo: r.tipo,
        severidad: r.severidad,
        estado: r.estado,
        descripcion: r.descripcion,
        fecha: r.fecha,
        actualizadoEn: r.actualizado_en
      }).toJSON(),
      proveedorNombre: r.proveedor_nombre
    }));
  }

  toJSON() {
    return {
      idIncidente: this.idIncidente,
      idProveedor: this.idProveedor,
      idRegistradoPor: this.idRegistradoPor,
      registradoPorNombre: this.registradoPorNombre,
      tipo: this.tipo,
      severidad: this.severidad,
      estado: this.estado,
      descripcion: this.descripcion,
      fecha: this.fecha,
      actualizadoEn: this.actualizadoEn
    };
  }
}

module.exports = Incidente;

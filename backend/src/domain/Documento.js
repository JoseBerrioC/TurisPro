const { EstadoDocumento } = require('./enums');
const { getDatabase } = require('../database/connection');

class Documento {
  constructor({ idDocumento, idProveedor, tipo, fechaEmision, fechaVencimiento, archivoUrl = null, creadoEn = null }) {
    this.idDocumento = idDocumento;
    this.idProveedor = idProveedor;
    this.tipo = tipo;
    this.fechaEmision = fechaEmision;
    this.fechaVencimiento = fechaVencimiento;
    this.archivoUrl = archivoUrl;
    this.creadoEn = creadoEn;
    this.estado = this.calcularEstado();
  }

  /**
   * Parsea una fecha a milisegundos UTC a nivel de día (ignorando horas y desfases de zona horaria)
   */
  static parsearFechaUTC(fecha) {
    if (!fecha) return Date.now();
    if (fecha instanceof Date) {
      return Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    }
    if (typeof fecha === 'string') {
      const match = fecha.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        return Date.UTC(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
      }
    }
    const d = new Date(fecha);
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  }

  diasParaVencer(fechaReferencia = new Date()) {
    const utc1 = Documento.parsearFechaUTC(fechaReferencia);
    const utc2 = Documento.parsearFechaUTC(this.fechaVencimiento);
    const msPorDia = 1000 * 60 * 60 * 24;
    return Math.floor((utc2 - utc1) / msPorDia);
  }

  calcularEstado(fechaReferencia = new Date()) {
    const dias = this.diasParaVencer(fechaReferencia);
    if (dias < 0) {
      return EstadoDocumento.VENCIDO;
    }
    if (dias <= 30) {
      return EstadoDocumento.POR_VENCER;
    }
    return EstadoDocumento.VIGENTE;
  }

  static registrar({ idProveedor, tipo, fechaEmision, fechaVencimiento, archivoUrl = null }) {
    if (!idProveedor || !tipo || !fechaVencimiento) {
      throw new Error('Tipo y fecha de vencimiento son requeridos para cargar un documento');
    }

    const emision = fechaEmision || new Date().toISOString().slice(0, 10);
    const db = getDatabase();

    const res = db.prepare(`
      INSERT INTO documentos (id_proveedor, tipo, fecha_emision, fecha_vencimiento, archivo_url)
      VALUES (?, ?, ?, ?, ?)
    `).run(idProveedor, tipo.trim(), emision, fechaVencimiento, archivoUrl);

    return new Documento({
      idDocumento: Number(res.lastInsertRowid),
      idProveedor,
      tipo: tipo.trim(),
      fechaEmision: emision,
      fechaVencimiento,
      archivoUrl
    });
  }

  static listarPorProveedor(idProveedor) {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM documentos WHERE id_proveedor = ? ORDER BY fecha_vencimiento ASC').all(idProveedor);
    return rows.map(r => new Documento({
      idDocumento: r.id_documento,
      idProveedor: r.id_proveedor,
      tipo: r.tipo,
      fechaEmision: r.fecha_emision,
      fechaVencimiento: r.fecha_vencimiento,
      archivoUrl: r.archivo_url,
      creadoEn: r.creado_en
    }));
  }

  static listarGlobal() {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT d.*, p.razon_social as proveedor_nombre 
      FROM documentos d
      INNER JOIN proveedores p ON d.id_proveedor = p.id_proveedor
      ORDER BY d.fecha_vencimiento ASC
    `).all();

    return rows.map(r => {
      const doc = new Documento({
        idDocumento: r.id_documento,
        idProveedor: r.id_proveedor,
        tipo: r.tipo,
        fechaEmision: r.fecha_emision,
        fechaVencimiento: r.fecha_vencimiento,
        archivoUrl: r.archivo_url,
        creadoEn: r.creado_en
      });
      return {
        ...doc.toJSON(),
        proveedorNombre: r.proveedor_nombre
      };
    });
  }

  static buscarPorId(idDocumento) {
    const db = getDatabase();
    const r = db.prepare('SELECT * FROM documentos WHERE id_documento = ?').get(idDocumento);
    if (!r) return null;
    return new Documento({
      idDocumento: r.id_documento,
      idProveedor: r.id_proveedor,
      tipo: r.tipo,
      fechaEmision: r.fecha_emision,
      fechaVencimiento: r.fecha_vencimiento,
      archivoUrl: r.archivo_url,
      creadoEn: r.creado_en
    });
  }

  static eliminar(idDocumento) {
    const db = getDatabase();
    const res = db.prepare('DELETE FROM documentos WHERE id_documento = ?').run(idDocumento);
    return res.changes > 0;
  }

  toJSON() {
    return {
      idDocumento: this.idDocumento,
      idProveedor: this.idProveedor,
      tipo: this.tipo,
      fechaEmision: this.fechaEmision,
      fechaVencimiento: this.fechaVencimiento,
      diasParaVencer: this.diasParaVencer(),
      estado: this.calcularEstado(),
      archivoUrl: this.archivoUrl,
      creadoEn: this.creadoEn
    };
  }
}

module.exports = Documento;

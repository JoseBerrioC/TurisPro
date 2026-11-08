const { TipoProveedor, NivelRiesgo, EstadoProveedor } = require('./enums');
const { getDatabase } = require('../database/connection');
const ZonaCobertura = require('./ZonaCobertura');

class Proveedor {
  constructor({
    idProveedor,
    razonSocial,
    nit,
    tipo,
    correo,
    telefono = '',
    direccion = '',
    activo = true,
    estadoCiclo = EstadoProveedor.REGISTRADO,
    nivelRiesgo = NivelRiesgo.SIN_DATOS,
    puntajeRiesgo = null,
    zonas = [],
    creadoEn = null,
    actualizadoEn = null
  }) {
    this.idProveedor = idProveedor;
    this.razonSocial = razonSocial;
    this.nit = nit;
    this.tipo = tipo;
    this.correo = correo;
    this.telefono = telefono || '';
    this.direccion = direccion || '';
    this.activo = Boolean(activo);
    this.estadoCiclo = estadoCiclo || (this.activo ? EstadoProveedor.ACTIVO : EstadoProveedor.INACTIVO);
    this.nivelRiesgo = nivelRiesgo || NivelRiesgo.SIN_DATOS;
    this.puntajeRiesgo = puntajeRiesgo !== null ? Number(puntajeRiesgo) : null;
    this.zonas = zonas;
    this.creadoEn = creadoEn;
    this.actualizadoEn = actualizadoEn;
  }

  promedioEvaluaciones() {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT AVG(promedio) as promedio_general
      FROM evaluaciones
      WHERE id_proveedor = ?
    `).get(this.idProveedor);

    if (!row || row.promedio_general === null) {
      return null;
    }
    return Math.round(Number(row.promedio_general) * 100) / 100;
  }

  actualizarNivelRiesgo(nuevoNivel, puntaje) {
    this.nivelRiesgo = nuevoNivel;
    this.puntajeRiesgo = Math.round(puntaje);
    // Según diagrama de estados UML, una vez analizado pasa a estar Activo con el nivel de riesgo
    this.estadoCiclo = EstadoProveedor.ACTIVO;

    const db = getDatabase();
    db.prepare(`
      UPDATE proveedores
      SET nivel_riesgo = ?, puntaje_riesgo = ?, estado_ciclo = ?, actualizado_en = CURRENT_TIMESTAMP
      WHERE id_proveedor = ?
    `).run(nuevoNivel, this.puntajeRiesgo, this.estadoCiclo, this.idProveedor);
  }

  static registrar({ razonSocial, nit, tipo, correo, telefono = '', direccion = '', zonasIds = [] }) {
    if (!razonSocial || !nit || !tipo || !correo) {
      const faltantes = [];
      if (!razonSocial) faltantes.push('razón social/nombre');
      if (!nit) faltantes.push('NIT');
      if (!tipo) faltantes.push('tipo');
      if (!correo) faltantes.push('correo');
      throw new Error(`Faltan datos obligatorios: ${faltantes.join(', ')}`);
    }

    if (!Object.values(TipoProveedor).includes(tipo)) {
      throw new Error(`Tipo de proveedor inválido: ${tipo}`);
    }

    const db = getDatabase();

    // Comprobar NIT único
    const existeNit = db.prepare('SELECT id_proveedor FROM proveedores WHERE nit = ?').get(nit.trim());
    if (existeNit) {
      throw new Error(`Ya existe un proveedor registrado con el NIT: ${nit}`);
    }

    const res = db.prepare(`
      INSERT INTO proveedores (
        razon_social, nit, tipo, correo, telefono, direccion,
        activo, estado_ciclo, nivel_riesgo
      ) VALUES (?, ?, ?, ?, ?, ?, 1, 'Registrado', 'SIN_DATOS')
    `).run(
      razonSocial.trim(),
      nit.trim(),
      tipo,
      correo.trim().toLowerCase(),
      telefono ? telefono.trim() : '',
      direccion ? direccion.trim() : ''
    );

    const idProveedor = Number(res.lastInsertRowid);

    // Asociar zonas de cobertura si se proporcionaron
    if (Array.isArray(zonasIds) && zonasIds.length > 0) {
      const stmtZona = db.prepare('INSERT OR IGNORE INTO proveedor_zonas (id_proveedor, id_zona) VALUES (?, ?)');
      for (const idZona of zonasIds) {
        stmtZona.run(idProveedor, Number(idZona));
      }
    }

    return this.verDetalle(idProveedor);
  }

  static verDetalle(idProveedor) {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM proveedores WHERE id_proveedor = ?').get(idProveedor);
    if (!row) return null;

    const zonas = ZonaCobertura.obtenerPorProveedor(idProveedor);

    return new Proveedor({
      idProveedor: row.id_proveedor,
      razonSocial: row.razon_social,
      nit: row.nit,
      tipo: row.tipo,
      correo: row.correo,
      telefono: row.telefono,
      direccion: row.direccion,
      activo: Boolean(row.activo),
      estadoCiclo: row.estado_ciclo,
      nivelRiesgo: row.nivel_riesgo,
      puntajeRiesgo: row.puntaje_riesgo,
      zonas,
      creadoEn: row.creado_en,
      actualizadoEn: row.actualizado_en
    });
  }

  static buscar({ texto = '', tipo = '', zona = '', estado = '', riesgo = '' } = {}) {
    const db = getDatabase();
    let sql = `
      SELECT DISTINCT p.*
      FROM proveedores p
      LEFT JOIN proveedor_zonas pz ON p.id_proveedor = pz.id_proveedor
      LEFT JOIN zonas_cobertura z ON pz.id_zona = z.id_zona
      WHERE 1=1
    `;
    const params = [];

    if (texto && texto.trim()) {
      const q = `%${texto.trim()}%`;
      const idQuery = `%${texto.trim().replace(/^#/, '')}%`;
      sql += ` AND (p.razon_social LIKE ? OR p.nit LIKE ? OR CAST(p.id_proveedor AS TEXT) LIKE ? OR p.correo LIKE ? OR p.telefono LIKE ?)`;
      params.push(q, q, idQuery, q, q);
    }

    if (tipo && tipo.trim()) {
      sql += ` AND p.tipo = ?`;
      params.push(tipo.trim());
    }

    if (zona && zona.trim()) {
      sql += ` AND (z.ciudad LIKE ? OR z.pais LIKE ?)`;
      params.push(`%${zona.trim()}%`, `%${zona.trim()}%`);
    }

    if (estado !== undefined && estado !== '') {
      if (estado === 'activo' || estado === 'true' || estado === true || estado === '1' || estado === 1) {
        sql += ` AND p.activo = 1`;
      } else if (estado === 'inactivo' || estado === 'false' || estado === false || estado === '0' || estado === 0) {
        sql += ` AND p.activo = 0`;
      } else if (['Registrado', 'Activo', 'Inactivo'].includes(estado)) {
        sql += ` AND p.estado_ciclo = ?`;
        params.push(estado);
      }
    }

    if (riesgo && riesgo.trim()) {
      sql += ` AND p.nivel_riesgo = ?`;
      params.push(riesgo.trim().toUpperCase());
    }

    sql += ` ORDER BY p.razon_social ASC`;
    const rows = db.prepare(sql).all(...params);

    return rows.map(r => {
      const zonas = ZonaCobertura.obtenerPorProveedor(r.id_proveedor);
      return new Proveedor({
        idProveedor: r.id_proveedor,
        razonSocial: r.razon_social,
        nit: r.nit,
        tipo: r.tipo,
        correo: r.correo,
        telefono: r.telefono,
        direccion: r.direccion,
        activo: Boolean(r.activo),
        estadoCiclo: r.estado_ciclo,
        nivelRiesgo: r.nivel_riesgo,
        puntajeRiesgo: r.puntaje_riesgo,
        zonas,
        creadoEn: r.creado_en,
        actualizadoEn: r.actualizado_en
      });
    });
  }

  static editar(idProveedor, { razonSocial, tipo, correo, telefono, direccion, zonasIds }) {
    const provActual = this.verDetalle(idProveedor);
    if (!provActual) {
      throw new Error(`Proveedor #${idProveedor} no encontrado`);
    }

    const nuevoNombre = razonSocial !== undefined ? razonSocial.trim() : provActual.razonSocial;
    const nuevoTipo = tipo !== undefined ? tipo : provActual.tipo;
    const nuevoCorreo = correo !== undefined ? correo.trim().toLowerCase() : provActual.correo;
    const nuevoTel = telefono !== undefined ? telefono.trim() : provActual.telefono;
    const nuevaDir = direccion !== undefined ? direccion.trim() : provActual.direccion;

    if (nuevoTipo && !Object.values(TipoProveedor).includes(nuevoTipo)) {
      throw new Error(`Tipo de proveedor inválido: ${nuevoTipo}`);
    }

    const db = getDatabase();
    db.prepare(`
      UPDATE proveedores
      SET razon_social = ?, tipo = ?, correo = ?, telefono = ?, direccion = ?, actualizado_en = CURRENT_TIMESTAMP
      WHERE id_proveedor = ?
    `).run(nuevoNombre, nuevoTipo, nuevoCorreo, nuevoTel, nuevaDir, idProveedor);

    if (Array.isArray(zonasIds)) {
      db.prepare('DELETE FROM proveedor_zonas WHERE id_proveedor = ?').run(idProveedor);
      const stmtZona = db.prepare('INSERT INTO proveedor_zonas (id_proveedor, id_zona) VALUES (?, ?)');
      for (const zid of zonasIds) {
        stmtZona.run(idProveedor, Number(zid));
      }
    }

    return this.verDetalle(idProveedor);
  }

  static desactivar(idProveedor) {
    const db = getDatabase();
    const res = db.prepare(`
      UPDATE proveedores
      SET activo = 0, estado_ciclo = 'Inactivo', actualizado_en = CURRENT_TIMESTAMP
      WHERE id_proveedor = ?
    `).run(idProveedor);

    if (res.changes === 0) {
      throw new Error(`Proveedor #${idProveedor} no encontrado`);
    }
    return this.verDetalle(idProveedor);
  }

  static reactivar(idProveedor) {
    const db = getDatabase();
    const res = db.prepare(`
      UPDATE proveedores
      SET activo = 1, estado_ciclo = 'Activo', actualizado_en = CURRENT_TIMESTAMP
      WHERE id_proveedor = ?
    `).run(idProveedor);

    if (res.changes === 0) {
      throw new Error(`Proveedor #${idProveedor} no encontrado`);
    }
    return this.verDetalle(idProveedor);
  }

  toJSON() {
    return {
      idProveedor: this.idProveedor,
      razonSocial: this.razonSocial,
      nit: this.nit,
      tipo: this.tipo,
      correo: this.correo,
      telefono: this.telefono,
      direccion: this.direccion,
      activo: this.activo,
      estadoCiclo: this.estadoCiclo,
      nivelRiesgo: this.nivelRiesgo,
      puntajeRiesgo: this.puntajeRiesgo,
      zonas: this.zonas.map(z => ({ idZona: z.idZona, pais: z.pais, ciudad: z.ciudad })),
      creadoEn: this.creadoEn,
      actualizadoEn: this.actualizadoEn
    };
  }
}

module.exports = Proveedor;

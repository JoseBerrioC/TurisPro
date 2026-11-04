const { getDatabase } = require('../database/connection');

class Servicio {
  constructor({ idServicio, idProveedor, nombre, descripcion, tarifa, unidad, vigenteDesde, vigenteHasta, creadoEn = null }) {
    this.idServicio = idServicio;
    this.idProveedor = idProveedor;
    this.nombre = nombre;
    this.descripcion = descripcion;
    this.tarifa = Number(tarifa);
    this.unidad = unidad;
    this.vigenteDesde = vigenteDesde;
    this.vigenteHasta = vigenteHasta;
    this.creadoEn = creadoEn;
  }

  estaVigente() {
    const hoy = new Date().toISOString().slice(0, 10);
    const desde = new Date(this.vigenteDesde).toISOString().slice(0, 10);
    const hasta = new Date(this.vigenteHasta).toISOString().slice(0, 10);
    return hoy >= desde && hoy <= hasta;
  }

  static agregar({ idProveedor, nombre, descripcion, tarifa, unidad, vigenteDesde, vigenteHasta }) {
    if (!idProveedor || !nombre || tarifa === undefined || !unidad || !vigenteDesde || !vigenteHasta) {
      throw new Error('Faltan campos obligatorios para registrar el servicio (nombre, tarifa, unidad, vigencia)');
    }

    const numTarifa = Number(tarifa);
    if (isNaN(numTarifa) || numTarifa <= 0) {
      throw new Error('La tarifa del servicio debe ser un número positivo');
    }

    const db = getDatabase();
    const res = db.prepare(`
      INSERT INTO servicios (id_proveedor, nombre, descripcion, tarifa, unidad, vigente_desde, vigente_hasta)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(idProveedor, nombre.trim(), descripcion || '', numTarifa, unidad.trim(), vigenteDesde, vigenteHasta);

    return new Servicio({
      idServicio: Number(res.lastInsertRowid),
      idProveedor,
      nombre: nombre.trim(),
      descripcion: descripcion || '',
      tarifa: numTarifa,
      unidad: unidad.trim(),
      vigenteDesde,
      vigenteHasta
    });
  }

  static editar(idServicio, { nombre, descripcion, tarifa, unidad, vigenteDesde, vigenteHasta }) {
    const db = getDatabase();
    const servicioActual = this.buscarPorId(idServicio);
    if (!servicioActual) {
      throw new Error(`Servicio #${idServicio} no encontrado`);
    }

    const nuevoNombre = nombre !== undefined ? nombre.trim() : servicioActual.nombre;
    const nuevaDescripcion = descripcion !== undefined ? descripcion : servicioActual.descripcion;
    let nuevaTarifa = servicioActual.tarifa;
    if (tarifa !== undefined) {
      const num = Number(tarifa);
      if (isNaN(num) || num <= 0) throw new Error('La tarifa debe ser un número positivo');
      nuevaTarifa = num;
    }
    const nuevaUnidad = unidad !== undefined ? unidad.trim() : servicioActual.unidad;
    const nuevaDesde = vigenteDesde !== undefined ? vigenteDesde : servicioActual.vigenteDesde;
    const nuevaHasta = vigenteHasta !== undefined ? vigenteHasta : servicioActual.vigenteHasta;

    db.prepare(`
      UPDATE servicios
      SET nombre = ?, descripcion = ?, tarifa = ?, unidad = ?, vigente_desde = ?, vigente_hasta = ?
      WHERE id_servicio = ?
    `).run(nuevoNombre, nuevaDescripcion, nuevaTarifa, nuevaUnidad, nuevaDesde, nuevaHasta, idServicio);

    return this.buscarPorId(idServicio);
  }

  static eliminar(idServicio) {
    const db = getDatabase();
    const res = db.prepare('DELETE FROM servicios WHERE id_servicio = ?').run(idServicio);
    if (res.changes === 0) {
      throw new Error(`Servicio #${idServicio} no encontrado para eliminar`);
    }
    return true;
  }

  static buscarPorId(idServicio) {
    const db = getDatabase();
    const r = db.prepare('SELECT * FROM servicios WHERE id_servicio = ?').get(idServicio);
    if (!r) return null;
    return new Servicio({
      idServicio: r.id_servicio,
      idProveedor: r.id_proveedor,
      nombre: r.nombre,
      descripcion: r.descripcion,
      tarifa: r.tarifa,
      unidad: r.unidad,
      vigenteDesde: r.vigente_desde,
      vigenteHasta: r.vigente_hasta,
      creadoEn: r.creado_en
    });
  }

  static listarPorProveedor(idProveedor) {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM servicios WHERE id_proveedor = ? ORDER BY nombre ASC').all(idProveedor);
    return rows.map(r => new Servicio({
      idServicio: r.id_servicio,
      idProveedor: r.id_proveedor,
      nombre: r.nombre,
      descripcion: r.descripcion,
      tarifa: r.tarifa,
      unidad: r.unidad,
      vigenteDesde: r.vigente_desde,
      vigenteHasta: r.vigente_hasta,
      creadoEn: r.creado_en
    }));
  }

  toJSON() {
    return {
      idServicio: this.idServicio,
      idProveedor: this.idProveedor,
      nombre: this.nombre,
      descripcion: this.descripcion,
      tarifa: this.tarifa,
      unidad: this.unidad,
      vigenteDesde: this.vigenteDesde,
      vigenteHasta: this.vigenteHasta,
      estaVigente: this.estaVigente()
    };
  }
}

module.exports = Servicio;

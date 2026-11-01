const { getDatabase } = require('../database/connection');

class ZonaCobertura {
  constructor({ idZona, pais, ciudad, descripcion = '' }) {
    this.idZona = idZona;
    this.pais = pais;
    this.ciudad = ciudad;
    this.descripcion = descripcion;
  }

  static crear({ pais, ciudad, descripcion }) {
    if (!pais || !ciudad) {
      throw new Error('País y ciudad son obligatorios para la zona de cobertura');
    }
    const db = getDatabase();
    const res = db.prepare(`
      INSERT INTO zonas_cobertura (pais, ciudad, descripcion)
      VALUES (?, ?, ?)
    `).run(pais, ciudad, descripcion || '');

    return new ZonaCobertura({
      idZona: Number(res.lastInsertRowid),
      pais,
      ciudad,
      descripcion
    });
  }

  static listarTodas() {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM zonas_cobertura ORDER BY pais, ciudad').all();
    return rows.map(r => new ZonaCobertura({
      idZona: r.id_zona,
      pais: r.pais,
      ciudad: r.ciudad,
      descripcion: r.descripcion
    }));
  }

  static buscarPorId(idZona) {
    const db = getDatabase();
    const r = db.prepare('SELECT * FROM zonas_cobertura WHERE id_zona = ?').get(idZona);
    if (!r) return null;
    return new ZonaCobertura({
      idZona: r.id_zona,
      pais: r.pais,
      ciudad: r.ciudad,
      descripcion: r.descripcion
    });
  }

  static obtenerPorProveedor(idProveedor) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT z.* FROM zonas_cobertura z
      INNER JOIN proveedor_zonas pz ON z.id_zona = pz.id_zona
      WHERE pz.id_proveedor = ?
    `).all(idProveedor);
    return rows.map(r => new ZonaCobertura({
      idZona: r.id_zona,
      pais: r.pais,
      ciudad: r.ciudad,
      descripcion: r.descripcion
    }));
  }
}

module.exports = ZonaCobertura;

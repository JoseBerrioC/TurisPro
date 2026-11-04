const { getDatabase } = require('../database/connection');
const FactorRiesgo = require('./FactorRiesgo');

class AnalisisRiesgo {
  constructor({
    idAnalisis,
    idProveedor,
    puntaje,
    nivel,
    explicacion,
    origenExplicacion,
    fechaCalculo = null,
    recomendacion = '',
    factores = []
  }) {
    this.idAnalisis = idAnalisis;
    this.idProveedor = idProveedor;
    this.puntaje = Math.round(Number(puntaje));
    this.nivel = nivel;
    this.explicacion = explicacion;
    this.origenExplicacion = origenExplicacion;
    this.fechaCalculo = fechaCalculo || new Date().toISOString();
    this.recomendacion = recomendacion || '';
    this.factores = factores;
  }

  static guardar({ idProveedor, puntaje, nivel, explicacion, origenExplicacion, recomendacion, factores }) {
    const db = getDatabase();
    const res = db.prepare(`
      INSERT INTO analisis_riesgo (id_proveedor, puntaje, nivel, explicacion, origen_explicacion, recomendacion)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(idProveedor, Math.round(puntaje), nivel, explicacion, origenExplicacion, recomendacion || '');

    const idAnalisis = Number(res.lastInsertRowid);
    const factoresGuardados = [];

    const stmtFactor = db.prepare(`
      INSERT INTO factores_riesgo (id_analisis, nombre, peso, valor, aporte, descripcion)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const factor of factores) {
      const fRes = stmtFactor.run(
        idAnalisis,
        factor.nombre,
        factor.peso,
        factor.valor,
        factor.aporte,
        factor.descripcion
      );
      factoresGuardados.push(new FactorRiesgo({
        idFactor: Number(fRes.lastInsertRowid),
        idAnalisis,
        nombre: factor.nombre,
        peso: factor.peso,
        valor: factor.valor,
        aporte: factor.aporte,
        descripcion: factor.descripcion
      }));
    }

    return new AnalisisRiesgo({
      idAnalisis,
      idProveedor,
      puntaje,
      nivel,
      explicacion,
      origenExplicacion,
      recomendacion,
      factores: factoresGuardados
    });
  }

  static obtenerUltimo(idProveedor) {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT * FROM analisis_riesgo
      WHERE id_proveedor = ?
      ORDER BY fecha_calculo DESC, id_analisis DESC
      LIMIT 1
    `).get(idProveedor);

    if (!row) return null;

    const factoresRows = db.prepare(`
      SELECT * FROM factores_riesgo
      WHERE id_analisis = ?
    `).all(row.id_analisis);

    const factores = factoresRows.map(f => new FactorRiesgo({
      idFactor: f.id_factor,
      idAnalisis: f.id_analisis,
      nombre: f.nombre,
      peso: f.peso,
      valor: f.valor,
      aporte: f.aporte,
      descripcion: f.descripcion
    }));

    return new AnalisisRiesgo({
      idAnalisis: row.id_analisis,
      idProveedor: row.id_proveedor,
      puntaje: row.puntaje,
      nivel: row.nivel,
      explicacion: row.explicacion,
      origenExplicacion: row.origen_explicacion,
      fechaCalculo: row.fecha_calculo,
      recomendacion: row.recomendacion,
      factores
    });
  }

  verFactores() {
    return this.factores;
  }

  toJSON() {
    return {
      idAnalisis: this.idAnalisis,
      idProveedor: this.idProveedor,
      puntaje: this.puntaje,
      nivel: this.nivel,
      explicacion: this.explicacion,
      origenExplicacion: this.origenExplicacion,
      fechaCalculo: this.fechaCalculo,
      recomendacion: this.recomendacion,
      avisoHumano: 'La decisión final sobre el proveedor siempre la toma una persona.',
      factores: this.factores.map(f => f.toJSON ? f.toJSON() : f)
    };
  }
}

module.exports = AnalisisRiesgo;

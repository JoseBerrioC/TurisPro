const Proveedor = require('../domain/Proveedor');
const MotorRiesgo = require('../services/MotorRiesgo');
const { getDatabase } = require('../database/connection');

const motorRiesgo = new MotorRiesgo();

class RiesgoController {
  static async consultarRiesgo(idProveedor) {
    // Diagrama de secuencia UML: sd Consultar riesgo de un proveedor
    const prov = Proveedor.verDetalle(Number(idProveedor));
    if (!prov) {
      return { status: 404, body: { error: `Proveedor #${idProveedor} no existe` } };
    }

    const resultado = await motorRiesgo.analizar(prov, false);
    return {
      status: 200,
      body: {
        idProveedor: prov.idProveedor,
        razonSocial: prov.razonSocial,
        reutilizado: resultado.reutilizado,
        mensaje: resultado.mensaje,
        avisoHumano: 'La decisión final sobre el proveedor siempre la toma una persona.',
        analisis: resultado.analisis ? resultado.analisis.toJSON() : null,
        nivelRiesgoActual: prov.nivelRiesgo,
        puntajeRiesgoActual: prov.puntajeRiesgo
      }
    };
  }

  static async recalcularRiesgo(idProveedor) {
    // HU-29: Recalcular riesgo forzosamente ante cambios
    const prov = Proveedor.verDetalle(Number(idProveedor));
    if (!prov) {
      return { status: 404, body: { error: `Proveedor #${idProveedor} no existe` } };
    }

    const resultado = await motorRiesgo.analizar(prov, true);
    return {
      status: 200,
      body: {
        idProveedor: prov.idProveedor,
        razonSocial: prov.razonSocial,
        reutilizado: false,
        mensaje: resultado.mensaje,
        avisoHumano: 'La decisión final sobre el proveedor siempre la toma una persona.',
        analisis: resultado.analisis ? resultado.analisis.toJSON() : null,
        nivelRiesgoActual: prov.nivelRiesgo,
        puntajeRiesgoActual: prov.puntajeRiesgo
      }
    };
  }

  static vistaGlobal(query) {
    // HU-31: Vista global de análisis de riesgo (seleccionando únicamente el análisis más reciente para evitar duplicados)
    const db = getDatabase();
    let sql = `
      SELECT p.id_proveedor, p.razon_social, p.tipo, p.nivel_riesgo, p.puntaje_riesgo,
             ar.id_analisis, ar.explicacion, ar.origen_explicacion, ar.recomendacion, ar.fecha_calculo
      FROM proveedores p
      LEFT JOIN analisis_riesgo ar ON ar.id_analisis = (
        SELECT MAX(id_analisis) FROM analisis_riesgo WHERE id_proveedor = p.id_proveedor
      )
      WHERE p.activo = 1
    `;
    const params = [];

    if (query?.nivel) {
      sql += ' AND p.nivel_riesgo = ?';
      params.push(query.nivel.toUpperCase());
    }

    sql += ' ORDER BY p.puntaje_riesgo DESC, p.razon_social ASC';
    const rows = db.prepare(sql).all(...params);

    return {
      status: 200,
      body: {
        total: rows.length,
        avisoHumano: 'La decisión final sobre el proveedor siempre la toma una persona.',
        items: rows.map(r => ({
          idProveedor: r.id_proveedor,
          razonSocial: r.razon_social,
          tipo: r.tipo,
          nivelRiesgo: r.nivel_riesgo,
          puntajeRiesgo: r.puntaje_riesgo,
          ultimoAnalisis: r.id_analisis ? {
            idAnalisis: r.id_analisis,
            explicacion: r.explicacion,
            origenExplicacion: r.origen_explicacion,
            recomendacion: r.recomendacion,
            fechaCalculo: r.fecha_calculo
          } : null
        }))
      }
    };
  }
}

module.exports = RiesgoController;

const Evaluacion = require('../domain/Evaluacion');
const Proveedor = require('../domain/Proveedor');
const { getDatabase } = require('../database/connection');

class EvaluacionController {
  static registrar(idProveedor, body, usuario) {
    // HU-09: Registrar evaluación con 5 criterios (1 a 5) y comentario
    const prov = Proveedor.verDetalle(Number(idProveedor));
    if (!prov) {
      return { status: 404, body: { error: `Proveedor #${idProveedor} no existe` } };
    }

    const { criterios, comentario } = body || {};
    const nueva = Evaluacion.registrar({
      idProveedor: Number(idProveedor),
      idEvaluador: usuario.idUsuario,
      criterios,
      comentario
    });

    const nuevoPromedio = prov.promedioEvaluaciones();

    return {
      status: 201,
      body: {
        mensaje: 'Evaluación registrada exitosamente',
        evaluacion: nueva.toJSON(),
        promedioProveedorActualizado: nuevoPromedio
      }
    };
  }

  static historial(idProveedor) {
    // HU-10: Consultar promedio e historial de evaluaciones
    const prov = Proveedor.verDetalle(Number(idProveedor));
    if (!prov) {
      return { status: 404, body: { error: `Proveedor #${idProveedor} no existe` } };
    }

    const historial = Evaluacion.verHistorial(Number(idProveedor));
    return {
      status: 200,
      body: {
        idProveedor: prov.idProveedor,
        razonSocial: prov.razonSocial,
        promedioActual: prov.promedioEvaluaciones(),
        totalEvaluaciones: historial.length,
        historial: historial.map(e => e.toJSON())
      }
    };
  }

  static listarGlobal() {
    // HU-30: Vista global de evaluaciones
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT e.*, p.razon_social as proveedor_nombre, u.nombre as evaluador_nombre
      FROM evaluaciones e
      INNER JOIN proveedores p ON e.id_proveedor = p.id_proveedor
      LEFT JOIN usuarios u ON e.id_evaluador = u.id_usuario
      ORDER BY e.fecha DESC
    `).all();

    return {
      status: 200,
      body: rows.map(r => ({
        idEvaluacion: r.id_evaluacion,
        idProveedor: r.id_proveedor,
        proveedorNombre: r.proveedor_nombre,
        evaluadorNombre: r.evaluador_nombre,
        fecha: r.fecha,
        criterios: {
          calidad: r.criterio_calidad,
          plazos: r.criterio_plazos,
          comunicacion: r.criterio_comunicacion,
          documental: r.criterio_documental,
          precio: r.criterio_precio
        },
        promedio: r.promedio,
        comentario: r.comentario
      }))
    };
  }
}

module.exports = EvaluacionController;

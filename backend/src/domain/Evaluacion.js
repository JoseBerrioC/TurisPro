const { getDatabase } = require('../database/connection');

class Evaluacion {
  constructor({
    idEvaluacion,
    idProveedor,
    idEvaluador,
    evaluadorNombre = null,
    fecha = null,
    criterios,
    promedio = null,
    comentario = '',
    creadoEn = null
  }) {
    this.idEvaluacion = idEvaluacion;
    this.idProveedor = idProveedor;
    this.idEvaluador = idEvaluador;
    this.evaluadorNombre = evaluadorNombre;
    this.fecha = fecha || new Date().toISOString();
    this.criterios = Array.isArray(criterios) ? criterios : [
      criterios?.calidad || 0,
      criterios?.plazos || 0,
      criterios?.comunicacion || 0,
      criterios?.documental || 0,
      criterios?.precio || 0
    ];
    this.promedio = promedio !== null ? Number(promedio) : this.calcularPromedio();
    this.comentario = comentario || '';
    this.creadoEn = creadoEn;
  }

  calcularPromedio() {
    if (!this.criterios || this.criterios.length !== 5) {
      throw new Error('Se requieren exactamente 5 criterios de evaluación');
    }
    const suma = this.criterios.reduce((acc, val) => {
      const num = Number(val);
      if (isNaN(num) || num < 1 || num > 5) {
        throw new Error('Cada uno de los 5 criterios debe tener una calificación entre 1 y 5');
      }
      return acc + num;
    }, 0);
    return Math.round((suma / 5) * 100) / 100;
  }

  static registrar({ idProveedor, idEvaluador, criterios, comentario = '' }) {
    if (!idProveedor || !idEvaluador) {
      throw new Error('idProveedor e idEvaluador son obligatorios');
    }

    let arrCriterios;
    if (Array.isArray(criterios)) {
      arrCriterios = criterios;
    } else if (typeof criterios === 'object' && criterios !== null) {
      arrCriterios = [
        criterios.calidad,
        criterios.plazos,
        criterios.comunicacion,
        criterios.documental,
        criterios.precio
      ];
    } else {
      throw new Error('Los 5 criterios de evaluación son obligatorios');
    }

    if (arrCriterios.length !== 5) {
      throw new Error('Se deben calificar los 5 criterios: calidad, plazos, comunicación, documental, precio');
    }

    for (let i = 0; i < 5; i++) {
      const val = Number(arrCriterios[i]);
      if (isNaN(val) || val < 1 || val > 5) {
        throw new Error('Todos los criterios deben puntuarse de 1 a 5');
      }
      arrCriterios[i] = Math.round(val);
    }

    const promedio = Math.round((arrCriterios.reduce((a, b) => a + b, 0) / 5) * 100) / 100;
    const db = getDatabase();

    const res = db.prepare(`
      INSERT INTO evaluaciones (
        id_proveedor, id_evaluador, criterio_calidad, criterio_plazos,
        criterio_comunicacion, criterio_documental, criterio_precio,
        promedio, comentario
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      idProveedor,
      idEvaluador,
      arrCriterios[0],
      arrCriterios[1],
      arrCriterios[2],
      arrCriterios[3],
      arrCriterios[4],
      promedio,
      comentario || ''
    );

    return new Evaluacion({
      idEvaluacion: Number(res.lastInsertRowid),
      idProveedor,
      idEvaluador,
      criterios: arrCriterios,
      promedio,
      comentario
    });
  }

  static verHistorial(idProveedor) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT e.*, u.nombre as evaluador_nombre, u.correo as evaluador_correo
      FROM evaluaciones e
      LEFT JOIN usuarios u ON e.id_evaluador = u.id_usuario
      WHERE e.id_proveedor = ?
      ORDER BY e.fecha DESC
    `).all(idProveedor);

    return rows.map(r => new Evaluacion({
      idEvaluacion: r.id_evaluacion,
      idProveedor: r.id_proveedor,
      idEvaluador: r.id_evaluador,
      evaluadorNombre: r.evaluador_nombre,
      fecha: r.fecha,
      criterios: [
        r.criterio_calidad,
        r.criterio_plazos,
        r.criterio_comunicacion,
        r.criterio_documental,
        r.criterio_precio
      ],
      promedio: r.promedio,
      comentario: r.comentario,
      creadoEn: r.creado_en
    }));
  }

  static calcularPromedioProveedor(idProveedor) {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT AVG(promedio) as promedio_general, COUNT(*) as total_evaluaciones
      FROM evaluaciones
      WHERE id_proveedor = ?
    `).get(idProveedor);

    if (!row || row.total_evaluaciones === 0 || row.promedio_general === null) {
      return null;
    }
    return Math.round(Number(row.promedio_general) * 100) / 100;
  }

  toJSON() {
    return {
      idEvaluacion: this.idEvaluacion,
      idProveedor: this.idProveedor,
      idEvaluador: this.idEvaluador,
      evaluadorNombre: this.evaluadorNombre,
      fecha: this.fecha,
      criterios: {
        calidadServicio: this.criterios[0],
        cumplimientoPlazos: this.criterios[1],
        comunicacionAtencion: this.criterios[2],
        cumplimientoDocumental: this.criterios[3],
        relacionCalidadPrecio: this.criterios[4]
      },
      promedio: this.promedio,
      comentario: this.comentario,
      creadoEn: this.creadoEn
    };
  }
}

module.exports = Evaluacion;

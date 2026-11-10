const { getDatabase } = require('../database/connection');
const Proveedor = require('./Proveedor');
const Documento = require('./Documento');
const Evaluacion = require('./Evaluacion');
const Incidente = require('./Incidente');
const Servicio = require('./Servicio');
const AnalisisRiesgo = require('./AnalisisRiesgo');
const MotorRiesgo = require('../services/MotorRiesgo');
const { NivelRiesgo, EstadoIncidente, EstadoDocumento } = require('./enums');

class Reporte {
  constructor({ periodo = 'general', filtros = {} } = {}) {
    this.periodo = periodo;
    this.filtros = filtros;
  }

  obtenerIndicadores() {
    const db = getDatabase();
    const motorRiesgo = new MotorRiesgo();
    const proveedores = Proveedor.buscar({ estado: '1' });
    const matrizRiesgo = { BAJO: 0, MEDIO: 0, ALTO: 0, SIN_DATOS: 0 };
    const tablaAtencion = [];

    // La clasificación del dashboard se calcula con los datos actuales de evaluaciones,
    // incidentes y documentos; no depende de valores de demostración ni de un análisis antiguo.
    for (const p of proveedores) {
      const factores = motorRiesgo.generarFactores(p);
      const puntaje = motorRiesgo.calcularPuntaje(factores);
      const nivel = motorRiesgo.clasificarNivel(puntaje);
      matrizRiesgo[nivel] = (matrizRiesgo[nivel] || 0) + 1;

      const docs = Documento.listarPorProveedor(p.idProveedor);
      const docsVencidos = docs.filter(d => d.calcularEstado() === EstadoDocumento.VENCIDO);
      const docsPorVencer = docs.filter(d => d.calcularEstado() === EstadoDocumento.POR_VENCER);
      const incidentes = Incidente.listarPorProveedor(p.idProveedor);
      const incidentesAbiertos = incidentes.filter(i => i.estado !== EstadoIncidente.CERRADO);
      const incidentesCriticos = incidentesAbiertos.filter(i => i.severidad === 'ALTA');

      if (nivel === NivelRiesgo.ALTO || docsVencidos.length || docsPorVencer.length || incidentesCriticos.length) {
        const motivos = [];
        if (nivel === NivelRiesgo.ALTO) motivos.push(`Riesgo alto (${puntaje ?? 'N/D'} pts)`);
        if (docsVencidos.length) motivos.push(`${docsVencidos.length} documento(s) vencido(s)`);
        if (docsPorVencer.length) motivos.push(`${docsPorVencer.length} documento(s) próximo(s) a vencer`);
        if (incidentesCriticos.length) motivos.push(`${incidentesCriticos.length} incidente(s) crítico(s) abierto(s)`);
        const estadoDocumental = docsVencidos.length ? 'VENCIDO' : docsPorVencer.length ? 'POR_VENCER' : docs.length ? 'VIGENTE' : 'SIN_DOCUMENTOS';
        tablaAtencion.push({
          idProveedor: p.idProveedor,
          razonSocial: p.razonSocial,
          nit: p.nit,
          tipo: p.tipo,
          cobertura: (p.zonas || []).map(z => z.ciudad).filter(Boolean).join(', ') || 'Sin cobertura registrada',
          nivelRiesgo: nivel,
          puntajeRiesgo: puntaje,
          estadoDocumental,
          motivosAtencion: motivos,
          // Si el proveedor requiere atención por un incidente crítico,
          // se conserva su identificador para abrir directamente ese registro.
          incidenteId: incidentesAbiertos.length ? incidentesAbiertos[0].idIncidente : null
        });
      }
    }

    // Alertas reales: incidentes no cerrados y documentos vencidos o que vencen en 30 días.
    const alertasIncidentes = db.prepare(`
      SELECT 'INCIDENTE' AS tipoAlerta, i.id_incidente AS id, i.id_proveedor AS idProveedor,
             p.razon_social AS proveedorNombre, i.tipo AS titulo, i.descripcion AS detalle,
             i.severidad AS prioridad, i.estado AS estado, i.fecha AS fecha
      FROM incidentes i JOIN proveedores p ON p.id_proveedor = i.id_proveedor
      WHERE p.activo = 1
      ORDER BY datetime(i.fecha) DESC LIMIT 20
    `).all();
    const alertasDocumentos = db.prepare(`
      SELECT 'DOCUMENTO' AS tipoAlerta, d.id_documento AS id, d.id_proveedor AS idProveedor,
             p.razon_social AS proveedorNombre, d.tipo AS titulo,
             CASE WHEN date(d.fecha_vencimiento) < date('now') THEN 'Documento vencido · Venció el ' || date(d.fecha_vencimiento)
                  ELSE 'Documento próximo a vencer · Vence el ' || date(d.fecha_vencimiento) END AS detalle,
             CASE WHEN date(d.fecha_vencimiento) < date('now') THEN 'ALTA' ELSE 'MEDIA' END AS prioridad,
             CASE WHEN date(d.fecha_vencimiento) < date('now') THEN 'VENCIDO' ELSE 'POR_VENCER' END AS estado,
             d.creado_en AS fecha
      FROM documentos d JOIN proveedores p ON p.id_proveedor = d.id_proveedor
      WHERE p.activo = 1 AND date(d.fecha_vencimiento) <= date('now', '+30 days')
      ORDER BY date(d.fecha_vencimiento) ASC LIMIT 20
    `).all();
    const alertasRecientes = [...alertasIncidentes, ...alertasDocumentos]
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 5);

    tablaAtencion.sort((a, b) => {
      const prioridad = x => x.nivelRiesgo === 'ALTO' ? 0 : x.estadoDocumental === 'VENCIDO' ? 1 : 2;
      return prioridad(a) - prioridad(b) || (b.puntajeRiesgo ?? -1) - (a.puntajeRiesgo ?? -1);
    });

    const documentosAtencion = db.prepare(`
      SELECT COUNT(*) AS total FROM documentos d JOIN proveedores p ON p.id_proveedor=d.id_proveedor
      WHERE p.activo=1 AND date(d.fecha_vencimiento) <= date('now', '+30 days')
    `).get().total;
    const incidentesAbiertos = db.prepare(`
      SELECT COUNT(*) AS total FROM incidentes i JOIN proveedores p ON p.id_proveedor=i.id_proveedor
      WHERE p.activo=1 AND i.estado IN ('ABIERTO', 'EN_SEGUIMIENTO')
    `).get().total;
    const evaluacionesMes = db.prepare("SELECT COUNT(*) AS total FROM evaluaciones e JOIN proveedores p ON p.id_proveedor=e.id_proveedor WHERE p.activo=1 AND date(e.fecha) >= date('now', 'start of month')").get().total;

    matrizRiesgo.total = Object.values(matrizRiesgo).reduce((a, b) => a + b, 0);
    return {
      generadoEn: new Date().toISOString(),
      indicadores: {
        proveedoresActivos: proveedores.length,
        proveedoresRiesgoAlto: matrizRiesgo.ALTO,
        documentosAtencion,
        incidentesAbiertos,
        evaluacionesMes
      },
      tablaAtencion,
      alertasRecientes,
      matrizRiesgo
    };
  }

  obtenerAnalitica(periodo = 'semana') {
    const db = getDatabase();
    const modificadores = { dia: '-1 day', semana: '-7 days', mes: '-1 month', anio: '-1 year' };
    const modifier = modificadores[periodo];
    const where = campo => modifier ? `${campo} >= datetime('now', ?)` : '1 = 1';
    const params = modifier ? [modifier] : [];

    // Los indicadores de actividad se cuentan según la fecha real de cada registro.
    const contar = (tabla, campo) => db.prepare(
      `SELECT COUNT(*) AS total FROM ${tabla} WHERE ${where(campo)}`
    ).get(...params).total;
    const proveedores = contar('proveedores', 'creado_en');
    const documentos = contar('documentos', 'creado_en');
    const evaluaciones = contar('evaluaciones', 'fecha');
    const incidentes = contar('incidentes', 'fecha');

    // La distribución de riesgo es una fotografía actual: se recalcula con las
    // evaluaciones, incidentes y documentos existentes, no con el nivel guardado
    // anteriormente en la ficha del proveedor.
    const motorRiesgo = new MotorRiesgo();
    const proveedoresActivos = db.prepare(`
      SELECT id_proveedor FROM proveedores
      WHERE activo = 1 ${modifier ? "AND creado_en >= datetime('now', ?)" : ''}
    `).all(...params).map(fila => Proveedor.verDetalle(fila.id_proveedor)).filter(Boolean);
    const conteoRiesgo = { BAJO: 0, MEDIO: 0, ALTO: 0, SIN_DATOS: 0 };
    for (const proveedor of proveedoresActivos) {
      const factores = motorRiesgo.generarFactores(proveedor);
      const puntaje = motorRiesgo.calcularPuntaje(factores);
      const nivel = motorRiesgo.clasificarNivel(puntaje);
      conteoRiesgo[nivel] = (conteoRiesgo[nivel] || 0) + 1;
    }
    const riesgo = Object.entries(conteoRiesgo).map(([nivel, total]) => ({ nivel, total }));

    const actividad = db.prepare(`
      SELECT 'Proveedor registrado' AS tipo, p.razon_social AS detalle, p.creado_en AS fecha, p.id_proveedor AS referencia
      FROM proveedores p WHERE ${where('p.creado_en')}
      UNION ALL
      SELECT 'Documento añadido', d.tipo || ' · ' || p.razon_social, d.creado_en, d.id_documento
      FROM documentos d JOIN proveedores p ON p.id_proveedor=d.id_proveedor WHERE ${where('d.creado_en')}
      UNION ALL
      SELECT 'Evaluación registrada', p.razon_social || ' · ' || printf('%.1f/5', e.promedio), e.fecha, e.id_evaluacion
      FROM evaluaciones e JOIN proveedores p ON p.id_proveedor=e.id_proveedor WHERE ${where('e.fecha')}
      UNION ALL
      SELECT 'Incidente registrado', p.razon_social || ' · ' || i.tipo || ' (' || i.severidad || ')', i.fecha, i.id_incidente
      FROM incidentes i JOIN proveedores p ON p.id_proveedor=i.id_proveedor WHERE ${where('i.fecha')}
      ORDER BY fecha DESC LIMIT 100
    `).all(...Array(4).fill(params).flat());

    const resumenIncidentes = db.prepare(`
      SELECT UPPER(severidad) AS severidad, COUNT(*) AS total
      FROM incidentes WHERE ${where('fecha')} GROUP BY UPPER(severidad)
    `).all(...params);

    // Para documentos vencidos se utiliza la fecha de vencimiento, no la fecha
    // de creación del registro: así el filtro representa el periodo del evento.
    const resumenDocumentos = db.prepare(`
      SELECT COUNT(*) AS total FROM documentos
      WHERE date(fecha_vencimiento) < date('now')
      ${modifier ? "AND date(fecha_vencimiento) >= date('now', ?)" : ''}
    `).get(...params).total;

    return {
      periodo,
      generadoEn: new Date().toISOString(),
      indicadores: { proveedores, documentos, evaluaciones, incidentes, documentosVencidos: resumenDocumentos },
      distribucionRiesgo: riesgo,
      incidentesPorSeveridad: resumenIncidentes,
      actividad
    };
  }

  obtenerRanking() {
    const proveedores = Proveedor.buscar({ estado: '1' });
    const ranking = proveedores.map(p => {
      const promedio = p.promedioEvaluaciones();
      return {
        idProveedor: p.idProveedor,
        razonSocial: p.razonSocial,
        tipo: p.tipo,
        nivelRiesgo: p.nivelRiesgo,
        puntajeRiesgo: p.puntajeRiesgo,
        promedioEvaluaciones: promedio
      };
    });

    // Ordenar por menor puntaje de riesgo (menor riesgo = mejor desempeño),
    // desempatando por mayor promedio de evaluaciones
    ranking.sort((a, b) => {
      const puntajeA = a.puntajeRiesgo !== null ? a.puntajeRiesgo : 999;
      const puntajeB = b.puntajeRiesgo !== null ? b.puntajeRiesgo : 999;
      if (puntajeA !== puntajeB) return puntajeA - puntajeB;
      const promA = a.promedioEvaluaciones || 0;
      const promB = b.promedioEvaluaciones || 0;
      return promB - promA;
    });

    return ranking;
  }

  compararProveedores(ids) {
    if (!Array.isArray(ids) || ids.length < 2 || ids.length > 3) {
      throw new Error('La comparación debe realizarse exactamente entre 2 o 3 proveedores');
    }

    // Validar que los identificadores sean números positivos y no existan duplicados
    const idsNumeros = ids.map(id => Number(id));
    if (idsNumeros.some(id => isNaN(id) || id <= 0)) {
      throw new Error('Los identificadores de proveedores deben ser números válidos');
    }

    const setIds = new Set(idsNumeros);
    if (setIds.size !== idsNumeros.length) {
      throw new Error('No se pueden comparar identificadores de proveedores duplicados');
    }

    const comparativa = idsNumeros.map(id => {
      const p = Proveedor.verDetalle(id);
      if (!p) throw new Error(`Proveedor #${id} no encontrado`);

      const servicios = Servicio.listarPorProveedor(p.idProveedor);
      const documentos = Documento.listarPorProveedor(p.idProveedor);
      const evaluaciones = Evaluacion.verHistorial(p.idProveedor);
      const incidentes = Incidente.listarPorProveedor(p.idProveedor);
      const ultimoAnalisis = AnalisisRiesgo.obtenerUltimo(p.idProveedor);

      const docsVigentes = documentos.filter(d => d.calcularEstado() === EstadoDocumento.VIGENTE).length;
      const docsPorVencer = documentos.filter(d => d.calcularEstado() === EstadoDocumento.POR_VENCER).length;
      const docsVencidos = documentos.filter(d => d.calcularEstado() === EstadoDocumento.VENCIDO).length;

      const incsAbiertos = incidentes.filter(i => i.estado === EstadoIncidente.ABIERTO).length;
      const incsSeguimiento = incidentes.filter(i => i.estado === EstadoIncidente.EN_SEGUIMIENTO).length;
      const incsCerrados = incidentes.filter(i => i.estado === EstadoIncidente.CERRADO).length;

      return {
        idProveedor: p.idProveedor,
        razonSocial: p.razonSocial,
        nit: p.nit,
        tipo: p.tipo,
        zonas: p.zonas.map(z => `${z.ciudad}, ${z.pais}`).join('; '),
        contacto: {
          correo: p.correo,
          telefono: p.telefono
        },
        riesgo: {
          puntaje: p.puntajeRiesgo,
          nivel: p.nivelRiesgo,
          explicacionResumida: ultimoAnalisis ? ultimoAnalisis.explicacion : 'Sin análisis registrado'
        },
        evaluaciones: {
          promedio: p.promedioEvaluaciones(),
          total: evaluaciones.length
        },
        documentos: {
          total: documentos.length,
          vigentes: docsVigentes,
          porVencer: docsPorVencer,
          vencidos: docsVencidos
        },
        incidentes: {
          total: incidentes.length,
          abiertos: incsAbiertos,
          enSeguimiento: incsSeguimiento,
          cerrados: incsCerrados
        },
        servicios: servicios.map(s => ({
          nombre: s.nombre,
          tarifa: s.tarifa,
          unidad: s.unidad,
          estaVigente: s.estaVigente()
        }))
      };
    });

    return {
      totalComparados: comparativa.length,
      proveedores: comparativa,
      aviso: 'Comparación descriptiva lado a lado sin determinar ganador automático.'
    };
  }
}

module.exports = Reporte;

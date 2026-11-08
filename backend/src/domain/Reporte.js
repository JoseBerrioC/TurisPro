const { getDatabase } = require('../database/connection');
const Proveedor = require('./Proveedor');
const Documento = require('./Documento');
const Evaluacion = require('./Evaluacion');
const Incidente = require('./Incidente');
const Servicio = require('./Servicio');
const AnalisisRiesgo = require('./AnalisisRiesgo');
const { NivelRiesgo, EstadoIncidente, EstadoDocumento } = require('./enums');

class Reporte {
  constructor({ periodo = 'general', filtros = {} } = {}) {
    this.periodo = periodo;
    this.filtros = filtros;
  }

  obtenerIndicadores() {
    const db = getDatabase();

    // 1. Proveedores activos
    const rowActivos = db.prepare('SELECT COUNT(*) as total FROM proveedores WHERE activo = 1').get();
    const proveedoresActivos = rowActivos ? rowActivos.total : 0;

    // Distribución dinámica de riesgo de todos los proveedores activos.
    const distribucionRiesgo = db.prepare(`
      SELECT UPPER(COALESCE(nivel_riesgo, 'SIN_DATOS')) AS nivel, COUNT(*) AS total
      FROM proveedores WHERE activo = 1 GROUP BY UPPER(COALESCE(nivel_riesgo, 'SIN_DATOS'))
    `).all();
    const matrizRiesgo = { BAJO: 0, MEDIO: 0, ALTO: 0, SIN_DATOS: 0 };
    distribucionRiesgo.forEach(row => {
      const nivel = ['BAJO', 'MEDIO', 'ALTO'].includes(row.nivel) ? row.nivel : 'SIN_DATOS';
      matrizRiesgo[nivel] += row.total;
    });
    matrizRiesgo.total = Object.values(matrizRiesgo).reduce((a, b) => a + b, 0);

    // 2. Proveedores con riesgo alto
    const rowRiesgoAlto = db.prepare("SELECT COUNT(*) as total FROM proveedores WHERE activo = 1 AND nivel_riesgo = 'ALTO'").get();
    const riesgoAlto = rowRiesgoAlto ? rowRiesgoAlto.total : 0;

    // 3. Documentos vencidos o próximos a vencer
    const todosDocs = Documento.listarGlobal();
    const docsAtencion = todosDocs.filter(d => d.estado === EstadoDocumento.POR_VENCER || d.estado === EstadoDocumento.VENCIDO);
    const documentosPorVencerOVencidos = docsAtencion.length;

    // 4. Incidentes abiertos o en seguimiento
    const rowIncidentes = db.prepare(`
      SELECT COUNT(*) as total FROM incidentes 
      WHERE estado IN ('ABIERTO', 'EN_SEGUIMIENTO')
    `).get();
    const incidentesAbiertos = rowIncidentes ? rowIncidentes.total : 0;

    // Tabla de elementos que requieren atención:
    // Proveedores con riesgo alto O documentos vencidos O incidentes de severidad alta
    const proveedoresList = Proveedor.buscar({ estado: '1' });
    const tablaAtencion = [];

    for (const p of proveedoresList) {
      const docsP = Documento.listarPorProveedor(p.idProveedor);
      const docsVencidos = docsP.filter(d => d.calcularEstado() === EstadoDocumento.VENCIDO);
      const incsP = Incidente.listarPorProveedor(p.idProveedor);
      const incsCriticos = incsP.filter(i => i.severidad === 'ALTA' && i.estado !== EstadoIncidente.CERRADO);

      if (p.nivelRiesgo === NivelRiesgo.ALTO || docsVencidos.length > 0 || incsCriticos.length > 0) {
        const motivos = [];
        if (p.nivelRiesgo === NivelRiesgo.ALTO) motivos.push(`Nivel de riesgo ALTO (${p.puntajeRiesgo ?? 'N/D'} pts)`);
        if (docsVencidos.length > 0) motivos.push(`${docsVencidos.length} documento(s) vencido(s)`);
        if (incsCriticos.length > 0) motivos.push(`${incsCriticos.length} incidente(s) de alta severidad sin cerrar`);

        tablaAtencion.push({
          idProveedor: p.idProveedor,
          razonSocial: p.razonSocial,
          tipo: p.tipo,
          nivelRiesgo: p.nivelRiesgo,
          puntajeRiesgo: p.puntajeRiesgo,
          motivosAtencion: motivos
        });
      }
    }

    return {
      indicadores: {
        proveedoresActivos,
        proveedoresRiesgoAlto: riesgoAlto,
        documentosAtencion: documentosPorVencerOVencidos,
        incidentesAbiertos
      },
      tablaAtencion,
      matrizRiesgo
    };
  }

  obtenerAnalitica(periodo = 'semana') {
    const db = getDatabase();
    const modificadores = { dia: '-1 day', semana: '-7 days', mes: '-1 month', anio: '-1 year' };
    const modifier = modificadores[periodo];
    const where = (campo) => modifier ? `${campo} >= datetime('now', ?)` : '1 = 1';
    const params = modifier ? [modifier] : [];

    const contar = (tabla, campo) => db.prepare(`SELECT COUNT(*) AS total FROM ${tabla} WHERE ${where(campo)}`).get(...params).total;
    const proveedores = contar('proveedores', 'creado_en');
    const documentos = contar('documentos', 'creado_en');
    const evaluaciones = contar('evaluaciones', 'fecha');
    const incidentes = contar('incidentes', 'fecha');

    const riesgo = db.prepare(`SELECT UPPER(COALESCE(nivel_riesgo, 'SIN_DATOS')) AS nivel, COUNT(*) AS total
      FROM proveedores WHERE activo = 1 ${modifier ? "AND creado_en >= datetime('now', ?)" : ''} GROUP BY UPPER(COALESCE(nivel_riesgo, 'SIN_DATOS'))`).all(...params);

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

    const resumenIncidentes = db.prepare(`SELECT UPPER(severidad) AS severidad, COUNT(*) AS total FROM incidentes
      WHERE ${where('fecha')} GROUP BY UPPER(severidad)`).all(...params);
    const resumenDocumentos = db.prepare(`SELECT COUNT(*) AS total FROM documentos WHERE date(fecha_vencimiento) < date('now')
      ${modifier ? "AND creado_en >= datetime('now', ?)" : ''}`).get(...params).total;

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

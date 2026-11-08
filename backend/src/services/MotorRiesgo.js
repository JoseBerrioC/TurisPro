const config = require('../config/config');
const { NivelRiesgo, EstadoIncidente, EstadoDocumento } = require('../domain/enums');
const FactorRiesgo = require('../domain/FactorRiesgo');
const AnalisisRiesgo = require('../domain/AnalisisRiesgo');
const Documento = require('../domain/Documento');
const Incidente = require('../domain/Incidente');
const Evaluacion = require('../domain/Evaluacion');
const ClienteLLM = require('./ClienteLLM');
const { getDatabase } = require('../database/connection');

class MotorRiesgo {
  constructor({
    pesos = config.motorRiesgo.pesos,
    umbralMedio = config.motorRiesgo.umbrales.umbralMedio,
    umbralAlto = config.motorRiesgo.umbrales.umbralAlto,
    clienteLLM = new ClienteLLM()
  } = {}) {
    this.pesos = {
      evaluaciones: pesos.evaluaciones ?? 0.40,
      incidentes: pesos.incidentes ?? 0.35,
      documentos: pesos.documentos ?? 0.25
    };
    this.umbralMedio = umbralMedio; // 34
    this.umbralAlto = umbralAlto;   // 67
    this.clienteLLM = clienteLLM;
  }

  clasificarNivel(puntaje) {
    if (puntaje === null || puntaje === undefined) return NivelRiesgo.SIN_DATOS;
    if (puntaje < this.umbralMedio) return NivelRiesgo.BAJO;
    if (puntaje < this.umbralAlto) return NivelRiesgo.MEDIO;
    return NivelRiesgo.ALTO;
  }

  esAnalisisVigente(ultimoAnalisis, idProveedor) {
    if (!ultimoAnalisis || !ultimoAnalisis.fechaCalculo) return false;

    // Normalizar la fecha de referencia para comparaciones cronológicas consistentes
    const dRef = new Date(ultimoAnalisis.fechaCalculo);
    if (isNaN(dRef.getTime())) return false;
    const fechaRefIso = dRef.toISOString();

    const db = getDatabase();

    // Comprobar si hay evaluaciones posteriores a la fecha del último cálculo
    // Se utiliza datetime() en SQLite y fecha ISO normalizada para evitar inconsistencias de formato
    const evalNueva = db.prepare(`
      SELECT 1 FROM evaluaciones 
      WHERE id_proveedor = ? AND (
        datetime(fecha) > datetime(?) OR 
        datetime(creado_en) > datetime(?)
      )
      LIMIT 1
    `).get(idProveedor, fechaRefIso, fechaRefIso);
    if (evalNueva) return false;

    // Comprobar si hay incidentes nuevos o actualizados posteriores a la fecha del último cálculo
    const incNuevo = db.prepare(`
      SELECT 1 FROM incidentes 
      WHERE id_proveedor = ? AND (
        datetime(fecha) > datetime(?) OR 
        datetime(actualizado_en) > datetime(?)
      )
      LIMIT 1
    `).get(idProveedor, fechaRefIso, fechaRefIso);
    if (incNuevo) return false;

    // Comprobar si hay documentos nuevos posteriores
    const docNuevo = db.prepare(`
      SELECT 1 FROM documentos 
      WHERE id_proveedor = ? AND datetime(creado_en) > datetime(?)
      LIMIT 1
    `).get(idProveedor, fechaRefIso);
    if (docNuevo) return false;

    // Comprobar si el estado de vigencia de algún documento cambió con el paso del tiempo hoy
    const docs = Documento.listarPorProveedor(idProveedor);
    const ahora = new Date();
    for (const d of docs) {
      const estadoAhora = d.calcularEstado(ahora);
      const estadoEntonces = d.calcularEstado(dRef);
      if (estadoAhora !== estadoEntonces) {
        return false;
      }
    }

    return true;
  }

  generarFactores(proveedor) {
    const idP = proveedor.idProveedor;

    // 1. Evaluaciones
    const promEv = proveedor.promedioEvaluaciones();
    let factorEv;
    if (promEv !== null) {
      // E = (5 - promedio) / 4 (varía de 0 si prom=5, a 1 si prom=1)
      const valE = Math.max(0, Math.min(1, (5 - promEv) / 4));
      factorEv = new FactorRiesgo({
        nombre: 'Evaluaciones',
        peso: this.pesos.evaluaciones,
        valor: Math.round(valE * 1000) / 1000,
        descripcion: `Promedio de desempeño: ${promEv.toFixed(2)}/5.00`
      });
    }

    // 2. Incidentes
    // Puntos de incidentes no cerrados (abiertos o en seguimiento)
    // Baja = 1, Media = 3, Alta = 5. I = puntos / 10 con tope de 1
    const incidentes = Incidente.listarPorProveedor(idP);
    const incidentesActivos = incidentes.filter(i => i.estado !== EstadoIncidente.CERRADO);
    let puntosInc = 0;
    for (const inc of incidentesActivos) {
      if (inc.severidad === 'ALTA') puntosInc += 5;
      else if (inc.severidad === 'MEDIA') puntosInc += 3;
      else puntosInc += 1; // BAJA
    }
    const valI = Math.min(1.0, puntosInc / config.motorRiesgo.divisorIncidentes);
    const factorInc = new FactorRiesgo({
      nombre: 'Incidentes',
      peso: this.pesos.incidentes,
      valor: Math.round(valI * 1000) / 1000,
      descripcion: `${incidentesActivos.length} incidente(s) activo(s) con ${puntosInc} pts de severidad acumulada`
    });

    // 3. Documentos
    // D = documentos vencidos / documentos registrados. Si 0 docs, D = 0
    const documentos = Documento.listarPorProveedor(idP);
    let valD = 0;
    let docsVencidosCount = 0;
    if (documentos.length > 0) {
      docsVencidosCount = documentos.filter(d => d.calcularEstado() === EstadoDocumento.VENCIDO).length;
      valD = docsVencidosCount / documentos.length;
    }
    const factorDoc = new FactorRiesgo({
      nombre: 'Documentos',
      peso: this.pesos.documentos,
      valor: Math.round(valD * 1000) / 1000,
      descripcion: `${docsVencidosCount} de ${documentos.length} documento(s) vencido(s)`
    });

    // Si una categoría no tiene registros, no se inventa una calificación para ella.
    // Se redistribuyen proporcionalmente los pesos entre las fuentes que sí se pueden medir.
    const factores = [factorEv, factorInc, factorDoc].filter(Boolean);
    const pesoDisponible = factores.reduce((total, factor) => total + factor.peso, 0);
    if (pesoDisponible > 0) {
      for (const factor of factores) {
        factor.peso = factor.peso / pesoDisponible;
        factor.aporte = Math.round(factor.peso * factor.valor * 100 * 100) / 100;
      }
    }
    return factores;
  }

  calcularPuntaje(factores) {
    if (!factores || factores.length === 0) return null;
    const totalAporte = factores.reduce((acc, f) => acc + f.aporte, 0);
    return Math.max(0, Math.min(100, Math.round(totalAporte)));
  }

  generarRecomendacion(nivel, factores) {
    if (nivel === NivelRiesgo.BAJO) {
      return 'Mantener seguimiento periódico trimestral y renovar documentos según calendario programado.';
    }
    if (nivel === NivelRiesgo.MEDIO) {
      const recomendaciones = ['Programar revisión de operaciones en un plazo no mayor a 30 días.'];
      const docFactor = factores.find(f => f.nombre === 'Documentos');
      if (docFactor && docFactor.valor > 0) {
        recomendaciones.push('Solicitar actualización inmediata de la documentación vencida.');
      }
      const incFactor = factores.find(f => f.nombre === 'Incidentes');
      if (incFactor && incFactor.valor > 0) {
        recomendaciones.push('Hacer seguimiento a los incidentes abiertos para su resolución.');
      }
      return recomendaciones.join(' ');
    }
    // ALTO
    return 'ALERTA: Requiere auditoría inmediata por parte del Gestor de Proveedores. Suspender nuevas contrataciones hasta subsanar incidentes críticos y documentación legal.';
  }

  async analizar(proveedor, forzarRecalculo = false) {
    const idP = proveedor.idProveedor;

    // Verificar si existe un análisis vigente (Diagrama de secuencia UML)
    if (!forzarRecalculo) {
      const ultimo = AnalisisRiesgo.obtenerUltimo(idP);
      if (ultimo && this.esAnalisisVigente(ultimo, idP)) {
        return {
          analisis: ultimo,
          reutilizado: true,
          mensaje: 'Se reutilizó el análisis de riesgo vigente.'
        };
      }
    }

    // Recalcular
    const factores = this.generarFactores(proveedor);

    // Solo se declara SIN_DATOS cuando ninguna fuente aporta evidencia medible.
    if (!factores || factores.length === 0) {
      return {
        analisis: null,
        reutilizado: false,
        nivelRiesgo: NivelRiesgo.SIN_DATOS,
        mensaje: 'No existen datos de evaluaciones, incidentes o documentos para calcular el riesgo. Registra información antes de analizar.',
        avisoHumano: 'La decisión final sobre el proveedor siempre la toma una persona.'
      };
    }

    const puntaje = this.calcularPuntaje(factores);
    const nivel = this.clasificarNivel(puntaje);

    // Generar explicación con LLM o Plantilla de Respaldo
    const { explicacion, origen } = await this.clienteLLM.generarExplicacion(factores, {
      razonSocial: proveedor.razonSocial,
      tipo: proveedor.tipo,
      puntaje,
      nivel
    });

    const recomendacion = this.generarRecomendacion(nivel, factores);

    // Guardar análisis en base de datos
    const nuevoAnalisis = AnalisisRiesgo.guardar({
      idProveedor: idP,
      puntaje,
      nivel,
      explicacion,
      origenExplicacion: origen,
      recomendacion,
      factores
    });

    // Actualizar nivel de riesgo en el proveedor (Diagrama de secuencia UML y Diagrama de estados)
    proveedor.actualizarNivelRiesgo(nivel, puntaje);

    return {
      analisis: nuevoAnalisis,
      reutilizado: false,
      mensaje: 'Análisis de riesgo recalculado exitosamente.'
    };
  }
}

module.exports = MotorRiesgo;

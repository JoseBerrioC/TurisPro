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
    if (!ultimoAnalisis) return false;

    const fechaRef = ultimoAnalisis.fechaCalculo;
    const db = getDatabase();

    // Comprobar si hay evaluaciones posteriores a la fecha del último cálculo
    const evalNueva = db.prepare(`
      SELECT 1 FROM evaluaciones 
      WHERE id_proveedor = ? AND (fecha > ? OR creado_en > ?)
      LIMIT 1
    `).get(idProveedor, fechaRef, fechaRef);
    if (evalNueva) return false;

    // Comprobar si hay incidentes nuevos o actualizados posteriores a la fecha del último cálculo
    const incNuevo = db.prepare(`
      SELECT 1 FROM incidentes 
      WHERE id_proveedor = ? AND (fecha > ? OR actualizado_en > ?)
      LIMIT 1
    `).get(idProveedor, fechaRef, fechaRef);
    if (incNuevo) return false;

    // Comprobar si hay documentos nuevos posteriores
    const docNuevo = db.prepare(`
      SELECT 1 FROM documentos 
      WHERE id_proveedor = ? AND creado_en > ?
      LIMIT 1
    `).get(idProveedor, fechaRef);
    if (docNuevo) return false;

    // Comprobar si el estado de vigencia de algún documento cambió con el paso del tiempo hoy
    // (ej. pasó a vencido desde que se calculó)
    const docs = Documento.listarPorProveedor(idProveedor);
    const ahora = new Date();
    for (const d of docs) {
      const estadoAhora = d.calcularEstado(ahora);
      const estadoEntonces = d.calcularEstado(new Date(fechaRef));
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
    if (promEv === null) {
      // Sin evaluaciones registradas
      return null;
    } else {
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

    return [factorEv, factorInc, factorDoc];
  }

  calcularPuntaje(factores) {
    if (!factores || factores.length === 0) return null;
    const totalAporte = factores.reduce((acc, f) => acc + f.aporte, 0);
    // Asegurar rango 0 a 100
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

    // Caso regla de negocio: sin datos suficientes (si no hay evaluaciones)
    if (!factores) {
      proveedor.actualizarNivelRiesgo(NivelRiesgo.SIN_DATOS, null);
      return {
        analisis: null,
        reutilizado: false,
        nivelRiesgo: NivelRiesgo.SIN_DATOS,
        mensaje: 'Sin datos suficientes: El proveedor no tiene evaluaciones registradas para calcular el puntaje de riesgo.',
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

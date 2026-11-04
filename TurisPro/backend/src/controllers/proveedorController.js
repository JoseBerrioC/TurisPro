const Proveedor = require('../domain/Proveedor');
const Servicio = require('../domain/Servicio');
const Documento = require('../domain/Documento');
const Evaluacion = require('../domain/Evaluacion');
const Incidente = require('../domain/Incidente');
const AnalisisRiesgo = require('../domain/AnalisisRiesgo');

class ProveedorController {
  static registrar(body) {
    // HU-03: Registrar proveedor
    const nuevo = Proveedor.registrar(body || {});
    return {
      status: 201,
      body: {
        mensaje: 'Proveedor registrado correctamente',
        proveedor: nuevo.toJSON()
      }
    };
  }

  static buscar(query) {
    // HU-04: Listar, buscar y filtrar proveedores
    const proveedores = Proveedor.buscar({
      texto: query?.texto || query?.q,
      tipo: query?.tipo,
      zona: query?.zona,
      estado: query?.estado,
      riesgo: query?.riesgo
    });

    return {
      status: 200,
      body: {
        total: proveedores.length,
        items: proveedores.map(p => p.toJSON())
      }
    };
  }

  static verDetalle(idProveedor) {
    // HU-05: Consultar detalle de un proveedor organizado en pestañas
    const p = Proveedor.verDetalle(Number(idProveedor));
    if (!p) {
      return {
        status: 404,
        body: { error: `Proveedor #${idProveedor} no encontrado` }
      };
    }

    const servicios = Servicio.listarPorProveedor(p.idProveedor);
    const documentos = Documento.listarPorProveedor(p.idProveedor);
    const evaluaciones = Evaluacion.verHistorial(p.idProveedor);
    const incidentes = Incidente.listarPorProveedor(p.idProveedor);
    const ultimoAnalisis = AnalisisRiesgo.obtenerUltimo(p.idProveedor);

    return {
      status: 200,
      body: {
        proveedor: p.toJSON(),
        pestanas: {
          informacionGeneral: {
            razonSocial: p.razonSocial,
            nit: p.nit,
            tipo: p.tipo,
            correo: p.correo,
            telefono: p.telefono,
            direccion: p.direccion,
            zonas: p.zonas,
            activo: p.activo,
            estadoCiclo: p.estadoCiclo
          },
          serviciosYTarifas: servicios.map(s => s.toJSON()),
          documentos: documentos.map(d => d.toJSON()),
          evaluaciones: {
            promedioGeneral: p.promedioEvaluaciones(),
            totalEvaluaciones: evaluaciones.length,
            historial: evaluaciones.map(e => e.toJSON())
          },
          incidentes: incidentes.map(i => i.toJSON()),
          riesgo: ultimoAnalisis ? ultimoAnalisis.toJSON() : {
            nivel: p.nivelRiesgo,
            puntaje: p.puntajeRiesgo,
            mensaje: 'No se ha calculado un análisis de riesgo aún.',
            avisoHumano: 'La decisión final sobre el proveedor siempre la toma una persona.'
          }
        }
      }
    };
  }

  static editar(idProveedor, body) {
    // HU-16: Editar proveedor
    const actualizado = Proveedor.editar(Number(idProveedor), body || {});
    return {
      status: 200,
      body: {
        mensaje: 'Proveedor actualizado correctamente',
        proveedor: actualizado.toJSON()
      }
    };
  }

  static desactivar(idProveedor) {
    // HU-16: Desactivar proveedor
    const des = Proveedor.desactivar(Number(idProveedor));
    return {
      status: 200,
      body: {
        mensaje: 'Proveedor desactivado correctamente',
        proveedor: des.toJSON()
      }
    };
  }

  static reactivar(idProveedor) {
    const act = Proveedor.reactivar(Number(idProveedor));
    return {
      status: 200,
      body: {
        mensaje: 'Proveedor reactivado correctamente',
        proveedor: act.toJSON()
      }
    };
  }
}

module.exports = ProveedorController;

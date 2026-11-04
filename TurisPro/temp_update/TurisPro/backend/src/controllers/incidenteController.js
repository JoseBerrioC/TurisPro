const Incidente = require('../domain/Incidente');
const Proveedor = require('../domain/Proveedor');

class IncidenteController {
  static registrar(idProveedor, body, usuario) {
    // HU-11: Registrar incidente con tipo, severidad y estado
    const prov = Proveedor.verDetalle(Number(idProveedor));
    if (!prov) {
      return { status: 404, body: { error: `Proveedor #${idProveedor} no existe` } };
    }

    const { tipo, severidad, estado, descripcion } = body || {};
    const nuevo = Incidente.registrar({
      idProveedor: Number(idProveedor),
      idRegistradoPor: usuario.idUsuario,
      tipo,
      severidad,
      estado,
      descripcion
    });

    return {
      status: 201,
      body: {
        mensaje: 'Incidente registrado exitosamente',
        incidente: nuevo.toJSON()
      }
    };
  }

  static listarPorProveedor(idProveedor) {
    const incidentes = Incidente.listarPorProveedor(Number(idProveedor));
    return {
      status: 200,
      body: incidentes.map(i => i.toJSON())
    };
  }

  static cambiarEstado(idIncidente, body) {
    // Transición de estados UML: Abierto -> En seguimiento -> Cerrado / Abierto -> Cerrado
    const { estado } = body || {};
    const actualizado = Incidente.cambiarEstado(Number(idIncidente), estado);
    return {
      status: 200,
      body: {
        mensaje: `Estado de incidente actualizado a ${estado}`,
        incidente: actualizado.toJSON()
      }
    };
  }

  static filtrarGlobal(query) {
    // HU-19: Vista global de incidentes
    const items = Incidente.filtrar({
      tipo: query?.tipo,
      severidad: query?.severidad,
      estado: query?.estado,
      idProveedor: query?.idProveedor ? Number(query.idProveedor) : null
    });

    return {
      status: 200,
      body: {
        total: items.length,
        items
      }
    };
  }
}

module.exports = IncidenteController;

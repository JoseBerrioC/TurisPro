const Servicio = require('../domain/Servicio');
const Proveedor = require('../domain/Proveedor');

class ServicioController {
  static agregar(idProveedor, body) {
    // HU-06: Agregar servicios con tarifa > 0, unidad y vigencia
    const prov = Proveedor.verDetalle(Number(idProveedor));
    if (!prov) {
      return { status: 404, body: { error: `Proveedor #${idProveedor} no existe` } };
    }

    const { nombre, descripcion, tarifa, unidad, vigenteDesde, vigenteHasta } = body || {};
    const nuevo = Servicio.agregar({
      idProveedor: Number(idProveedor),
      nombre,
      descripcion,
      tarifa,
      unidad,
      vigenteDesde,
      vigenteHasta
    });

    return {
      status: 201,
      body: {
        mensaje: 'Servicio agregado correctamente',
        servicio: nuevo.toJSON()
      }
    };
  }

  static listarPorProveedor(idProveedor) {
    const servicios = Servicio.listarPorProveedor(Number(idProveedor));
    return {
      status: 200,
      body: servicios.map(s => s.toJSON())
    };
  }

  static editar(idServicio, body) {
    // HU-17: Editar servicio con validaciones de tarifa positiva
    const editado = Servicio.editar(Number(idServicio), body || {});
    return {
      status: 200,
      body: {
        mensaje: 'Servicio actualizado correctamente',
        servicio: editado.toJSON()
      }
    };
  }

  static eliminar(idServicio) {
    // HU-17: Eliminar servicio con confirmación previa
    Servicio.eliminar(Number(idServicio));
    return {
      status: 200,
      body: {
        mensaje: 'Servicio eliminado correctamente'
      }
    };
  }
}

module.exports = ServicioController;

const Documento = require('../domain/Documento');
const Proveedor = require('../domain/Proveedor');

class DocumentoController {
  static registrar(idProveedor, body) {
    // HU-07: Cargar documento indicando tipo y fecha de vencimiento
    const prov = Proveedor.verDetalle(Number(idProveedor));
    if (!prov) {
      return { status: 404, body: { error: `Proveedor #${idProveedor} no existe` } };
    }

    const { tipo, fechaEmision, fechaVencimiento, archivoUrl } = body || {};
    const nuevo = Documento.registrar({
      idProveedor: Number(idProveedor),
      tipo,
      fechaEmision,
      fechaVencimiento,
      archivoUrl
    });

    return {
      status: 201,
      body: {
        mensaje: 'Documento registrado exitosamente',
        documento: nuevo.toJSON()
      }
    };
  }

  static listarPorProveedor(idProveedor) {
    // HU-08: Listar documentos con estado calculado (Vigente, Por vencer, Vencido)
    const docs = Documento.listarPorProveedor(Number(idProveedor));
    return {
      status: 200,
      body: docs.map(d => d.toJSON())
    };
  }

  static listarGlobal() {
    // HU-18: Vista global de documentos
    const docs = Documento.listarGlobal();
    return {
      status: 200,
      body: docs
    };
  }

  static eliminar(idDocumento) {
    const ok = Documento.eliminar(Number(idDocumento));
    if (!ok) {
      return { status: 404, body: { error: `Documento #${idDocumento} no encontrado` } };
    }
    return {
      status: 200,
      body: { mensaje: 'Documento eliminado exitosamente' }
    };
  }
}

module.exports = DocumentoController;

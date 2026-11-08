const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Documento = require('../domain/Documento');
const Proveedor = require('../domain/Proveedor');

class DocumentoController {
  static registrar(idProveedor, body) {
    // HU-07: Cargar documento indicando tipo y fecha de vencimiento
    const prov = Proveedor.verDetalle(Number(idProveedor));
    if (!prov) {
      return { status: 404, body: { error: `Proveedor #${idProveedor} no existe` } };
    }

    const { tipo, fechaEmision, fechaVencimiento } = body || {};
    let archivoUrl = body?.archivoUrl || null;

    // Si se adjunta un archivo, guardarlo físicamente en backend/uploads.
    if (body?.archivo?.base64) {
      const archivo = body.archivo;
      const permitidos = {
        'application/pdf': '.pdf',
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'application/vnd.ms-excel': '.xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx'
      };
      const extension = permitidos[archivo.mimeType];
      if (!extension) return { status: 400, body: { error: 'Formato no permitido. Adjunta PDF, imagen, Word o Excel.' } };
      const buffer = Buffer.from(archivo.base64, 'base64');
      if (!buffer.length || buffer.length > 3 * 1024 * 1024) {
        return { status: 400, body: { error: 'El archivo está vacío o supera el límite de 3 MB.' } };
      }
      const carpeta = path.resolve(__dirname, '../../uploads');
      fs.mkdirSync(carpeta, { recursive: true });
      const nombreSeguro = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`;
      fs.writeFileSync(path.join(carpeta, nombreSeguro), buffer);
      archivoUrl = `/api/archivos/${nombreSeguro}`;
    }

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

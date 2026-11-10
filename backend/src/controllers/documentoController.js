const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Documento = require('../domain/Documento');
const Proveedor = require('../domain/Proveedor');

class DocumentoController {
  static registrar(idProveedor, body) {
    const prov = Proveedor.verDetalle(Number(idProveedor));
    if (!prov) {
      return { status: 404, body: { error: `Proveedor #${idProveedor} no existe` } };
    }

    const { tipo, fechaEmision, fechaVencimiento } = body || {};
    if (!tipo || !String(tipo).trim() || !fechaVencimiento) {
      return { status: 400, body: { error: 'El tipo y la fecha de vencimiento son obligatorios.' } };
    }

    const fechaValida = valor => /^\d{4}-\d{2}-\d{2}$/.test(String(valor || '')) && !Number.isNaN(Date.parse(`${valor}T00:00:00`));
    if (!fechaValida(fechaVencimiento) || (fechaEmision && !fechaValida(fechaEmision))) {
      return { status: 400, body: { error: 'Las fechas deben tener un formato válido.' } };
    }
    if (fechaEmision && fechaVencimiento < fechaEmision) {
      return { status: 400, body: { error: 'La fecha de vencimiento no puede ser anterior a la fecha de emisión.' } };
    }

    let archivoUrl = null;
    let archivoPath = null;

    try {
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
        if (!extension) {
          return { status: 400, body: { error: 'Formato no permitido. Adjunta PDF, imagen, Word o Excel.' } };
        }

        const base64Limpio = String(archivo.base64).replace(/^data:[^,]+,/, '');
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Limpio)) {
          return { status: 400, body: { error: 'El contenido del archivo no tiene un formato válido.' } };
        }
        const buffer = Buffer.from(base64Limpio, 'base64');
        if (!buffer.length || buffer.length > 3 * 1024 * 1024) {
          return { status: 400, body: { error: 'El archivo está vacío o supera el límite de 3 MB.' } };
        }

        const carpeta = path.resolve(__dirname, '../../uploads');
        fs.mkdirSync(carpeta, { recursive: true });
        const nombreSeguro = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`;
        archivoPath = path.join(carpeta, nombreSeguro);
        fs.writeFileSync(archivoPath, buffer, { flag: 'wx' });
        archivoUrl = `/api/archivos/${nombreSeguro}`;
      }

      const nuevo = Documento.registrar({
        idProveedor: Number(idProveedor),
        tipo: String(tipo).trim(),
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
    } catch (error) {
      // Si falla el registro en SQLite, no dejamos un archivo huérfano en uploads.
      if (archivoPath && fs.existsSync(archivoPath)) {
        try { fs.unlinkSync(archivoPath); } catch (_) { /* No ocultar el error original. */ }
      }
      throw error;
    }
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

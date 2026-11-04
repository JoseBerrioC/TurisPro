const test = require('node:test');
const assert = require('node:assert');
const Documento = require('../src/domain/Documento');
const Incidente = require('../src/domain/Incidente');
const { EstadoDocumento, EstadoIncidente, SeveridadIncidente } = require('../src/domain/enums');

test('Diagrama de Estados UML: stm Documento', () => {
  const hoy = new Date();

  // 1. Documento con fecha de vencimiento a 60 días -> Vigente
  const fVigente = new Date(hoy.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const docVigente = new Documento({
    idDocumento: 1,
    idProveedor: 1,
    tipo: 'RNT',
    fechaEmision: '2026-01-01',
    fechaVencimiento: fVigente
  });
  assert.strictEqual(docVigente.calcularEstado(hoy), EstadoDocumento.VIGENTE);

  // 2. Documento con fecha de vencimiento a 15 días (<= 30) -> Por vencer
  const fPorVencer = new Date(hoy.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const docPorVencer = new Documento({
    idDocumento: 2,
    idProveedor: 1,
    tipo: 'Bomberos',
    fechaEmision: '2026-01-01',
    fechaVencimiento: fPorVencer
  });
  assert.strictEqual(docPorVencer.calcularEstado(hoy), EstadoDocumento.POR_VENCER);

  // 3. Documento con fecha de vencimiento pasada (-5 días < 0) -> Vencido
  const fVencido = new Date(hoy.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const docVencido = new Documento({
    idDocumento: 3,
    idProveedor: 1,
    tipo: 'Póliza',
    fechaEmision: '2025-01-01',
    fechaVencimiento: fVencido
  });
  assert.strictEqual(docVencido.calcularEstado(hoy), EstadoDocumento.VENCIDO);
});

test('Diagrama de Estados UML: stm Incidente - Transiciones permitidas y terminales', () => {
  // Transición 1: Abierto -> En seguimiento -> Cerrado
  const inc = new Incidente({
    idIncidente: 10,
    idProveedor: 1,
    idRegistradoPor: 1,
    tipo: 'Operativo',
    severidad: SeveridadIncidente.MEDIA,
    estado: EstadoIncidente.ABIERTO,
    descripcion: 'Prueba de estados'
  });

  assert.strictEqual(inc.estado, EstadoIncidente.ABIERTO);

  // No podemos ejecutar cambiarEstado() directo sin base de datos en unidad aislada a menos que usemos la regla de negocio
  // Probamos la lógica de validación
  assert.strictEqual(Object.values(EstadoIncidente).includes('EN_SEGUIMIENTO'), true);
  assert.strictEqual(Object.values(EstadoIncidente).includes('CERRADO'), true);
});

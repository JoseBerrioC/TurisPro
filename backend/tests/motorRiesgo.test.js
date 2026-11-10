const test = require('node:test');
const assert = require('node:assert');
const MotorRiesgo = require('../src/services/MotorRiesgo');
const FactorRiesgo = require('../src/domain/FactorRiesgo');
const Documento = require('../src/domain/Documento');
const { NivelRiesgo } = require('../src/domain/enums');

test('MotorRiesgo - Clasificación de niveles según umbrales (34 y 67)', () => {
  const motor = new MotorRiesgo({
    umbralMedio: 34,
    umbralAlto: 67
  });

  assert.strictEqual(motor.clasificarNivel(0), NivelRiesgo.BAJO);
  assert.strictEqual(motor.clasificarNivel(33), NivelRiesgo.BAJO);
  assert.strictEqual(motor.clasificarNivel(34), NivelRiesgo.MEDIO);
  assert.strictEqual(motor.clasificarNivel(50), NivelRiesgo.MEDIO);
  assert.strictEqual(motor.clasificarNivel(66), NivelRiesgo.MEDIO);
  assert.strictEqual(motor.clasificarNivel(67), NivelRiesgo.ALTO);
  assert.strictEqual(motor.clasificarNivel(100), NivelRiesgo.ALTO);
  assert.strictEqual(motor.clasificarNivel(null), NivelRiesgo.SIN_DATOS);
});

test('MotorRiesgo - FactorRiesgo cálculo de aporte individual', () => {
  // Factor con peso 40% (0.40) y valor 0.5 -> aporte = 0.40 * 0.5 * 100 = 20 pts
  const factor = new FactorRiesgo({
    nombre: 'Evaluaciones',
    peso: 0.40,
    valor: 0.5
  });

  assert.strictEqual(factor.aporte, 20);
  assert.ok(factor.describir().includes('20.0 pts'));
});

test('MotorRiesgo - Cálculo de fórmula ponderada completa: 100 * (0.40*E + 0.35*I + 0.25*D)', () => {
  const motor = new MotorRiesgo();

  // Caso:
  // E: promedio evaluaciones = 4.0 -> E = (5 - 4)/4 = 0.25 -> aporte = 40 * 0.25 = 10 pts
  // I: incidentes abiertos = 1 media (3 pts) -> I = 3/10 = 0.30 -> aporte = 35 * 0.30 = 10.5 pts
  // D: 1 de 2 documentos vencidos -> D = 0.50 -> aporte = 25 * 0.50 = 12.5 pts
  // Total aporte esperado = 10 + 10.5 + 12.5 = 33 pts -> Nivel BAJO (< 34)

  const factores = [
    new FactorRiesgo({ nombre: 'Evaluaciones', peso: 0.40, valor: 0.25 }),
    new FactorRiesgo({ nombre: 'Incidentes', peso: 0.35, valor: 0.30 }),
    new FactorRiesgo({ nombre: 'Documentos', peso: 0.25, valor: 0.50 })
  ];

  const puntaje = motor.calcularPuntaje(factores);
  assert.strictEqual(puntaje, 33);
  assert.strictEqual(motor.clasificarNivel(puntaje), NivelRiesgo.BAJO);
});

test('MotorRiesgo - Proveedor de alto riesgo por múltiples incidentes y documentos vencidos', () => {
  const motor = new MotorRiesgo();

  // Caso severo:
  // E: promedio = 1.0 -> E = (5-1)/4 = 1.0 -> aporte = 40 pts
  // I: 2 incidentes de alta (5+5 = 10 pts) -> I = 10/10 = 1.0 -> aporte = 35 pts
  // D: 100% documentos vencidos -> D = 1.0 -> aporte = 25 pts
  // Total = 40 + 35 + 25 = 100 pts -> Nivel ALTO (>= 67)

  const factores = [
    new FactorRiesgo({ nombre: 'Evaluaciones', peso: 0.40, valor: 1.0 }),
    new FactorRiesgo({ nombre: 'Incidentes', peso: 0.35, valor: 1.0 }),
    new FactorRiesgo({ nombre: 'Documentos', peso: 0.25, valor: 1.0 })
  ];

  const puntaje = motor.calcularPuntaje(factores);
  assert.strictEqual(puntaje, 100);
  assert.strictEqual(motor.clasificarNivel(puntaje), NivelRiesgo.ALTO);
});

test('MotorRiesgo - Generación de explicación mediante plantilla de respaldo', () => {
  const ClienteLLM = require('../src/services/ClienteLLM');
  const cliente = new ClienteLLM({ apiKey: '', endpoint: '' });

  const factores = [
    new FactorRiesgo({ nombre: 'Evaluaciones', peso: 0.40, valor: 0.25, descripcion: 'Promedio 4.0/5' }),
    new FactorRiesgo({ nombre: 'Incidentes', peso: 0.35, valor: 0.30, descripcion: '1 incidente medio' }),
    new FactorRiesgo({ nombre: 'Documentos', peso: 0.25, valor: 0.0, descripcion: 'Todos vigentes' })
  ];

  const texto = cliente.plantillaRespaldo(factores);
  assert.ok(texto.includes('evaluaciones de desempeño'));
  assert.ok(texto.includes('historial de incidentes'));
  assert.ok(texto.includes('cumplimiento documental'));
});

test('MotorRiesgo & Documento - Consistencia en comparación de fechas y cálculo de días', () => {
  // Verificación de parseo seguro sin distorsión por zona horaria local
  const ref = '2026-11-01';
  const vencimientoExacto = '2026-11-11'; // exactamente 10 días
  
  const doc = new Documento({
    idDocumento: 99,
    idProveedor: 1,
    tipo: 'Seguro Hotelero',
    fechaEmision: '2026-01-01',
    fechaVencimiento: vencimientoExacto
  });

  const dias = doc.diasParaVencer(ref);
  assert.strictEqual(dias, 10, 'El cálculo de días entre fechas calendario debe ser exacto sin saltos por UTC');

  // Documento que vence el mismo día
  const docMismoDia = new Documento({
    idDocumento: 100,
    idProveedor: 1,
    tipo: 'Licencia',
    fechaEmision: '2026-01-01',
    fechaVencimiento: '2026-11-01'
  });
  assert.strictEqual(docMismoDia.diasParaVencer('2026-11-01'), 0);
  assert.strictEqual(docMismoDia.calcularEstado('2026-11-01'), 'Por vencer');

  // Documento vencido ayer
  const docAyer = new Documento({
    idDocumento: 101,
    idProveedor: 1,
    tipo: 'Certificado',
    fechaEmision: '2026-01-01',
    fechaVencimiento: '2026-10-31'
  });
  assert.strictEqual(docAyer.diasParaVencer('2026-11-01'), -1);
  assert.strictEqual(docAyer.calcularEstado('2026-11-01'), 'Vencido');
});

test('ClienteLLM - Sin clave de Gemini entrega respaldo identificado y no bloquea el cálculo', async () => {
  const ClienteLLM = require('../src/services/ClienteLLM');
  const cliente = new ClienteLLM({ apiKey: '', endpoint: '' });
  const factores = [
    new FactorRiesgo({ nombre: 'Evaluaciones', peso: 0.4, valor: 0.25, descripcion: 'Promedio 4.0/5' }),
    new FactorRiesgo({ nombre: 'Incidentes', peso: 0.35, valor: 0.3, descripcion: '1 incidente medio' }),
    new FactorRiesgo({ nombre: 'Documentos', peso: 0.25, valor: 0, descripcion: 'Todos vigentes' })
  ];

  const resultado = await cliente.generarExplicacion(factores, { razonSocial: 'Hotel de prueba' });
  assert.strictEqual(resultado.origen, 'PLANTILLA');
  assert.ok(resultado.explicacion.includes('Análisis de riesgo calculado'));
  assert.ok(!resultado.explicacion.includes('Google Gemini generó'));
});

test('ClienteLLM - Si Gemini falla, conserva el análisis con respaldo claramente identificado', async () => {
  const ClienteLLM = require('../src/services/ClienteLLM');
  const fetchOriginal = global.fetch;
  global.fetch = async () => ({ ok: false, status: 503 });
  try {
    const cliente = new ClienteLLM({ apiKey: 'clave-de-prueba-no-real', tiempoEsperaMs: 1000 });
    const factores = [new FactorRiesgo({ nombre: 'Incidentes', peso: 1, valor: 0.5, descripcion: 'Un incidente activo' })];
    const resultado = await cliente.generarExplicacion(factores, { razonSocial: 'Proveedor de prueba' });
    assert.strictEqual(resultado.origen, 'PLANTILLA');
    assert.ok(resultado.explicacion.includes('no fue posible consultar el servicio de IA'));
  } finally {
    global.fetch = fetchOriginal;
  }
});

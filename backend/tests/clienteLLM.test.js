const test = require('node:test');
const assert = require('node:assert/strict');
const ClienteLLM = require('../src/services/ClienteLLM');
const FactorRiesgo = require('../src/domain/FactorRiesgo');

const factores = [
  new FactorRiesgo({ nombre: 'Evaluaciones', peso: 0.4, valor: 0.2, descripcion: 'Promedio 4.2/5' }),
  new FactorRiesgo({ nombre: 'Incidentes', peso: 0.35, valor: 0.1, descripcion: 'Un incidente leve' }),
  new FactorRiesgo({ nombre: 'Documentos', peso: 0.25, valor: 0, descripcion: 'Todos vigentes' })
];

test('ClienteLLM - Gemini recibe la clave en x-goog-api-key y no en la URL', async () => {
  const fetchOriginal = global.fetch;
  let solicitud;
  global.fetch = async (url, opciones) => {
    solicitud = { url, opciones };
    return {
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Análisis generado por Gemini.' }] } }]
      })
    };
  };

  try {
    const cliente = new ClienteLLM({ apiKey: 'CLAVE_DE_PRUEBA_NO_REAL', modelo: 'gemini-3.8-flash' });
    const resultado = await cliente.generarExplicacion(factores, { razonSocial: 'Hotel de prueba' });

    assert.equal(resultado.origen, 'LLM');
    assert.equal(resultado.explicacion, 'Análisis generado por Gemini.');
    assert.match(solicitud.url, /models\/gemini-3\.5-flash-lite:generateContent$/);
    assert.equal(solicitud.url.includes('CLAVE_DE_PRUEBA_NO_REAL'), false);
    assert.equal(solicitud.opciones.headers['x-goog-api-key'], 'CLAVE_DE_PRUEBA_NO_REAL');
    assert.equal(solicitud.opciones.method, 'POST');
  } finally {
    global.fetch = fetchOriginal;
  }
});

test('ClienteLLM - Error de Gemini conserva el estado HTTP y no revela la clave', async () => {
  const fetchOriginal = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 403,
    json: async () => ({ error: { message: 'API key no autorizada' } })
  });

  try {
    const cliente = new ClienteLLM({ apiKey: 'CLAVE_SECRETA_DE_PRUEBA', modelo: 'gemini-3.8-flash' });
    const resultado = await cliente.generarExplicacion(factores, { razonSocial: 'Hotel de prueba' });

    assert.equal(resultado.origen, 'PLANTILLA');
    assert.match(resultado.explicacion, /HTTP 403/);
    assert.equal(resultado.explicacion.includes('CLAVE_SECRETA_DE_PRUEBA'), false);
  } finally {
    global.fetch = fetchOriginal;
  }
});


test('ClienteLLM - Si Flash-Lite agota el tiempo, intenta el modelo configurado', async () => {
  const fetchOriginal = global.fetch;
  const modelosSolicitados = [];
  global.fetch = async (url, opciones) => {
    modelosSolicitados.push(url);
    if (url.includes('gemini-3.5-flash-lite')) {
      return new Promise((resolve, reject) => {
        opciones.signal.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        }, { once: true });
      });
    }
    return {
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'Respuesta de respaldo.' }] } }] })
    };
  };

  try {
    const cliente = new ClienteLLM({ apiKey: 'CLAVE_DE_PRUEBA', modelo: 'gemini-3.8-flash', tiempoEsperaMs: 10000 });
    // Se reduce el límite solo en esta prueba para no esperar 10 segundos.
    cliente.tiempoEsperaMs = 10000;
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = (fn, ms, ...args) => originalSetTimeout(fn, Math.min(ms, 15), ...args);
    try {
      const resultado = await cliente.generarExplicacion(factores, { razonSocial: 'Hotel de prueba' });
      assert.equal(resultado.origen, 'LLM');
      assert.equal(resultado.modelo, 'gemini-3.8-flash');
      assert.equal(modelosSolicitados.length, 2);
    } finally {
      global.setTimeout = originalSetTimeout;
    }
  } finally {
    global.fetch = fetchOriginal;
  }
});

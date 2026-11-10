const config = require('../config/config');

class ClienteLLM {
  constructor({
    endpoint = config.llm.endpoint,
    apiKey = config.llm.apiKey,
    modelo = config.llm.modelo,
    tiempoEsperaMs = config.llm.tiempoEsperaMs
  } = {}) {
    this.endpoint = endpoint;
    this.apiKey = String(apiKey || '').trim();
    this.modelo = String(modelo || 'gemini-3.8-flash').trim();
    this.tiempoEsperaMs = tiempoEsperaMs;
  }

  async generarExplicacion(factores, proveedorInfo = {}) {
    // El cálculo de riesgo no debe quedar bloqueado si Gemini no está configurado.
    // En ese caso se entrega una explicación determinística y se identifica
    // explícitamente como plantilla, nunca como una respuesta de IA.
    if (!this.apiKey && !this.endpoint) {
      return {
        explicacion: `${this.plantillaRespaldo(factores, proveedorInfo)}\n\nAviso de configuración: el backend no detectó GEMINI_API_KEY. Revisa backend/secrets/.env y reinicia el servidor.`,
        origen: 'PLANTILLA',
        motivo: 'GEMINI_API_KEY no configurada'
      };
    }

    const prompt = this.construirPrompt(factores, proveedorInfo);
    // Este análisis es breve: priorizamos Flash-Lite para reducir latencia.
    // Si no está disponible o está temporalmente saturado, probamos el modelo
    // configurado por el usuario como segunda opción.
    const modelosAProbar = [...new Set([
      'gemini-3.5-flash-lite',
      this.modelo,
      'gemini-3.8-flash'
    ])];
    let ultimoError = null;

    for (let indice = 0; indice < modelosAProbar.length; indice += 1) {
      const modeloActual = modelosAProbar[indice];
      const controller = new AbortController();
      // Evita que una sola petición monopolice el análisis. La pantalla tiene
      // un margen mayor para recibir el resultado o el diagnóstico final.
      const limiteMs = Math.min(Math.max(Number(this.tiempoEsperaMs) || 25000, 10000), 30000);
      const timeoutId = setTimeout(() => controller.abort(), limiteMs);
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modeloActual)}:generateContent`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey
          },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: 250,
              thinkingConfig: { thinkingLevel: 'LOW' }
            }
          })
        });

        if (!response.ok) {
          let detalle = '';
          try {
            const errorData = await response.json();
            detalle = errorData.error?.message || '';
          } catch (_) {}
          if (this.apiKey) detalle = detalle.split(this.apiKey).join('[CLAVE OCULTA]');
          const error = new Error(`Gemini (${modeloActual}) respondió HTTP ${response.status}${detalle ? `: ${detalle}` : ''}`);
          error.status = response.status;
          throw error;
        }

        const data = await response.json();
        const texto = data.candidates?.[0]?.content?.parts
          ?.map(parte => parte.text || '').join(' ').trim();
        if (!texto && data.promptFeedback?.blockReason) {
          throw new Error(`Gemini bloqueó la solicitud: ${data.promptFeedback.blockReason}`);
        }
        if (!texto) throw new Error(`Gemini (${modeloActual}) no devolvió texto.`);

        clearTimeout(timeoutId);
        return {
          explicacion: texto,
          origen: 'LLM',
          modelo: modeloActual
        };
      } catch (err) {
        clearTimeout(timeoutId);
        ultimoError = err;
        // Ante timeout, 429/5xx o modelo no disponible, continuar con el
        // siguiente modelo. Errores de autenticación/permisos no se arreglan
        // cambiando de modelo, por lo que se informan inmediatamente.
        const continuar = err.name === 'AbortError' || err.status === 404 || [429, 500, 502, 503, 504].includes(err.status);
        if (!continuar || indice === modelosAProbar.length - 1) break;
        if (err.status === 429 || [500, 502, 503, 504].includes(err.status)) {
          await new Promise(resolve => setTimeout(resolve, 1200 * (indice + 1)));
        }
      }
    }

    const detalleError = ultimoError?.name === 'AbortError'
      ? `tiempo de espera agotado en los modelos probados (máximo ${Math.min(Math.max(Number(this.tiempoEsperaMs) || 25000, 10000), 30000)} ms por intento)`
      : (ultimoError?.message || 'error desconocido al consultar Gemini');
    return {
      explicacion: `${this.plantillaRespaldo(factores, proveedorInfo)}\n\nAviso: no fue posible consultar el servicio de IA con Gemini (${detalleError}). Se intentó primero Gemini Flash-Lite y después los modelos alternativos configurados. Esta explicación fue generada mediante reglas locales, no por Gemini.`,
      origen: 'PLANTILLA',
      motivo: detalleError
    };
  }

  plantillaRespaldo(factores, proveedorInfo = {}) {
    const factorEv = factores.find(f => f.nombre === 'Evaluaciones');
    const factorInc = factores.find(f => f.nombre === 'Incidentes');
    const factorDoc = factores.find(f => f.nombre === 'Documentos');

    const partes = [];

    if (factorEv) {
      partes.push(`En evaluaciones de desempeño, el factor es de ${factorEv.valor.toFixed(2)}, aportando ${factorEv.aporte.toFixed(1)} puntos al riesgo general (${factorEv.descripcion}).`);
    }

    if (factorInc) {
      partes.push(`En historial de incidentes, el factor es de ${factorInc.valor.toFixed(2)}, aportando ${factorInc.aporte.toFixed(1)} puntos (${factorInc.descripcion}).`);
    }

    if (factorDoc) {
      partes.push(`En cumplimiento documental, el factor es de ${factorDoc.valor.toFixed(2)}, aportando ${factorDoc.aporte.toFixed(1)} puntos (${factorDoc.descripcion}).`);
    }

    return `Análisis de riesgo calculado mediante factores ponderados: ${partes.join(' ')}`;
  }

  construirPrompt(factores, proveedorInfo) {
    const resumenFactores = factores.map(f => `- ${f.nombre}: valor=${f.valor.toFixed(2)}, peso=${(f.peso * 100)}%, aporte=${f.aporte.toFixed(1)} pts (${f.descripcion})`).join('\n');
    return `Eres un analista de riesgo para TurisPro. Redacta una explicación profesional, concisa y objetiva (máximo 3 párrafos cortos) sobre el nivel de riesgo del proveedor turístico "${proveedorInfo.razonSocial || 'Proveedor'}" basándote estrictamente en los siguientes factores calculados:\n${resumenFactores}\nRecuerda redactar con tono institucional y no tomes decisiones definitivas; solo describe lo que indican los datos.`;
  }
}

module.exports = ClienteLLM;

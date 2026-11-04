const config = require('../config/config');

class ClienteLLM {
  constructor({
    endpoint = config.llm.endpoint,
    apiKey = config.llm.apiKey,
    modelo = config.llm.modelo,
    tiempoEsperaMs = config.llm.tiempoEsperaMs
  } = {}) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.modelo = modelo;
    this.tiempoEsperaMs = tiempoEsperaMs;
  }

  async generarExplicacion(factores, proveedorInfo = {}) {
    // Si no hay API Key o endpoint configurado, recurrir directamente a la plantilla de respaldo
    if (!this.apiKey && !this.endpoint) {
      return {
        explicacion: this.plantillaRespaldo(factores, proveedorInfo),
        origen: 'PLANTILLA'
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.tiempoEsperaMs);

    try {
      const prompt = this.construirPrompt(factores, proveedorInfo);
      let explicacionTexto = '';

      if (this.apiKey) {
        // Integración con Google Gemini REST API
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelo}:generateContent?key=${this.apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 300
            }
          })
        });

        if (!response.ok) {
          throw new Error(`Error en API LLM: HTTP ${response.status}`);
        }

        const data = await response.json();
        explicacionTexto = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      } else if (this.endpoint) {
        // Integración con endpoint genérico OpenAI-compatible o webhook
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({ prompt, factores, proveedorInfo })
        });

        if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
        const data = await response.json();
        explicacionTexto = data.explicacion || data.text || '';
      }

      clearTimeout(timeoutId);

      if (!explicacionTexto) {
        throw new Error('Respuesta vacía del servicio LLM');
      }

      return {
        explicacion: explicacionTexto,
        origen: 'LLM'
      };
    } catch (err) {
      clearTimeout(timeoutId);
      // En caso de error o tiempo agotado (tiempoEsperaMs), usar plantilla de respaldo
      return {
        explicacion: this.plantillaRespaldo(factores, proveedorInfo),
        origen: 'PLANTILLA'
      };
    }
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

const path = require('node:path');

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

// Validación de seguridad: en producción se prohíbe el uso de claves secretas predeterminadas
let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (isProduction) {
    throw new Error('CONFIGURACIÓN INSEGURA: Se requiere definir la variable de entorno JWT_SECRET en entorno de producción.');
  }
  jwtSecret = 'turispro_secret_key_2026_safe_jwt_token_dev';
}

const config = {
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
    env: nodeEnv
  },
  database: {
    filename: process.env.DB_PATH || path.join(__dirname, '../../turispro.db')
  },
  auth: {
    secret: jwtSecret,
    expiresInHours: 24
  },
  motorRiesgo: {
    pesos: {
      evaluaciones: 0.40,
      incidentes: 0.35,
      documentos: 0.25
    },
    umbrales: {
      umbralMedio: 34,
      umbralAlto: 67
    },
    diasProximoAVencer: 30,
    puntosSeveridad: {
      BAJA: 1,
      MEDIA: 3,
      ALTA: 5
    },
    divisorIncidentes: 10
  },
  llm: {
    endpoint: process.env.LLM_ENDPOINT || '',
    apiKey: process.env.GEMINI_API_KEY || process.env.LLM_API_KEY || '',
    modelo: process.env.LLM_MODEL || 'gemini-2.5-flash',
    tiempoEsperaMs: process.env.LLM_TIMEOUT_MS ? parseInt(process.env.LLM_TIMEOUT_MS, 10) : 4000
  }
};

module.exports = config;

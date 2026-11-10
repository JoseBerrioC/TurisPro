const path = require('node:path');
const fs = require('node:fs');

// Cargar secretos locales sin dependencias externas.
// En Windows algunos editores guardan el archivo como .env.txt o UTF-16LE;
// se admiten esas variantes para evitar que la clave quede sin detectar.
function decodificarArchivoEnv(buffer) {
  if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
    return buffer.toString('utf16le').replace(/^\uFEFF/, '');
  }
  if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
    const invertido = Buffer.alloc(buffer.length - 2);
    for (let i = 2; i + 1 < buffer.length; i += 2) {
      invertido[i - 2] = buffer[i + 1];
      invertido[i - 1] = buffer[i];
    }
    return invertido.toString('utf16le').replace(/^\uFEFF/, '');
  }
  return buffer.toString('utf8').replace(/^\uFEFF/, '');
}

function cargarArchivoEnv() {
  const rutasEnv = [
    path.resolve(__dirname, '../../secrets/.env'),
    path.resolve(__dirname, '../../secrets/.env.txt'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../.env.txt')
  ];
  const archivosEncontrados = [];

  for (const envPath of rutasEnv) {
    if (!fs.existsSync(envPath) || !fs.statSync(envPath).isFile()) continue;
    archivosEncontrados.push(envPath);
    const contenido = decodificarArchivoEnv(fs.readFileSync(envPath));

    for (const lineaOriginal of contenido.split(/\r?\n/)) {
      const linea = lineaOriginal.trim();
      if (!linea || linea.startsWith('#')) continue;
      const separador = linea.indexOf('=');
      if (separador < 1) continue;

      const clave = linea.slice(0, separador).trim().replace(/^export\s+/, '');
      let valor = linea.slice(separador + 1).trim();
      if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
        valor = valor.slice(1, -1);
      } else {
        valor = valor.replace(/\s+#.*$/, '').trim();
      }

      if (clave && (process.env[clave] === undefined || String(process.env[clave]).trim() === '')) {
        process.env[clave] = valor;
      }
    }
  }

  return archivosEncontrados;
}

const archivosEnvCargados = cargarArchivoEnv();

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
    apiKey: String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.LLM_API_KEY || '').trim(),
    modelo: String(process.env.LLM_MODEL || 'gemini-3.8-flash').trim(),
    tiempoEsperaMs: process.env.LLM_TIMEOUT_MS ? parseInt(process.env.LLM_TIMEOUT_MS, 10) : 45000
  }
};

// Diagnóstico seguro: nunca imprimir el contenido de la clave.
config.llm.apiKeyConfigurada = Boolean(config.llm.apiKey && !/^(TU_API_KEY|PEGAR_AQUI|YOUR_API_KEY)$/i.test(config.llm.apiKey));
config.llm.archivosEnvEncontrados = archivosEnvCargados.map(ruta => path.relative(path.resolve(__dirname, '../../..'), ruta));

module.exports = config;

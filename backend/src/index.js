const http = require('node:http');
const config = require('./config/config');
const { getDatabase } = require('./database/connection');
const { seed } = require('./database/seed');
const corsMiddleware = require('./middlewares/corsMiddleware');
const { serveStatic } = require('./middlewares/staticServer');
const { handleRequest } = require('./routes/router');

async function iniciarServidor() {
  console.log('🚀 Iniciando TurisPro Backend API...');

  // 1. Conexión y preparación de la base de datos
  const db = getDatabase();
  console.log(`📦 Base de datos conectada en: ${config.database.filename}`);

  // 2. Comprobar si se requieren datos iniciales
  const countUsers = db.prepare('SELECT COUNT(*) as c FROM usuarios').get();
  if (countUsers.c === 0) {
    console.log('⚡ Base de datos vacía detectada. Ejecutando seed inicial...');
    await seed(db);
  }

  // 3. Crear Servidor HTTP
  const server = http.createServer((req, res) => {
    // Aplicar CORS
    const isOptions = corsMiddleware(req, res);
    if (isOptions) return;

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // Si es una petición a la API, despachar a las rutas REST
    if (pathname.startsWith('/api/') || pathname === '/api') {
      return handleRequest(req, res);
    }

    // Si es un archivo estático del prototipo frontend, servirlo
    const servido = serveStatic(req, res);
    if (servido) return;

    // Si no se encontró estático, despachar al router (para 404 o API)
    handleRequest(req, res);
  });

  const PORT = config.server.port;
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`✅ Servidor TurisPro escuchando en http://localhost:${PORT}`);
    console.log(`🌐 Frontend Prototipo: http://localhost:${PORT}/`);
    console.log(`📋 API REST y Estado:  http://localhost:${PORT}/api/health`);
    console.log(`=======================================================`);
  });

  // Manejo de cierre ordenado
  const apagar = () => {
    console.log('\n🛑 Cerrando servidor HTTP de TurisPro...');
    server.close(() => {
      console.log('👋 Servidor detenido.');
      process.exit(0);
    });
  };

  process.on('SIGINT', apagar);
  process.on('SIGTERM', apagar);

  return server;
}

if (require.main === module) {
  iniciarServidor().catch(err => {
    console.error('❌ Error fatal al iniciar el servidor:', err);
    process.exit(1);
  });
}

module.exports = { iniciarServidor };

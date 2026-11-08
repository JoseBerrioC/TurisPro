const fs = require('node:fs');
const path = require('node:path');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
};

const STATIC_DIR = path.resolve(__dirname, '../../../frontend');

function serveStatic(req, res) {
  // Solo manejar GET y HEAD para archivos estáticos
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return false;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Si es la ruta raíz, redirigir o servir index.html
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  // Prevenir Directory Traversal
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(STATIC_DIR, safePath);

  // Asegurar que la ruta esté dentro del directorio estático
  if (!filePath.startsWith(STATIC_DIR)) {
    return false;
  }

  try {
    if (!fs.existsSync(filePath)) {
      return false;
    }

    const stat = fs.statSync(filePath);
    let targetFile = filePath;

    if (stat.isDirectory()) {
      const indexFile = path.join(filePath, 'index.html');
      if (fs.existsSync(indexFile)) {
        targetFile = indexFile;
      } else {
        return false;
      }
    }

    const ext = path.extname(targetFile).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': fs.statSync(targetFile).size,
      'Cache-Control': 'no-cache'
    });

    if (req.method === 'HEAD') {
      res.end();
      return true;
    }

    const stream = fs.createReadStream(targetFile);
    stream.pipe(res);
    return true;
  } catch (err) {
    console.error('Error sirviendo archivo estático:', err);
    return false;
  }
}

module.exports = {
  serveStatic
};

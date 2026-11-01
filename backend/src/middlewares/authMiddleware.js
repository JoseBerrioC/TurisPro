const AuthService = require('../services/AuthService');
const Usuario = require('../domain/Usuario');

function autenticar(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  const payload = AuthService.verificarToken(token);
  if (!payload || !payload.idUsuario) {
    return null;
  }

  const usuario = Usuario.buscarPorId(payload.idUsuario);
  if (!usuario || !usuario.activo) {
    return null;
  }

  return usuario;
}

function requerirAutenticacion(req, res) {
  const usuario = autenticar(req);
  if (!usuario) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'No autorizado. Se requiere iniciar sesión con un token válido.' }));
    return null;
  }
  req.usuario = usuario;
  return usuario;
}

function requerirRol(...rolesPermitidos) {
  return function(req, res) {
    const usuario = requerirAutenticacion(req, res);
    if (!usuario) return null;

    if (!rolesPermitidos.includes(usuario.rol)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: `Acceso denegado. Se requiere uno de los siguientes roles: ${rolesPermitidos.join(', ')}`,
        rolActual: usuario.rol
      }));
      return null;
    }
    return usuario;
  };
}

module.exports = {
  autenticar,
  requerirAutenticacion,
  requerirRol
};

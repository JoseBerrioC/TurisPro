const AuthService = require('../services/AuthService');
const Usuario = require('../domain/Usuario');
const { Rol } = require('../domain/enums');

class AuthController {
  static async login(body) {
    const { correo, clave } = body || {};
    // HU-01: Login con correo y clave
    const resultado = await AuthService.iniciarSesion(correo, clave);
    return {
      status: 200,
      body: resultado
    };
  }

  static perfil(usuario) {
    return {
      status: 200,
      body: {
        usuario: usuario.toJSON(),
        permisos: {
          puedeGestionarUsuarios: usuario.tienePermiso('gestionar_usuarios'),
          puedeRegistrarProveedor: usuario.tienePermiso('registrar_proveedor'),
          puedeEditarProveedor: usuario.tienePermiso('editar_proveedor'),
          puedeDesactivarProveedor: usuario.tienePermiso('desactivar_proveedor'),
          puedeGestionarServicios: usuario.tienePermiso('gestionar_servicios'),
          puedeGestionarDocumentos: usuario.tienePermiso('gestionar_documentos'),
          puedeEvaluar: usuario.tienePermiso('evaluar_proveedor'),
          puedeRegistrarIncidente: usuario.tienePermiso('registrar_incidente')
        }
      }
    };
  }

  static actualizarPerfil(body, usuarioActual) {
    const nombre = String(body?.nombre || '').trim();
    const correo = String(body?.correo || '').trim().toLowerCase();
    if (!nombre || nombre.length > 100) {
      return { status: 400, body: { error: 'El nombre es obligatorio y no puede superar 100 caracteres.' } };
    }
    if (!correo || correo.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      return { status: 400, body: { error: 'Ingresa un correo electrónico válido.' } };
    }
    const existente = Usuario.buscarPorCorreo(correo);
    if (existente && existente.idUsuario !== usuarioActual.idUsuario) {
      return { status: 409, body: { error: 'Ese correo ya está registrado por otro usuario.' } };
    }
    const actualizado = Usuario.actualizarPerfil(usuarioActual.idUsuario, nombre, correo);
    return { status: 200, body: { mensaje: 'Perfil actualizado correctamente.', usuario: actualizado.toJSON() } };
  }

  static cambiarContrasena(body, usuarioActual) {
    const actual = String(body?.contrasenaActual || '');
    const nueva = String(body?.nuevaContrasena || '');
    if (!actual || !nueva) return { status: 400, body: { error: 'Completa la contraseña actual y la nueva contraseña.' } };
    if (!Usuario.verificarClave(actual, usuarioActual.contrasenaHash)) {
      return { status: 400, body: { error: 'La contraseña actual no es correcta.' } };
    }
    const cumplePolitica = nueva.length >= 12 && /[A-Z]/.test(nueva) && /[a-z]/.test(nueva) && /[0-9]/.test(nueva) && /[^A-Za-z0-9]/.test(nueva);
    if (!cumplePolitica) {
      return { status: 400, body: { error: 'La nueva contraseña debe tener al menos 12 caracteres e incluir mayúsculas, minúsculas, números y símbolos.' } };
    }
    if (actual === nueva) return { status: 400, body: { error: 'La nueva contraseña debe ser diferente de la actual.' } };
    Usuario.actualizarContrasena(usuarioActual.idUsuario, nueva);
    return { status: 200, body: { mensaje: 'Contraseña actualizada correctamente.' } };
  }

  static menuPorRol(usuario) {
    // HU-02: Genera los enlaces y opciones permitidas para el menú lateral según el rol.
    // Debe mantenerse alineado con NAV_ITEMS de frontend/src/assets/js/sidebar.js.
    const TODOS = [Rol.ADMINISTRADOR, Rol.GESTOR_PROVEEDORES, Rol.EVALUADOR];
    const ADMIN_GESTOR = [Rol.ADMINISTRADOR, Rol.GESTOR_PROVEEDORES];

    const catalogo = [
      { id: 'dashboard',      nombre: 'Inicio',        ruta: '/src/pages/dashboard/dashboard.html',                   icono: 'dashboard',      roles: TODOS },
      { id: 'proveedores',    nombre: 'Proveedores',   ruta: '/src/pages/providers/directory.html',                   icono: 'domain',         roles: TODOS },
      { id: 'comparar',       nombre: 'Comparar',      ruta: '/src/pages/providers/compare.html',                     icono: 'compare_arrows', roles: TODOS },
      { id: 'documentos',     nombre: 'Documentos',    ruta: '/src/pages/providers/documents.html',                   icono: 'folder',         roles: ADMIN_GESTOR },
      { id: 'evaluaciones',   nombre: 'Evaluaciones',  ruta: '/src/pages/providers/hotel-los-andes/evaluations.html', icono: 'fact_check',     roles: TODOS },
      { id: 'incidentes',     nombre: 'Incidentes',    ruta: '/src/pages/providers/hotel-los-andes/incidents.html',   icono: 'report_problem', roles: TODOS },
      { id: 'reportes',       nombre: 'Reportes',      ruta: '/src/pages/reports/executive-analytics.html',           icono: 'analytics',      roles: ADMIN_GESTOR },
      { id: 'analisis_riesgo', nombre: 'Análisis IA',  ruta: '/src/pages/risk/ai-risk-analysis.html',                 icono: 'psychology',     roles: TODOS },
      { id: 'configuracion',  nombre: 'Configuración', ruta: '/src/pages/settings/settings.html',                     icono: 'settings',       roles: TODOS }
    ];

    const items = catalogo
      .filter((item) => item.roles.includes(usuario.rol))
      .map(({ roles, ...item }) => item);

    return {
      status: 200,
      body: {
        rol: usuario.rol,
        items
      }
    };
  }

  static crearUsuario(body, adminUsuario) {
    if (adminUsuario.rol !== Rol.ADMINISTRADOR) {
      return { status: 403, body: { error: 'Solo los administradores pueden crear usuarios' } };
    }

    const { nombre, correo, clave, rol } = body || {};
    const nuevo = Usuario.crearUsuario({ nombre, correo, clave, rol });
    return {
      status: 201,
      body: {
        mensaje: 'Usuario creado exitosamente',
        usuario: nuevo.toJSON()
      }
    };
  }

  static listarUsuarios(adminUsuario) {
    if (adminUsuario.rol !== Rol.ADMINISTRADOR) {
      return { status: 403, body: { error: 'Solo los administradores pueden consultar usuarios' } };
    }
    const usuarios = Usuario.listarTodos();
    return {
      status: 200,
      body: usuarios
    };
  }
}

module.exports = AuthController;

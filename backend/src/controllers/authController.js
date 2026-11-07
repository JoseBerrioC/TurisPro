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

  static menuPorRol(usuario) {
    // HU-02: Genera los enlaces y opciones permitidas para el menú lateral según el rol
    const baseMenu = [
      { id: 'dashboard', nombre: 'Dashboard', ruta: '/src/pages/dashboard/dashboard.html', icono: 'dashboard' },
      { id: 'proveedores', nombre: 'Proveedores', ruta: '/src/pages/providers/directory.html', icono: 'storefront' },
      { id: 'comparar', nombre: 'Comparar Proveedores', ruta: '/src/pages/providers/compare.html', icono: 'compare_arrows' }
    ];

    if (usuario.rol === Rol.ADMINISTRADOR || usuario.rol === Rol.GESTOR_PROVEEDORES) {
      baseMenu.push(
        { id: 'registrar_proveedor', nombre: 'Nuevo Proveedor', ruta: '/src/pages/providers/register.html', icono: 'add_business' }
      );
    }

    baseMenu.push(
      { id: 'analisis_riesgo', nombre: 'Análisis IA', ruta: '/src/pages/risk/ai-risk-analysis.html', icono: 'psychology' },
      { id: 'reportes', nombre: 'Reportes', ruta: '/src/pages/reports/executive-analytics.html', icono: 'bar_chart' }
    );

    if (usuario.rol === Rol.ADMINISTRADOR) {
      baseMenu.push(
        { id: 'configuracion', nombre: 'Configuración y Usuarios', ruta: '/src/pages/settings/settings.html', icono: 'settings' }
      );
    }

    return {
      status: 200,
      body: {
        rol: usuario.rol,
        items: baseMenu
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

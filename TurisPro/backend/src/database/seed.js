const { getDatabase } = require('./connection');
const Usuario = require('../domain/Usuario');
const Proveedor = require('../domain/Proveedor');
const Servicio = require('../domain/Servicio');
const Documento = require('../domain/Documento');
const Evaluacion = require('../domain/Evaluacion');
const Incidente = require('../domain/Incidente');
const ZonaCobertura = require('../domain/ZonaCobertura');
const MotorRiesgo = require('../services/MotorRiesgo');
const { Rol, TipoProveedor, SeveridadIncidente, EstadoIncidente } = require('../domain/enums');

async function seed(customDb = null) {
  const db = customDb || getDatabase();

  console.log('🌱 Inicializando datos semilla de TurisPro...');

  // 1. Usuarios por defecto (HU-01, HU-02)
  const usuariosExistentes = db.prepare('SELECT COUNT(*) as count FROM usuarios').get();
  let adminUser, gestorUser, evaluadorUser;

  if (usuariosExistentes.count === 0) {
    adminUser = Usuario.crearUsuario({
      nombre: 'Administrador General',
      correo: 'admin@turispro.com',
      clave: 'Admin123*',
      rol: Rol.ADMINISTRADOR
    });

    gestorUser = Usuario.crearUsuario({
      nombre: 'Gestor de Proveedores',
      correo: 'gestor@turispro.com',
      clave: 'Gestor123*',
      rol: Rol.GESTOR_PROVEEDORES
    });

    evaluadorUser = Usuario.crearUsuario({
      nombre: 'Evaluador Turístico',
      correo: 'evaluador@turispro.com',
      clave: 'Evaluador123*',
      rol: Rol.EVALUADOR
    });
    console.log('✅ 3 usuarios por defecto creados (admin, gestor, evaluador).');
  } else {
    adminUser = Usuario.buscarPorCorreo('admin@turispro.com');
    gestorUser = Usuario.buscarPorCorreo('gestor@turispro.com');
    evaluadorUser = Usuario.buscarPorCorreo('evaluador@turispro.com');
  }

  // 2. Zonas de Cobertura
  const zonasCount = db.prepare('SELECT COUNT(*) as count FROM zonas_cobertura').get();
  let zonaBogota, zonaCartagena, zonaMedellin, zonaCusco;

  if (zonasCount.count === 0) {
    zonaBogota = ZonaCobertura.crear({ pais: 'Colombia', ciudad: 'Bogotá', descripcion: 'Zona Andina Capital' });
    zonaCartagena = ZonaCobertura.crear({ pais: 'Colombia', ciudad: 'Cartagena', descripcion: 'Zona Caribe Turística' });
    zonaMedellin = ZonaCobertura.crear({ pais: 'Colombia', ciudad: 'Medellín', descripcion: 'Zona Valle de Aburrá' });
    zonaCusco = ZonaCobertura.crear({ pais: 'Perú', ciudad: 'Cusco', descripcion: 'Región de los Andes Peruanos' });
    console.log('✅ Zonas de cobertura registradas.');
  } else {
    const todasZonas = ZonaCobertura.listarTodas();
    zonaBogota = todasZonas[0];
    zonaCartagena = todasZonas[1];
    zonaMedellin = todasZonas[2];
    zonaCusco = todasZonas[3];
  }

  // 3. Proveedores (Hotel Los Andes, Transportes del Caribe, Vuelos Andinos)
  const proveedoresCount = db.prepare('SELECT COUNT(*) as count FROM proveedores').get();
  if (proveedoresCount.count === 0) {
    // Proveedor 1: Hotel Los Andes (Ficha prototipo)
    const hotelLosAndes = Proveedor.registrar({
      razonSocial: 'Hotel Los Andes S.A.S.',
      nit: '900.123.456-7',
      tipo: TipoProveedor.HOTEL,
      correo: 'contacto@hotellosandes.com',
      telefono: '+57 601 2345678',
      direccion: 'Carrera 7 # 120-45, Bogotá',
      zonasIds: [zonaBogota.idZona, zonaCartagena.idZona]
    });

    // Proveedor 2: Transportes Andinos
    const transportes = Proveedor.registrar({
      razonSocial: 'Transportes Andinos Express',
      nit: '901.987.654-3',
      tipo: TipoProveedor.TRANSPORTADOR,
      correo: 'operaciones@transportesandinos.com',
      telefono: '+57 604 8765432',
      direccion: 'Calle 10 # 43E-12, Medellín',
      zonasIds: [zonaMedellin.idZona]
    });

    // Proveedor 3: Rutas del Inca Tours
    const tours = Proveedor.registrar({
      razonSocial: 'Rutas del Inca Tours E.I.R.L.',
      nit: '204.567.890-1',
      tipo: TipoProveedor.OPERADOR,
      correo: 'reservas@rutasdelinca.pe',
      telefono: '+51 84 223344',
      direccion: 'Av. El Sol 450, Cusco',
      zonasIds: [zonaCusco.idZona]
    });

    console.log('✅ Proveedores registrados (Hotel Los Andes, Transportes Andinos, Rutas del Inca).');

    // 4. Servicios para Hotel Los Andes
    Servicio.agregar({
      idProveedor: hotelLosAndes.idProveedor,
      nombre: 'Habitación Estándar Queen',
      descripcion: 'Incluye desayuno buffet y acceso a zonas húmedas',
      tarifa: 280000,
      unidad: 'Noche',
      vigenteDesde: '2026-01-01',
      vigenteHasta: '2026-12-31'
    });

    Servicio.agregar({
      idProveedor: hotelLosAndes.idProveedor,
      nombre: 'Suite Panorámica',
      descripcion: 'Vista a la montaña, tina de hidromasaje y minibar',
      tarifa: 450000,
      unidad: 'Noche',
      vigenteDesde: '2026-01-01',
      vigenteHasta: '2026-12-31'
    });

    Servicio.agregar({
      idProveedor: hotelLosAndes.idProveedor,
      nombre: 'Salón de Eventos Ejecutivo',
      descripcion: 'Capacidad para 50 personas con equipos audiovisuales',
      tarifa: 900000,
      unidad: 'Jornada',
      vigenteDesde: '2026-01-01',
      vigenteHasta: '2026-12-31'
    });

    // Servicios para Transportes
    Servicio.agregar({
      idProveedor: transportes.idProveedor,
      nombre: 'Traslado Aeropuerto - Hotel',
      descripcion: 'Vehículo tipo van con capacidad para 8 pasajeros',
      tarifa: 120000,
      unidad: 'Trayecto',
      vigenteDesde: '2026-01-01',
      vigenteHasta: '2026-12-31'
    });

    // 5. Documentos con distintos estados de vigencia
    const hoy = new Date();
    const fechaVigente = new Date(hoy.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const fechaPorVencer = new Date(hoy.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // 15 días <= 30
    const fechaVencida = new Date(hoy.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);  // -10 días < 0

    // Para Hotel Los Andes
    Documento.registrar({
      idProveedor: hotelLosAndes.idProveedor,
      tipo: 'Registro Nacional de Turismo (RNT)',
      fechaEmision: '2026-01-10',
      fechaVencimiento: fechaVigente,
      archivoUrl: 'https://docs.turispro.com/rnt-hotellosandes.pdf'
    });

    Documento.registrar({
      idProveedor: hotelLosAndes.idProveedor,
      tipo: 'Certificado de Bomberos y Seguridad Humana',
      fechaEmision: '2025-11-20',
      fechaVencimiento: fechaPorVencer,
      archivoUrl: 'https://docs.turispro.com/bomberos-hotellosandes.pdf'
    });

    Documento.registrar({
      idProveedor: hotelLosAndes.idProveedor,
      tipo: 'Póliza de Responsabilidad Civil Extracontractual',
      fechaEmision: '2025-10-01',
      fechaVencimiento: fechaVencida,
      archivoUrl: 'https://docs.turispro.com/poliza-hotellosandes.pdf'
    });

    // Para Transportes
    Documento.registrar({
      idProveedor: transportes.idProveedor,
      tipo: 'SOAT Colectivo y Tecnicomecánica',
      fechaEmision: '2026-01-15',
      fechaVencimiento: fechaVigente,
      archivoUrl: 'https://docs.turispro.com/soat-transportes.pdf'
    });

    // 6. Evaluaciones de desempeño (HU-09, HU-10)
    // Hotel Los Andes: evaluación positiva
    Evaluacion.registrar({
      idProveedor: hotelLosAndes.idProveedor,
      idEvaluador: evaluadorUser ? evaluadorUser.idUsuario : 3,
      criterios: [4, 4, 5, 4, 4], // promedio = 4.2
      comentario: 'Excelente atención al huésped, puntualidad en reservas y buena relación calidad-precio.'
    });

    Evaluacion.registrar({
      idProveedor: hotelLosAndes.idProveedor,
      idEvaluador: evaluadorUser ? evaluadorUser.idUsuario : 3,
      criterios: [4, 5, 4, 3, 4], // promedio = 4.0
      comentario: 'Instalaciones en muy buen estado. Debe agilizarse la renovación de la póliza de seguro.'
    });

    // Transportes Andinos: evaluación regular
    Evaluacion.registrar({
      idProveedor: transportes.idProveedor,
      idEvaluador: evaluadorUser ? evaluadorUser.idUsuario : 3,
      criterios: [3, 2, 3, 4, 3], // promedio = 3.0
      comentario: 'Retraso de 25 minutos en el servicio del aeropuerto el pasado fin de semana.'
    });

    // 7. Incidentes (HU-11)
    Incidente.registrar({
      idProveedor: hotelLosAndes.idProveedor,
      idRegistradoPor: evaluadorUser ? evaluadorUser.idUsuario : 3,
      tipo: 'Falla técnica',
      severidad: SeveridadIncidente.BAJA,
      estado: EstadoIncidente.CERRADO,
      descripcion: 'Intermitencia en el ascensor de la torre norte durante 2 horas; reparado por el técnico.'
    });

    Incidente.registrar({
      idProveedor: hotelLosAndes.idProveedor,
      idRegistradoPor: evaluadorUser ? evaluadorUser.idUsuario : 3,
      tipo: 'Reclamo de servicio',
      severidad: SeveridadIncidente.MEDIA,
      estado: EstadoIncidente.EN_SEGUIMIENTO,
      descripcion: 'Huéspedes reportan cobro no concertado de minibar; se encuentra en revisión de facturación.'
    });

    // Incidente severo para Transportes
    Incidente.registrar({
      idProveedor: transportes.idProveedor,
      idRegistradoPor: evaluadorUser ? evaluadorUser.idUsuario : 3,
      tipo: 'Incumplimiento de ruta',
      severidad: SeveridadIncidente.ALTA,
      estado: EstadoIncidente.ABIERTO,
      descripcion: 'Vehículo no se presentó al punto de recogida para tour guiado en Medellín.'
    });

    // 8. Calcular análisis de riesgo inicial para los proveedores
    const motor = new MotorRiesgo();
    await motor.analizar(hotelLosAndes, true);
    await motor.analizar(transportes, true);

    console.log('✅ Análisis de riesgo inicial calculado para proveedores semilla.');
  }

  console.log('🎉 Seed completado con éxito.');
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error al ejecutar seed:', err);
      process.exit(1);
    });
}

module.exports = { seed };

/**
 * Enumeraciones del dominio según el Diagrama de Clases UML de TurisPro
 */

const Rol = Object.freeze({
  ADMINISTRADOR: 'ADMINISTRADOR',
  GESTOR_PROVEEDORES: 'GESTOR_PROVEEDORES',
  EVALUADOR: 'EVALUADOR'
});

const TipoProveedor = Object.freeze({
  HOTEL: 'HOTEL',
  AEROLINEA: 'AEROLINEA',
  TRANSPORTADOR: 'TRANSPORTADOR',
  OPERADOR: 'OPERADOR',
  GUIA: 'GUIA',
  RESTAURANTE: 'RESTAURANTE',
  ASEGURADORA: 'ASEGURADORA'
});

const SeveridadIncidente = Object.freeze({
  BAJA: 'BAJA',
  MEDIA: 'MEDIA',
  ALTA: 'ALTA'
});

const EstadoIncidente = Object.freeze({
  ABIERTO: 'ABIERTO',
  EN_SEGUIMIENTO: 'EN_SEGUIMIENTO',
  CERRADO: 'CERRADO'
});

const EstadoDocumento = Object.freeze({
  VIGENTE: 'Vigente',
  POR_VENCER: 'Por vencer',
  VENCIDO: 'Vencido'
});

const NivelRiesgo = Object.freeze({
  BAJO: 'BAJO',
  MEDIO: 'MEDIO',
  ALTO: 'ALTO',
  SIN_DATOS: 'SIN_DATOS'
});

const EstadoProveedor = Object.freeze({
  REGISTRADO: 'Registrado',
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo'
});

const OrigenExplicacion = Object.freeze({
  LLM: 'LLM',
  PLANTILLA: 'PLANTILLA'
});

module.exports = {
  Rol,
  TipoProveedor,
  SeveridadIncidente,
  EstadoIncidente,
  EstadoDocumento,
  NivelRiesgo,
  EstadoProveedor,
  OrigenExplicacion
};

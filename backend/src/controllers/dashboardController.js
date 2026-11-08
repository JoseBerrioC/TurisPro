const Reporte = require('../domain/Reporte');
const ZonaCobertura = require('../domain/ZonaCobertura');

class DashboardController {
  static resumenDashboard() {
    // HU-14: Dashboard simple con 4 indicadores y tabla de atención
    const reporte = new Reporte();
    const datos = reporte.obtenerIndicadores();
    return {
      status: 200,
      body: datos
    };
  }

  static analitica(periodo) {
    const reporte = new Reporte();
    return { status: 200, body: reporte.obtenerAnalitica(periodo) };
  }

  static ranking() {
    const reporte = new Reporte();
    const datos = reporte.obtenerRanking();
    return {
      status: 200,
      body: datos
    };
  }

  static comparar(body) {
    // HU-15: Comparar 2 o 3 proveedores seleccionados
    const { ids } = body || {};
    const reporte = new Reporte();
    const comparativa = reporte.compararProveedores(ids);
    return {
      status: 200,
      body: comparativa
    };
  }

  static listarZonas() {
    const zonas = ZonaCobertura.listarTodas();
    return {
      status: 200,
      body: zonas
    };
  }
}

module.exports = DashboardController;

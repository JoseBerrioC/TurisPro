const { getDatabase } = require('../database/connection');

class PreferenciasUsuario {
  constructor({ idUsuario, diasAlerta = 30, alertasIncidentes = 1, alertasEvaluaciones = 1, actualizadoEn = null }) {
    this.idUsuario = idUsuario;
    this.diasAlerta = Number(diasAlerta) || 30;
    this.alertasIncidentes = Boolean(Number(alertasIncidentes));
    this.alertasEvaluaciones = Boolean(Number(alertasEvaluaciones));
    this.actualizadoEn = actualizadoEn;
  }

  static obtenerPorUsuario(idUsuario) {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM preferencias_usuario WHERE id_usuario = ?').get(idUsuario);
    if (!row) {
      return new PreferenciasUsuario({
        idUsuario,
        diasAlerta: 30,
        alertasIncidentes: 1,
        alertasEvaluaciones: 1
      });
    }
    return new PreferenciasUsuario({
      idUsuario: row.id_usuario,
      diasAlerta: row.dias_alerta,
      alertasIncidentes: row.alertas_incidentes,
      alertasEvaluaciones: row.alertas_evaluaciones,
      actualizadoEn: row.actualizado_en
    });
  }

  static guardar(idUsuario, { diasAlerta, alertasIncidentes, alertasEvaluaciones }) {
    const dias = [7, 15, 30].includes(Number(diasAlerta)) ? Number(diasAlerta) : 30;
    const inc = alertasIncidentes ? 1 : 0;
    const eval_ = alertasEvaluaciones ? 1 : 0;

    const db = getDatabase();
    db.prepare(`
      INSERT INTO preferencias_usuario (id_usuario, dias_alerta, alertas_incidentes, alertas_evaluaciones, actualizado_en)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id_usuario) DO UPDATE SET
        dias_alerta = excluded.dias_alerta,
        alertas_incidentes = excluded.alertas_incidentes,
        alertas_evaluaciones = excluded.alertas_evaluaciones,
        actualizado_en = CURRENT_TIMESTAMP
    `).run(idUsuario, dias, inc, eval_);

    return this.obtenerPorUsuario(idUsuario);
  }

  toJSON() {
    return {
      idUsuario: this.idUsuario,
      diasAlerta: this.diasAlerta,
      alertasIncidentes: this.alertasIncidentes,
      alertasEvaluaciones: this.alertasEvaluaciones,
      actualizadoEn: this.actualizadoEn
    };
  }
}

module.exports = PreferenciasUsuario;

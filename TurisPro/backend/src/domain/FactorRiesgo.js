class FactorRiesgo {
  constructor({ idFactor = null, idAnalisis = null, nombre, peso, valor, aporte = null, descripcion = '' }) {
    this.idFactor = idFactor;
    this.idAnalisis = idAnalisis;
    this.nombre = nombre;
    this.peso = Number(peso);
    this.valor = Number(valor);
    this.aporte = aporte !== null ? Number(aporte) : this.calcularAporte();
    this.descripcion = descripcion || this.describir();
  }

  calcularAporte() {
    // El aporte al puntaje global (0 a 100) es: peso * valor * 100
    const calc = Math.round(this.peso * this.valor * 100 * 100) / 100;
    return calc;
  }

  describir() {
    if (this.descripcion) return this.descripcion;
    return `Factor ${this.nombre}: peso ${(this.peso * 100).toFixed(0)}%, valor base ${this.valor.toFixed(2)}, aporte al riesgo ${this.aporte.toFixed(1)} pts.`;
  }

  toJSON() {
    return {
      idFactor: this.idFactor,
      idAnalisis: this.idAnalisis,
      nombre: this.nombre,
      peso: this.peso,
      valor: this.valor,
      aporte: this.aporte,
      descripcion: this.descripcion
    };
  }
}

module.exports = FactorRiesgo;

/**
 * TurisPro - Reloj en vivo (zona horaria America/Bogota).
 * Actualiza los elementos #turispro-live-date y #turispro-live-time si existen.
 */
(function () {
  'use strict';

  function init() {
    var dateNode = document.getElementById('turispro-live-date');
    var timeNode = document.getElementById('turispro-live-time');
    if (!dateNode && !timeNode) return;

    var opts = { timeZone: 'America/Bogota' };
    var dateFmt = new Intl.DateTimeFormat('es-CO', Object.assign({ weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }, opts));
    var timeFmt = new Intl.DateTimeFormat('es-CO', Object.assign({ hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }, opts));

    function tick() {
      var now = new Date();
      if (dateNode) dateNode.textContent = dateFmt.format(now);
      if (timeNode) timeNode.textContent = timeFmt.format(now);
    }

    tick();
    if (!window.__turisproClock) window.__turisproClock = setInterval(tick, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

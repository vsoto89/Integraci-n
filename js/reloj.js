/* ═══════════════════════════════════════════════
   LogiTrack — reloj.js
   Reloj en tiempo real en el topbar
═══════════════════════════════════════════════ */

function actualizarReloj() {
  const now = new Date();
  document.getElementById('clock').textContent =
    now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

setInterval(actualizarReloj, 1000);
actualizarReloj();

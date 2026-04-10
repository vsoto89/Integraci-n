/* ═══════════════════════════════════════════════
   LogiTrack — navegacion.js
   Control del sidebar y persistencia de sección
═══════════════════════════════════════════════ */

// ── Mostrar sección activa ──────────────────────
function showSection(e, sectionId) {
  // Actualizar estilo del menú
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (e && e.currentTarget) e.currentTarget.classList.add('active');

  // Mostrar/ocultar secciones
  document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
  document.getElementById(sectionId).style.display = 'flex';

  // Persistir selección
  localStorage.setItem('ultimaSeccion', sectionId);
}

// ── Recuperar sección al recargar ───────────────
window.addEventListener('load', () => {
  const seccionGuardada = localStorage.getItem('ultimaSeccion');

  if (seccionGuardada && seccionGuardada !== 'sec-dashboard') {
    const botones = document.querySelectorAll('.nav-item');
    let botonCorrecto;

    if (seccionGuardada === 'sec-registrar') botonCorrecto = botones[1];
    // Añadir más secciones aquí si se agregan en el futuro

    if (botonCorrecto) {
      showSection({ currentTarget: botonCorrecto }, seccionGuardada);
    }
  } else {
    showSection(null, 'sec-dashboard');
  }
});

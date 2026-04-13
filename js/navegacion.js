/* ═══════════════════════════════════════════════
   LogiTrack — navegacion.js (Versión Sin Parpadeo)
═══════════════════════════════════════════════ */

window.showSection = function(e, sectionId) {
  // 1. Limpiar estados previos
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');

  // 2. Activar la sección visualmente
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
      targetSection.style.display = 'flex';
  }

  // 3. Activar el botón del menú
  // Si viene de un clic (e no es null), usamos e.currentTarget
  if (e && e.currentTarget) {
      e.currentTarget.classList.add('active');
  } 
  // Si viene de la carga de página, buscamos el botón por su onclick
  else {
      const btn = document.querySelector(`.nav-item[onclick*="${sectionId}"]`);
      if (btn) btn.classList.add('active');
  }

  localStorage.setItem('ultimaSeccion', sectionId);
};

// ── Ejecución inmediata al cargar ──
window.addEventListener('DOMContentLoaded', () => {
  const seccionGuardada = localStorage.getItem('ultimaSeccion') || 'sec-dashboard';
  
  // Llamamos a la función sin evento para que ella busque el botón correcto
  showSection(null, seccionGuardada);
});
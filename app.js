/* ═══════════════════════════════════════════════
   LogiTrack — Dashboard de Control Vehicular
   app.js
═══════════════════════════════════════════════ */

// ── DATOS EN MEMORIA ───────────────────────────
let movimientos = [];
let alertas = [];
let contadorAlertas = 0;

// ── RELOJ ──────────────────────────────────────
function actualizarReloj() {
  const now = new Date();
  document.getElementById('clock').textContent =
    now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(actualizarReloj, 1);
actualizarReloj();

// ── REGISTRAR MOVIMIENTO ───────────────────────
// Si se llama sin argumentos, toma los datos del formulario.
// Si se pasa un objeto "datos", lo usa directamente (ej: simulador o API).
function registrarMovimiento(datos = null) {
  const now = new Date();

  const mov = datos || {
    camionId: document.getElementById('f-camion').value.trim().toUpperCase() || 'CAM-???',
    tipo:     document.getElementById('f-tipo').value,
    estado:   document.getElementById('f-estado').value,
    fecha:    now.toLocaleDateString('es-CL'),
    hora:     now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    ts:       now
  };

  movimientos.unshift(mov);
  actualizarTabla();
  actualizarKPIs();
  actualizarCharts();
  agregarAlerta(mov);

  // Limpiar formulario solo si fue ingreso manual
  if (!datos) {
    document.getElementById('f-camion').value = '';
  }
}

// ── TABLA DE MOVIMIENTOS ───────────────────────
function actualizarTabla() {
  const tbody = document.getElementById('tabla-movimientos');

  if (movimientos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;color:var(--muted);padding:32px">
          Sin movimientos registrados
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = movimientos.slice(0, 30).map(m => `
    <tr>
      <td><span class="truck-id">${m.camionId}</span></td>
      <td>
        <span class="tipo-badge ${m.tipo === 'INGRESO' ? 'ingreso' : 'salida'}">
          ${m.tipo}
        </span>
      </td>
      <td>${m.fecha}</td>
      <td>${m.hora}</td>
      <td>
        <span class="badge ${
          m.estado === 'Autorizado' ? 'badge-green' :
          m.estado === 'Rechazado'  ? 'badge-red'   : 'badge-amber'
        }">
          ${m.estado}
        </span>
      </td>
    </tr>
  `).join('');
}

// ── KPIs ───────────────────────────────────────
function actualizarKPIs() {
  const hoy      = new Date().toLocaleDateString('es-CL');
  const hoyMovs  = movimientos.filter(m => m.fecha === hoy);
  const ingresos = hoyMovs.filter(m => m.tipo === 'INGRESO').length;
  const salidas  = hoyMovs.filter(m => m.tipo === 'SALIDA').length;

  document.getElementById('kpi-total').textContent    = hoyMovs.length;
  document.getElementById('kpi-ingresos').textContent = ingresos;
  document.getElementById('kpi-salidas').textContent  = salidas;
  document.getElementById('kpi-planta').textContent   = Math.max(0, ingresos - salidas);
}

// ── PANEL DE ALERTAS ───────────────────────────
function agregarAlerta(mov) {
  const mapa = {
    'INGRESO': { cls: 'ok',   icon: '✓', msg: `Camión ${mov.camionId} ingresó a la planta` },
    'SALIDA':  { cls: 'info', icon: '↗', msg: `Camión ${mov.camionId} salió de la planta`  }
  };

  if (mov.estado === 'Rechazado') {
    alertas.unshift({
      cls:  'danger',
      icon: '✕',
      msg:  `Acceso rechazado: ${mov.camionId}`,
      hora: mov.hora
    });
    contadorAlertas++;
  } else {
    const t = mapa[mov.tipo];
    alertas.unshift({ cls: t.cls, icon: t.icon, msg: t.msg, hora: mov.hora });
  }

  // Actualizar badge
  document.getElementById('badge-alertas').textContent =
    contadorAlertas > 0 ? `${contadorAlertas} nuevas` : '0 nuevas';

  // Renderizar lista (máximo 20 alertas visibles)
  const lista = document.getElementById('lista-alertas');
  lista.innerHTML = alertas.slice(0, 20).map(a => `
    <div class="alert-item ${a.cls}">
      <span class="alert-icon">${a.icon}</span>
      <div class="alert-body">
        <div class="alert-msg">${a.msg}</div>
        <div class="alert-time">${a.hora}</div>
      </div>
    </div>
  `).join('');
}

// ── GRÁFICOS (Chart.js) ────────────────────────
const HORAS = ['07h','08h','09h','10h','11h','12h','13h','14h','15h','16h','17h','18h'];
const DIAS  = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

const ctxHoras  = document.getElementById('chart-horas').getContext('2d');
const ctxSemana = document.getElementById('chart-semana').getContext('2d');

// Gráfico de barras — movimientos por hora
const chartHoras = new Chart(ctxHoras, {
  type: 'bar',
  data: {
    labels: HORAS,
    datasets: [{
      label: 'Movimientos',
      data: Array(12).fill(0),
      backgroundColor: '#D6E4FF',
      borderColor: '#1E5EFF',
      borderWidth: 1.5,
      borderRadius: 4,
    }]
  },
  options: {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, font: { family: 'DM Sans', size: 11 } },
        grid: { color: '#F0EDE8' }
      },
      x: {
        ticks: { font: { family: 'DM Sans', size: 11 } },
        grid: { display: false }
      }
    }
  }
});

// Gráfico de líneas — ingresos vs salidas semanales
const chartSemana = new Chart(ctxSemana, {
  type: 'line',
  data: {
    labels: DIAS,
    datasets: [
      {
        label: 'Ingresos',
        data: [4, 7, 5, 8, 6, 3, 2],
        borderColor: '#1A7A4A',
        backgroundColor: 'rgba(26,122,74,0.08)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#1A7A4A',
        pointRadius: 4,
      },
      {
        label: 'Salidas',
        data: [3, 6, 5, 7, 5, 3, 2],
        borderColor: '#C0392B',
        backgroundColor: 'rgba(192,57,43,0.06)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#C0392B',
        pointRadius: 4,
      }
    ]
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        labels: { font: { family: 'DM Sans', size: 11 }, boxWidth: 12 }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 2, font: { family: 'DM Sans', size: 11 } },
        grid: { color: '#F0EDE8' }
      },
      x: {
        ticks: { font: { family: 'DM Sans', size: 11 } },
        grid: { display: false }
      }
    }
  }
});

// Actualiza el gráfico de horas al registrar un movimiento
function actualizarCharts() {
  const horaActual = new Date().getHours();
  const idx = Math.max(0, horaActual - 7);
  if (idx < 12) {
    chartHoras.data.datasets[0].data[idx]++;
    chartHoras.update('none');
  }
}

// ── SIMULADOR DE SENSORES (RF-08) ──────────────
// Genera movimientos aleatorios para pruebas sin hardware físico.
// Reemplazar por llamadas reales a la API cuando el backend esté listo.
const camionesEjemplo = ['CAM-001','CAM-002','CAM-003','CAM-055','CAM-112','CAM-204','CAM-318'];
const estadosEjemplo  = ['Autorizado','Autorizado','Autorizado','Pendiente','Rechazado'];

function simularMovimiento() {
  const now = new Date();
  registrarMovimiento({
    camionId: camionesEjemplo[Math.floor(Math.random() * camionesEjemplo.length)],
    tipo:     Math.random() > 0.4 ? 'INGRESO' : 'SALIDA',
    estado:   estadosEjemplo[Math.floor(Math.random() * estadosEjemplo.length)],
    fecha:    now.toLocaleDateString('es-CL'),
    hora:     now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    ts:       now
  });
}

// Carga 6 movimientos de ejemplo al iniciar
for (let i = 0; i < 6; i++) simularMovimiento();

// Simula un nuevo movimiento cada 8 segundos
setInterval(simularMovimiento, 8000);

// ── NAVEGACIÓN SIDEBAR ─────────────────────────
function showSection(e) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  e.currentTarget.classList.add('active');
}



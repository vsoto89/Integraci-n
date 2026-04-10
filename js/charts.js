/* ═══════════════════════════════════════════════
   LogiTrack — charts.js
   Gráficos conectados a datos reales de Firebase
   Depende de: config.js, dashboard.js (movimientos[])
═══════════════════════════════════════════════ */

const HORAS = ['07h','08h','09h','10h','11h','12h','13h','14h','15h','16h','17h','18h'];

// ── Helpers de fecha ─────────────────────────────────────────

/** Devuelve "AAAA-MM-DD" de hoy en hora local */
function hoyString() {
  const hoy = new Date();
  return hoy.getFullYear() + '-' +
    String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
    String(hoy.getDate()).padStart(2, '0');
}

/** Convierte un objeto Date a "AAAA-MM-DD" */
function dateToString(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

/**
 * Devuelve las 7 fechas "AAAA-MM-DD" de la semana actual (Lun–Dom).
 * Los días futuros tendrán conteo 0 hasta que lleguen movimientos.
 */
function fechasSemanaActual() {
  const hoy       = new Date();
  const diaSem    = hoy.getDay();                   // 0=Dom … 6=Sáb
  const offsetLun = diaSem === 0 ? -6 : 1 - diaSem; // retroceder hasta el lunes
  const lunes     = new Date(hoy);
  lunes.setDate(hoy.getDate() + offsetLun);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    return dateToString(d);
  });
}

// ── Gráfico de BARRAS: movimientos de hoy por hora ───────────

const ctxHoras = document.getElementById('chart-horas').getContext('2d');

const chartHoras = new Chart(ctxHoras, {
  type: 'bar',
  data: {
    labels: HORAS,
    datasets: [
      {
        label: 'Entradas',
        data: Array(12).fill(0),
        backgroundColor: 'rgba(26,122,74,0.25)',
        borderColor: '#1A7A4A',
        borderWidth: 1.5,
        borderRadius: 4,
      },
      {
        label: 'Salidas',
        data: Array(12).fill(0),
        backgroundColor: 'rgba(192,57,43,0.20)',
        borderColor: '#C0392B',
        borderWidth: 1.5,
        borderRadius: 4,
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
        ticks: { stepSize: 1, precision: 0, font: { family: 'DM Sans', size: 11 } },
        grid: { color: '#F0EDE8' }
      },
      x: {
        ticks: { font: { family: 'DM Sans', size: 11 } },
        grid: { display: false }
      }
    }
  }
});

/**
 * Recalcula el gráfico de barras leyendo el array global `movimientos`
 * que vive en dashboard.js. Solo cuenta los de hoy.
 */
function actualizarChartHoras() {
  const entradas = Array(12).fill(0);
  const salidas  = Array(12).fill(0);
  const hoy      = hoyString();

  movimientos.forEach(m => {
    const fecha = m.ts instanceof Date ? dateToString(m.ts) : null;
    if (fecha !== hoy) return;

    const hora = m.ts instanceof Date ? m.ts.getHours() : -1;
    const idx  = hora - 7; // 07h → índice 0

    if (idx >= 0 && idx < 12) {
      if (m.tipo === 'ENTRADA')     entradas[idx]++;
      else if (m.tipo === 'SALIDA') salidas[idx]++;
    }
  });

  chartHoras.data.datasets[0].data = entradas;
  chartHoras.data.datasets[1].data = salidas;
  chartHoras.update('none');
}

// Alias llamado por dashboard.js al recibir datos de Firebase
function actualizarCharts() {
  actualizarChartHoras();
}

// ── Gráfico de LÍNEAS: semana actual (Lun–Dom) ───────────────

const ctxSemana = document.getElementById('chart-semana').getContext('2d');

const chartSemana = new Chart(ctxSemana, {
  type: 'line',
  data: {
    labels: ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'], // siempre fijo
    datasets: [
      {
        label: 'Ingresos',
        data: Array(7).fill(0),
        borderColor: '#1A7A4A',
        backgroundColor: 'rgba(26,122,74,0.08)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#1A7A4A',
        pointRadius: 4,
      },
      {
        label: 'Salidas',
        data: Array(7).fill(0),
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
        ticks: { stepSize: 1, precision: 0, font: { family: 'DM Sans', size: 11 } },
        grid: { color: '#F0EDE8' }
      },
      x: {
        ticks: { font: { family: 'DM Sans', size: 11 } },
        grid: { display: false }
      }
    }
  }
});

/**
 * Escucha Firebase y actualiza el gráfico con los datos
 * de Lun a Dom de la semana en curso. Se llama una vez al cargar.
 */
function iniciarChartSemana() {
  db.ref('movimientos').on('value', (snapshot) => {
    const data    = snapshot.val();
    const semana  = fechasSemanaActual(); // ["2025-04-07", ..., "2025-04-13"]

    // Mapa indexado por fecha: índice 0=Lun … 6=Dom
    const entradas = Array(7).fill(0);
    const salidas  = Array(7).fill(0);

    if (data) {
      Object.values(data).forEach(dato => {
        if (!dato.timestamp) return;
        const fechaStr = dato.timestamp.split(' ')[0];   // "AAAA-MM-DD"
        const idx      = semana.indexOf(fechaStr);        // posición en la semana
        if (idx === -1) return;                           // no pertenece a esta semana

        if (dato.evento === 'ENTRADA')     entradas[idx]++;
        else if (dato.evento === 'SALIDA') salidas[idx]++;
      });
    }

    chartSemana.data.datasets[0].data = entradas;
    chartSemana.data.datasets[1].data = salidas;
    chartSemana.update();
  });
}

iniciarChartSemana();

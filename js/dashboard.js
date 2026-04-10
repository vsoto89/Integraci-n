/* ═══════════════════════════════════════════════
   LogiTrack — dashboard.js
   Tabla de movimientos, KPIs, alertas y
   listeners en tiempo real de Firebase
   Depende de: config.js, charts.js
═══════════════════════════════════════════════ */

// ── Estado en memoria ──
let movimientos = [];
let alertas = [];
let contadorAlertas = 0;

// ── Tabla de movimientos ──
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
        <span class="tipo-badge ${m.tipo === 'ENTRADA' ? 'ingreso' : 'salida'}">
          ${m.tipo}
        </span>
      </td>
      <td>${m.fecha}</td>
      <td>${m.hora}</td>
      <td>
        <span class="badge ${
          m.estado === 'Autorizado'       ? 'badge-green' :
          m.estado === 'Baja del Sistema' ? 'badge-amber' :
          m.estado === 'Acceso Manual'    ? 'badge-blue'  :
          m.estado === 'Rechazado'        ? 'badge-red'   : 'badge-amber'
        }">
          ${m.estado}
        </span>
      </td>
    </tr>
  `).join('');
}

// ── KPIs ──
function actualizarKPIs() {
  const ingresos = movimientos.filter(m => m.tipo === 'ENTRADA').length;
  const salidas  = movimientos.filter(m => m.tipo === 'SALIDA').length;
  const enPlanta = Math.max(0, ingresos - salidas);

  document.getElementById('kpi-total').textContent    = movimientos.length;
  document.getElementById('kpi-ingresos').textContent = ingresos;
  document.getElementById('kpi-salidas').textContent  = salidas;
  document.getElementById('kpi-planta').textContent   = enPlanta;

  console.log(`Resumen: ↑${ingresos} ↓${salidas} = Planta:${enPlanta}`);
}

// ── Panel de alertas ──
function agregarAlerta(mov) {
  const mapa = {
    'ENTRADA': { cls: 'ok',   icon: '✓', msg: `Camión ${mov.camionId} ingresó a la planta` },
    'SALIDA':  { cls: 'info', icon: '↗', msg: `Camión ${mov.camionId} salió de la planta`  }
  };

  let nuevaAlerta;

  if (mov.estado === 'Rechazado') {
    nuevaAlerta = {
      cls:  'danger',
      icon: '✕',
      msg:  `Acceso rechazado: ${mov.camionId}`,
      hora: mov.hora
    };
    contadorAlertas++;
  } else {
    const t = mapa[mov.tipo] || { cls: 'info', icon: '?', msg: `Movimiento: ${mov.camionId}` };
    nuevaAlerta = { cls: t.cls, icon: t.icon, msg: t.msg, hora: mov.hora };
  }

  // FIFO: máximo 5 alertas visibles
  alertas.unshift(nuevaAlerta);
  if (alertas.length > 5) alertas.pop();

  const lista = document.getElementById('lista-alertas');
  lista.innerHTML = alertas.map(a => `
    <div class="alert-item ${a.cls}">
      <span class="alert-icon">${a.icon}</span>
      <div class="alert-body">
        <div class="alert-msg">${a.msg}</div>
        <div class="alert-time">${a.hora}</div>
      </div>
    </div>
  `).join('');
}

// ── Registrar movimiento (manual o desde API) ──
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

  if (!datos) {
    document.getElementById('f-camion').value = '';
  }
}

// ── Listeners Firebase ──────────────────────────
const movimientosRef = db.ref('movimientos');

// Solo el ÚLTIMO movimiento → para la alerta inmediata
movimientosRef.limitToLast(1).on('child_added', (snapshot) => {
  const dato = snapshot.val();
  if (!dato) return;

  const movParaAlerta = {
    camionId: (dato.nombre || 'S/N').toUpperCase(),
    tipo:     dato.evento,
    estado:   dato.autorizado ? 'Autorizado' : 'Rechazado',
    hora:     dato.timestamp ? dato.timestamp.split(' ')[1].substring(0, 5) : '--:--'
  };
  agregarAlerta(movParaAlerta);
});

// TODOS los movimientos → para tabla y KPIs
movimientosRef.on('value', (snapshot) => {
  const data = snapshot.val();
  movimientos = [];

  if (data) {
    Object.keys(data).forEach((key) => {
      const dato = data[key];
      const partes = dato.timestamp ? dato.timestamp.split(' ') : ['', ''];

      let fechaChile = '--/--/----';
      if (partes[0]) {
        const f = partes[0].split('-');
        fechaChile = `${f[2]}-${f[1]}-${f[0]}`;
      }

      let estadoFinal = dato.estado;
      if (!estadoFinal) {
        estadoFinal = dato.autorizado === false ? 'Rechazado' : 'Autorizado';
      }

      movimientos.unshift({
        camionId: (dato.nombre || 'S/N').toUpperCase(),
        tipo:     dato.evento,
        estado:   estadoFinal,
        fecha:    fechaChile,
        hora:     partes[1] ? partes[1].substring(0, 5) : '--:--',
        ts:       new Date(dato.timestamp)
      });
    });
  }

  actualizarTabla();
  actualizarKPIs();
  actualizarChartHoras(); // sincronizar barras de hoy con datos reales
});

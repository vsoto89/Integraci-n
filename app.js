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
        <span class="tipo-badge ${m.tipo === 'ENTRADA' ? 'ingreso' : 'salida'}">
          ${m.tipo}
        </span>
      </td>
      <td>${m.fecha}</td>
      <td>${m.hora}</td>
      <td>
        <span class="badge ${
          m.estado === 'Autorizado' ? 'badge-green' :
          m.estado === 'Baja del Sistema' ? 'badge-amber' :
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
  // Usamos el array global 'movimientos' que ya tiene todos los datos cargados
  const todos = movimientos;

  // Filtramos con total precisión (Mayúsculas exactas)
  const ingresos = todos.filter(m => m.tipo === "ENTRADA").length;
  const salidas  = todos.filter(m => m.tipo === "SALIDA").length;

  // Calculamos la ocupación real
  const enPlanta = Math.max(0, ingresos - salidas);

  // Inyectamos en el HTML (asegurándonos de no mostrar números negativos)
  document.getElementById('kpi-total').textContent    = todos.length;
  document.getElementById('kpi-ingresos').textContent = ingresos;
  document.getElementById('kpi-salidas').textContent  = salidas;
  document.getElementById('kpi-planta').textContent   = enPlanta;

  console.log(`Resumen: ↑${ingresos} ↓${salidas} = Planta:${enPlanta}`);
  
}

// ── PANEL DE ALERTAS ACTUALIZADO ───────────────────────────
function agregarAlerta(mov) {
  const mapa = {
    'ENTRADA': { cls: 'ok',   icon: '✓', msg: `Camión ${mov.camionId} ingresó a la planta` },
    'SALIDA':  { cls: 'info', icon: '↗', msg: `Camión ${mov.camionId} salió de la planta`  }
  };

  // 1. Preparamos el nuevo objeto de alerta
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
    // Usamos 'ENTRADA' o 'SALIDA' según tu Firebase
    const t = mapa[mov.tipo] || { cls: 'info', icon: '?', msg: `Movimiento: ${mov.camionId}` };
    nuevaAlerta = { cls: t.cls, icon: t.icon, msg: t.msg, hora: mov.hora };
  }

  // 2. LÓGICA DE REEMPLAZO (FIFO)
  // unshift agrega al PRINCIPIO (índice 0)
  alertas.unshift(nuevaAlerta);

  // 3. Si superamos las 5 alertas, eliminamos la última (la más vieja)
  if (alertas.length > 5) {
    alertas.pop(); // pop() elimina el último elemento del array
  }


  // Renderizar lista (Ahora solo renderiza lo que hay en el array, que máximo serán 5)
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

// ── CONEXIÓN CON FIREBASE (VERSIÓN CORREGIDA) ──────────────

const firebaseConfig = {
    databaseURL: "https://logitrack-99f6e-default-rtdb.firebaseio.com/"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const movimientosRef = db.ref('movimientos');

// Usamos .on('child_added') para las ALERTAS (solo la nueva)
// Usamos .on('value') para la TABLA y KPIs (todo el conjunto)

// 1. Escuchar solo el ÚLTIMO movimiento para la ALERTA
movimientosRef.limitToLast(1).on('child_added', (snapshot) => {
    const dato = snapshot.val();
    if (dato) {
        // Adaptamos los nombres de puente.py a lo que espera agregarAlerta
        const movParaAlerta = {
            camionId: (dato.nombre || 'S/N').toUpperCase(),
            tipo:     dato.evento, 
            estado:   dato.autorizado ? 'Autorizado' : 'Rechazado',
            hora:     dato.timestamp ? dato.timestamp.split(' ')[1].substring(0, 5) : "--:--"
        };
        agregarAlerta(movParaAlerta);
    }
});

// 2. Escuchar TODO para la TABLA y KPIs
movimientosRef.on('value', (snapshot) => {
    const data = snapshot.val();
    movimientos = []; 
    
    if (data) {
        Object.keys(data).forEach((key) => {
            const dato = data[key];
            const partes = dato.timestamp ? dato.timestamp.split(' ') : ["", ""];
            
            let fechaChile = "--/--/----";
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
                hora:     partes[1] ? partes[1].substring(0, 5) : "--:--",
                ts:       new Date(dato.timestamp)
            });
        });
    }

    actualizarTabla();
    actualizarKPIs();
});

// ── NAVEGACIÓN SIDEBAR ─────────────────────────
function showSection(e, sectionId) {
  // 1. Manejo visual del menú
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  e.currentTarget.classList.add('active');

  // 2. Manejo de las secciones
  document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
  document.getElementById(sectionId).style.display = 'flex';
  // 3. GUARDAR EN MEMORIA (La clave)
  localStorage.setItem('ultimaSeccion', sectionId);
}

// ── ENROLAR CON VERIFICACIÓN Y CATCH ──
function enrolarTarjeta() {
  const uid = document.getElementById('reg-uid').value.trim().toUpperCase();
  const nombre = document.getElementById('reg-nombre').value.trim();

  if (!uid || !nombre) {
    alert("Completa los campos obligatorios.");
    return;
  }

  db.ref('autorizados/' + uid).get().then((snapshot) => {
    if (snapshot.exists()) {
      alert(`Aviso: El UID ${uid} ya pertenece a ${snapshot.val().nombre}`);
    } else {
      db.ref('autorizados/' + uid).set({
        nombre: nombre,
        autorizado: true,
        estado: "AFUERA"
      })
      .then(() => {
        alert("Camión enrolado correctamente.");
        document.getElementById('reg-uid').value = '';
        document.getElementById('reg-nombre').value = '';
      })
      .catch((error) => {
        console.error("Error al escribir en Firebase:", error);
        alert("Error de red: No se pudo guardar el registro.");
      });
    }
  }).catch((error) => {
    console.error("Error de lectura:", error);
    alert("Error al conectar con la base de datos.");
  });
}

// ── ELIMINAR CON SALIDA AUTOMÁTICA Y CATCH ──
function eliminarTarjeta() {
  const uid = document.getElementById('del-uid').value.trim().toUpperCase();
  if (!uid) return;

  db.ref('autorizados/' + uid).get().then((snapshot) => {
    if (!snapshot.exists()) {
      alert("La tarjeta no existe.");
      return;
    }

    const datos = snapshot.val();
    const nombreFormateado = (datos.nombre || 'S/N').toUpperCase();
    
    const avisoEstado = datos.estado === 'ADENTRO' ? 
      `\n\nIMPORTANTE: El camión ${nombreFormateado} está ADENTRO. Se registrará una salida manual.` : "";

    if (confirm(`¿Eliminar acceso para ${nombreFormateado}?${avisoEstado}`)) {
      
      // CASO A: El camión está ADENTRO (Registramos salida primero)
      if (datos.estado === 'ADENTRO') {
        const ahora = new Date();
        // Formateamos la fecha exactamante como la espera tu Python y tu tabla: AAAA-MM-DD HH:MM:SS
        const timestampFormateado = ahora.getFullYear() + "-" + 
                                   String(ahora.getMonth() + 1).padStart(2, '0') + "-" + 
                                   String(ahora.getDate()).padStart(2, '0') + " " + 
                                   ahora.toLocaleTimeString('es-CL', { hour12: false });

        db.ref('movimientos').push({
          id: uid,
          nombre: nombreFormateado,
          evento: 'SALIDA',
          estado: 'Baja del Sistema',
          autorizado: true,
          timestamp: timestampFormateado
        })
        .then(() => {
          // RECIÉN AQUÍ, cuando la salida se grabó, borramos la tarjeta
          return db.ref('autorizados/' + uid).remove();
        })
        .then(() => {
          alert("Registro eliminado y salida contabilizada con éxito.");
          document.getElementById('del-uid').value = '';
        })
        .catch(error => alert("Error en el proceso: " + error.message));

      } else {
        // CASO B: El camión está AFUERA (Borramos directo)
        db.ref('autorizados/' + uid).remove()
        .then(() => {
          alert("Credencial eliminada correctamente.");
          document.getElementById('del-uid').value = '';
        })
        .catch(error => alert("Error al eliminar: " + error.message));
      }
    }
  }).catch((error) => console.error("Error de conexión:", error));
}

// ── RECUPERAR NAVEGACIÓN AL RECARGAR ──
window.addEventListener('load', () => {
    const seccionGuardada = localStorage.getItem('ultimaSeccion');
    
    if (seccionGuardada && seccionGuardada !== 'sec-dashboard') {
        // Buscamos el botón del menú que corresponde a esa sección para ponerlo azul
        const botones = document.querySelectorAll('.nav-item');
        let botonCorrecto;
        
        if (seccionGuardada === 'sec-registrar') botonCorrecto = botones[1];
        // Si tuvieses más secciones, añadirías más "if" aquí
        
        if (botonCorrecto) {
            // Simulamos el clic o llamamos a la función
            showSection({ currentTarget: botonCorrecto }, seccionGuardada);
        }
    } else {
        // Si no hay nada guardado, por defecto vamos al dashboard
        // Pasamos null como evento porque no hubo clic manual
        showSection(null, 'sec-dashboard');
    }
});


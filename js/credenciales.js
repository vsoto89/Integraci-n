/* ═══════════════════════════════════════════════
   LogiTrack — credenciales.js
   Registro manual, enrolamiento y eliminación
   de credenciales RFID en Firebase
   Depende de: config.js
═══════════════════════════════════════════════ */

// ── Registro de acceso manual (emergencia) ──────
async function registrarMovimientoManual() {
  const input = document.getElementById('f-camion').value.trim().toUpperCase();
  const tipo  = document.getElementById('f-tipo').value;

  if (!input) {
    alert('Ingresa un UID o el Nombre del camión.');
    return;
  }

  try {
    const snapshot = await db.ref('autorizados').get();

    if (!snapshot.exists()) {
      alert('No hay camiones registrados en la base de datos.');
      return;
    }

    const autorizados  = snapshot.val();
    let datosCamion    = null;
    let uidEncontrado  = null;

    // Búsqueda inteligente: primero por UID, luego por nombre
    if (autorizados[input]) {
      uidEncontrado = input;
      datosCamion   = autorizados[input];
    } else {
      uidEncontrado = Object.keys(autorizados).find(key => {
        const nombreEnBD = autorizados[key].nombre ? autorizados[key].nombre.toUpperCase() : '';
        return nombreEnBD === input;
      });
      if (uidEncontrado) datosCamion = autorizados[uidEncontrado];
    }

    if (!datosCamion) {
      alert(`El vehículo "${input}" no existe en el sistema. Verifique el nombre o UID.`);
      return;
    }

    // Candados de seguridad
    if (tipo === 'ENTRADA' && datosCamion.estado === 'ADENTRO') {
      alert(`Bloqueo: ${datosCamion.nombre.toUpperCase()} ya figura ADENTRO de la planta.`);
      return;
    }
    if (tipo === 'SALIDA' && datosCamion.estado === 'AFUERA') {
      alert(`Bloqueo: ${datosCamion.nombre.toUpperCase()} ya está AFUERA. No puede marcar salida.`);
      return;
    }

    // Construir timestamp en formato AAAA-MM-DD HH:MM:SS
    const ahora = new Date();
    const tsFormateado = ahora.getFullYear() + '-' +
                         String(ahora.getMonth() + 1).padStart(2, '0') + '-' +
                         String(ahora.getDate()).padStart(2, '0') + ' ' +
                         ahora.toLocaleTimeString('es-CL', { hour12: false });

    await db.ref('movimientos').push({
      id:         uidEncontrado,
      nombre:     datosCamion.nombre.toUpperCase(),
      evento:     tipo,
      estado:     'Acceso Manual',
      autorizado: true,
      timestamp:  tsFormateado
    });

    await db.ref(`autorizados/${uidEncontrado}`).update({
      estado: tipo === 'ENTRADA' ? 'ADENTRO' : 'AFUERA'
    });

    alert(`Acceso Manual de ${tipo} registrado para: ${datosCamion.nombre.toUpperCase()}`);
    document.getElementById('f-camion').value = '';

  } catch (error) {
    console.error('Error técnico:', error);
    alert('Error de comunicación: ' + error.message);
  }
}

// ── Enrolar nueva credencial RFID ───────────────
function enrolarTarjeta() {
  const uid    = document.getElementById('reg-uid').value.trim().toUpperCase();
  const nombre = document.getElementById('reg-nombre').value.trim();

  if (!uid || !nombre) {
    alert('Completa los campos obligatorios.');
    return;
  }

  db.ref('autorizados/' + uid).get()
    .then((snapshot) => {
      if (snapshot.exists()) {
        alert(`Aviso: El UID ${uid} ya pertenece a ${snapshot.val().nombre}`);
      } else {
        return db.ref('autorizados/' + uid).set({
          nombre:     nombre,
          autorizado: true,
          estado:     'AFUERA'
        });
      }
    })
    .then(() => {
      alert('Camión enrolado correctamente.');
      document.getElementById('reg-uid').value    = '';
      document.getElementById('reg-nombre').value = '';
    })
    .catch((error) => {
      console.error('Error al escribir en Firebase:', error);
      alert('Error de red: No se pudo guardar el registro.');
    });
}

// ── Eliminar credencial (con salida automática) ─
function eliminarTarjeta() {
  const uid = document.getElementById('del-uid').value.trim().toUpperCase();
  if (!uid) return;

  db.ref('autorizados/' + uid).get()
    .then((snapshot) => {
      if (!snapshot.exists()) {
        alert('La tarjeta no existe.');
        return;
      }

      const datos            = snapshot.val();
      const nombreFormateado = (datos.nombre || 'S/N').toUpperCase();
      const avisoEstado      = datos.estado === 'ADENTRO'
        ? `\n\nIMPORTANTE: El camión ${nombreFormateado} está ADENTRO. Se registrará una salida manual.`
        : '';

      if (!confirm(`¿Eliminar acceso para ${nombreFormateado}?${avisoEstado}`)) return;

      if (datos.estado === 'ADENTRO') {
        // Registrar salida antes de eliminar
        const ahora = new Date();
        const tsFormateado = ahora.getFullYear() + '-' +
                             String(ahora.getMonth() + 1).padStart(2, '0') + '-' +
                             String(ahora.getDate()).padStart(2, '0') + ' ' +
                             ahora.toLocaleTimeString('es-CL', { hour12: false });

        db.ref('movimientos').push({
          id:         uid,
          nombre:     nombreFormateado,
          evento:     'SALIDA',
          estado:     'Baja del Sistema',
          autorizado: true,
          timestamp:  tsFormateado
        })
        .then(() => db.ref('autorizados/' + uid).remove())
        .then(() => {
          alert('Registro eliminado y salida contabilizada con éxito.');
          document.getElementById('del-uid').value = '';
        })
        .catch(error => alert('Error en el proceso: ' + error.message));

      } else {
        // Camión afuera: borrar directo
        db.ref('autorizados/' + uid).remove()
          .then(() => {
            alert('Credencial eliminada correctamente.');
            document.getElementById('del-uid').value = '';
          })
          .catch(error => alert('Error al eliminar: ' + error.message));
      }
    })
    .catch((error) => console.error('Error de conexión:', error));
}

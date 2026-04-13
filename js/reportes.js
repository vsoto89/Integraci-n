/* ═══════════════════════════════════════════════
   LogiTrack — reportes.js (Versión Integrada)
   Manejo de consultas por rango y exportación
═══════════════════════════════════════════════ */

let datosReporte = []; // Almacena los resultados filtrados para la tabla y exportación
let paginaActual = 1;
const registrosPorPagina = 10;

/**
 * 1. Control de la interfaz de fecha personalizada
 */
window.manejarCambioPeriodo = function() {
    const periodo = document.getElementById('rep-periodo').value;
    const divRango = document.getElementById('rango-fechas');
    divRango.style.display = (periodo === 'personalizado') ? 'flex' : 'none';
};

/**
 * 2. Función Principal: Generar Reporte
 * Consulta a Firebase por periodo y filtra el resto en el cliente
 */
window.generarReporte = async function() {
    const periodo = document.getElementById('rep-periodo').value;
    const idFiltro = document.getElementById('rep-id').value.trim().toUpperCase();
    const tipoFiltro = document.getElementById('rep-tipo').value;
    
    let inicio, fin;
    const ahora = new Date();

    // Formato Universal para la consulta (AAAA-MM-DD HH:MM:SS)
    const hoyStr = ahora.getFullYear() + "-" + 
                   String(ahora.getMonth() + 1).padStart(2, '0') + "-" + 
                   String(ahora.getDate()).padStart(2, '0');

    if (periodo === 'hoy') {
        inicio = `${hoyStr} 00:00:00`;
        fin = `${hoyStr} 23:59:59`;
    } else if (periodo === 'semana') {
        const lunes = new Date(ahora);
        // Ajuste para que la semana parta el Lunes (1)
        lunes.setDate(ahora.getDate() - (ahora.getDay() === 0 ? 6 : ahora.getDay() - 1));
        inicio = lunes.getFullYear() + "-" + String(lunes.getMonth() + 1).padStart(2, '0') + "-" + String(lunes.getDate()).padStart(2, '0') + " 00:00:00";
        fin = `${hoyStr} 23:59:59`;
    } else if (periodo === 'mes') {
        inicio = ahora.getFullYear() + "-" + String(ahora.getMonth() + 1).padStart(2, '0') + "-01 00:00:00";
        fin = `${hoyStr} 23:59:59`;
    } else if (periodo === 'personalizado') {
        const d = document.getElementById('rep-desde').value;
        const h = document.getElementById('rep-hasta').value;
        if (!d || !h) return alert("Seleccione el rango de fechas.");
        inicio = `${d} 00:00:00`;
        fin = `${h} 23:59:59`;
    }

    try {
        // Mostrar carga
        document.getElementById('tbody-reporte').innerHTML = '<tr><td colspan="5" style="text-align:center">Consultando base de datos...</td></tr>';
        
        // Consulta indexada por Timestamp [cite: 108, 123]
        const snapshot = await db.ref('movimientos')
            .orderByChild('timestamp')
            .startAt(inicio)
            .endAt(fin)
            .get();

        datosReporte = [];

        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const d = child.val();
                
                // Filtro específico en el cliente (ID/Nombre y Tipo) [cite: 90, 91]
                const cumpleID = idFiltro === "" || 
                                (d.nombre && d.nombre.toUpperCase().includes(idFiltro)) ||
                                (d.id && d.id.toUpperCase().includes(idFiltro));
                
                const cumpleTipo = tipoFiltro === "TODOS" || d.evento === tipoFiltro;

                if (cumpleID && cumpleTipo) {
                    const partes = d.timestamp.split(' '); // [0] fecha, [1] hora
                    const f = partes[0].split('-');        // [0] año, [1] mes, [2] día
                    
                    datosReporte.push({
                        fecha: `${f[2]}-${f[1]}-${f[0]}`, // Formato Chileno DD-MM-AAAA [cite: 312]
                        hora: partes[1] ? partes[1].substring(0, 5) : "--:--",
                        id: (d.nombre || d.id || 'S/N').toUpperCase(),
                        tipo: d.evento,
                        estado: d.estado || (d.autorizado ? 'Autorizado' : 'Rechazado')
                    });
                }
            });
            datosReporte.reverse(); // Mostrar más recientes primero [cite: 93]
        }

        paginaActual = 1;
        renderizarTablaReporte();
        document.getElementById('contador-reporte').textContent = `Se encontraron ${datosReporte.length} registros`;

        if (datosReporte.length === 0) {
            document.getElementById('tbody-reporte').innerHTML = '<tr><td colspan="5" style="text-align:center">No hay registros para los filtros aplicados.</td></tr>';
        }

    } catch (error) {
        console.error("Error en Firebase:", error);
        alert("Error de consulta. Verifique las reglas (IndexOn) en la consola de Firebase.");
    }
};

/**
 * 3. Renderizado y Paginación
 */
window.renderizarTablaReporte = function() {
    const inicio = (paginaActual - 1) * registrosPorPagina;
    const fin = inicio + registrosPorPagina;
    const items = datosReporte.slice(inicio, fin);

    const tbody = document.getElementById('tbody-reporte');
    tbody.innerHTML = items.map(d => {
        // Mapeo exacto para tus clases CSS
        const claseColor = d.tipo === 'ENTRADA' ? 'ingreso' : 'salida';
        
        return `
        <tr>
            <td>${d.fecha}</td>
            <td>${d.hora}</td>
            <td><span class="truck-id">${d.id}</span></td>
            <td><span class="tipo-badge ${claseColor}">${d.tipo}</span></td>
            <td>
        <span class="badge ${
          d.estado === 'Autorizado'       ? 'badge-green' :
          d.estado === 'Baja del Sistema' ? 'badge-amber' :
          d.estado === 'Acceso Manual'    ? 'badge-blue'  :
          d.estado === 'Rechazado'        ? 'badge-red'   : 'badge-amber'
        }">
          ${d.estado}
        </span>
      </td>
        </tr>`;
    }).join('');

    const maxPaginas = Math.ceil(datosReporte.length / registrosPorPagina) || 1;
    document.getElementById('info-paginacion').textContent = `Página ${paginaActual} de ${maxPaginas}`;
};

window.cambiarPagina = function(dir) {
    const max = Math.ceil(datosReporte.length / registrosPorPagina);
    if (paginaActual + dir > 0 && paginaActual + dir <= max) {
        paginaActual += dir;
        renderizarTablaReporte();
    }
};

/**
 * 4. Exportación (Solo si hay datos encontrados) [cite: 99]
 */
window.exportarPDF = function() {
    if (datosReporte.length === 0) return alert("No hay datos para exportar.");
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text("Reporte de Movimientos - LogiTrack", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generado el: ${new Date().toLocaleString('es-CL')}`, 14, 22);

    const filas = datosReporte.map(d => [d.fecha, d.hora, d.id, d.tipo, d.estado]);
    
    doc.autoTable({
        head: [['Fecha', 'Hora', 'ID Camión', 'Tipo', 'Estado']],
        body: filas,
        startY: 28,
        theme: 'striped',
        headStyles: { fillColor: [30, 94, 255] } // Azul LogiTrack
    });

    doc.save(`Reporte_LogiTrack_${Date.now()}.pdf`);
};

window.exportarExcel = function() {
    if (datosReporte.length === 0) return alert("No hay datos para exportar.");
    
    const ws = XLSX.utils.json_to_sheet(datosReporte);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos");
    XLSX.writeFile(wb, `Reporte_LogiTrack_${Date.now()}.xlsx`);
};
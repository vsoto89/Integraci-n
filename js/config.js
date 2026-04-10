/* ═══════════════════════════════════════════════
   LogiTrack — config.js
   Inicialización de Firebase y exportación de db
═══════════════════════════════════════════════ */

const firebaseConfig = {
    databaseURL: "https://logitrack-99f6e-default-rtdb.firebaseio.com/"
};

firebase.initializeApp(firebaseConfig);

// Instancia global de la base de datos (usada por todos los módulos)
const db = firebase.database();

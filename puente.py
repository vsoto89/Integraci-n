import serial
import json
import firebase_admin
from firebase_admin import credentials, db

# 1. Configuración de Firebase
cred = credentials.Certificate("logitrack-99f6e-firebase-adminsdk-fbsvc-a5b2b5483f.json") # le pasamos la llave para acceder al servicio
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://logitrack-99f6e-default-rtdb.firebaseio.com/' # le damos la direccion de nuestro servicio
})

# 2. Configuración del Puerto Serial
try:
    ser = serial.Serial('COM7', 9600, timeout=1)
    print("Conectado al puerto COM7 exitosamente. Esperando lecturas del sensor...")
except:
    print("Error: No se pudo abrir el puerto. Verifica que el Monitor Serie esté cerrado.")
    exit()

# --- SINCRONIZACIÓN INICIAL CON LA NUBE ---
print("Sincronizando inventario con Firebase...")
historico = db.reference('movimientos').get()
vehiculos_en_planta = 0

if historico:
    for dato in historico.values():
        if dato.get('tipo') == 'INGRESO':
            vehiculos_en_planta += 1
        elif dato.get('tipo') == 'SALIDA':
            vehiculos_en_planta -= 1
            
# Evitamos que el contador baje de 0 por algún error de datos antiguos
vehiculos_en_planta = max(0, vehiculos_en_planta)
print(f"Sincronización completa. Vehículos actualmente en planta: {vehiculos_en_planta}")
# ------------------------------------------

# 3. Bucle principal de escucha con cierre seguro
try:
    ref = db.reference('movimientos') # declaramos la ruta de la base de datos 
    while True:
        if ser.in_waiting > 0:
            linea = ser.readline().decode('utf-8').strip()
            
            try:
                datos_movimiento = json.loads(linea)
                
                # Añadimos ID genérico
                if "camionId" not in datos_movimiento:
                    datos_movimiento["camionId"] = "DETECTADO-US"
                    
                # --- LÓGICA DE CONTROL DE INVENTARIO ---
                if datos_movimiento["tipo"] == "INGRESO":
                    vehiculos_en_planta += 1
                    ref.push(datos_movimiento)
                    print(f"✅ Ingreso a Firebase. En planta: {vehiculos_en_planta}")
                    
                elif datos_movimiento["tipo"] == "SALIDA":
                    if vehiculos_en_planta > 0:
                        vehiculos_en_planta -= 1
                        ref.push(datos_movimiento)
                        print(f"📤 Salida a Firebase. En planta: {vehiculos_en_planta}")
                    else:
                        # Si hay 0 vehículos, ignoramos la lectura física del sensor
                        print("🚫 Ignorando SALIDA: La planta está vacía (Posible falso positivo).")

            except json.JSONDecodeError:
                pass # Ignoramos ruido del puerto serial de forma silenciosa

# 4. Cierre elegante al presionar Ctrl + C
except KeyboardInterrupt:
    print("\n🛑 Programa detenido por el usuario. Cerrando conexión serial de forma segura...")
    ser.close()
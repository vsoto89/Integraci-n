import serial
import time
import firebase_admin
from firebase_admin import credentials, db
import os
from dotenv import load_dotenv

load_dotenv() # Carga las variables del .env

# Ahora usas variables en lugar de escribir el texto directo
url = os.getenv("FIREBASE_URL")
ruta_llave = os.getenv("PATH_JSON")
puerto = os.getenv("PUERTO_SERIAL")

# 1. CONFIGURACIÓN DE FIREBASE
cred = credentials.Certificate(ruta_llave)
firebase_admin.initialize_app(cred, {'databaseURL': url})

# 2. CONFIGURACIÓN SERIAL
try:
    arduino = serial.Serial(puerto, 9600, timeout=1)
    time.sleep(2) 
    print(f"--- Conectado a {puerto} ---")
    print("Presiona Ctrl + C para salir de forma segura.")
except Exception as e:
    print(f"Error de conexión: {e}")
    exit()

ultimo_marcaje = {} 

# 3. BUCLE PRINCIPAL PROTEGIDO
try:
    while True:
        if arduino.in_waiting > 0:
            uid = arduino.readline().decode('utf-8').strip()
            if not uid: continue # Ignorar líneas vacías
            
            print(f"\nID Detectado: {uid}")

            tiempo_actual = time.time()
            if uid in ultimo_marcaje and (tiempo_actual - ultimo_marcaje[uid] < 5):
                print(f"BLOQUEO: {uid} (Espera 5 seg)")
                arduino.write(b'B') 
                continue

            ref_user = db.reference(f'autorizados/{uid}')
            datos = ref_user.get()

            if datos is None or datos.get('autorizado') == False:
                print("Acceso DENEGADO")
                arduino.write(b'P') 
            else:
                nombre = datos.get('nombre', 'S/N')
                estado_actual = datos.get('estado', 'AFUERA')

                if estado_actual == "AFUERA":
                    print(f"ENTRADA: {nombre}")
                    arduino.write(b'V') 
                    nuevo_estado = "ADENTRO"
                    evento = "ENTRADA"
                else:
                    print(f"SALIDA: {nombre}")
                    arduino.write(b'R') 
                    nuevo_estado = "AFUERA"
                    evento = "SALIDA"

                # Actualizar Firebase
                ref_user.update({'estado': nuevo_estado})
                db.reference('movimientos').push({
                    'id': uid,
                    'nombre': nombre,
                    'evento': evento,
                    'timestamp': time.strftime("%Y-%m-%d %H:%M:%S"),
                    'autorizado': True
                })
                
                ultimo_marcaje[uid] = tiempo_actual

        time.sleep(0.1)

except KeyboardInterrupt:
    print("\n\nCerrando sistema...")
    # Enviamos una señal de apagado a los LEDs si quieres (opcional)
    # arduino.write(b'L') 
    arduino.close()
    print("Conexión serial cerrada. ¡Hasta luego!")

except Exception as e:
    print(f"\nError inesperado: {e}")
    if 'arduino' in locals():
        arduino.close()
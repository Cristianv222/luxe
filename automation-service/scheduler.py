import os
import time
import schedule
import threading
import django
from django.core.management import call_command

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'automation_service.settings')
django.setup()

def run_birthday_task():
    """Ejecuta el comando de Django para enviar felicitaciones"""
    from datetime import datetime
    print(f"[{datetime.now()}] 🚀 Iniciando tarea programada de cumpleaños...")
    try:
        call_command('send_birthday_wishes')
    except Exception as e:
        print(f"❌ Error en la tarea: {e}")

def check_and_update_schedule():
    """Consulta la base de datos para obtener la hora programada"""
    try:
        from apps.whatsapp_bot.management.commands.send_birthday_wishes import Command
        cmd = Command()
        settings = cmd.get_whatsapp_settings()
        if settings and settings.schedule_time:
            return settings.schedule_time.strftime('%H:%M')
    except Exception as e:
        print(f"⚠️ No se pudo obtener la configuración: {e}")
    return "09:00"

def start_api():
    """Inicia el servidor API de Django en un hilo separado"""
    print("🌐 Iniciando API de Historial...")
    # Usamos runserver pero con noreload para evitar doble carga de memoria
    call_command('runserver', '0.0.0.0:8000', '--noreload')

def run_scheduler():
    """Bucle principal del programador"""
    print("📅 Iniciando Programador de Tareas...")
    current_time = check_and_update_schedule()
    schedule.every().day.at(current_time).do(run_birthday_task)
    print(f"📅 Bot programado para las: {current_time} (Ecuador)")

    last_config_check = time.time()
    
    while True:
        schedule.run_pending()
        
        # Cada 30 segundos revisamos si el usuario cambió la hora en el panel
        if time.time() - last_config_check > 30:
            new_time = check_and_update_schedule()
            if new_time != current_time:
                print(f"🔄 Hora reprogramada: {current_time} -> {new_time}")
                schedule.clear()
                current_time = new_time
                schedule.every().day.at(current_time).do(run_birthday_task)
            last_config_check = time.time()
            
        time.sleep(10)

if __name__ == "__main__":
    print("🚀 --- LUXE AUTOMATION SYSTEM ---")
    
    # Iniciamos la API en un hilo para ahorrar memoria
    api_thread = threading.Thread(target=start_api, daemon=True)
    api_thread.start()
    
    # Iniciamos el programador en el hilo principal
    run_scheduler()

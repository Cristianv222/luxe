
from celery import shared_task
import logging
from datetime import datetime
from .utils import check_and_send_birthday_greetings
from .models import MaytapiConfig

logger = logging.getLogger(__name__)

from django.utils import timezone

@shared_task
def check_scheduled_birthdays():
    """
    Tarea periódica (ej: cada minuto) que verifica si es la hora de enviar las felicitaciones.
    """
    config = MaytapiConfig.objects.first()
    if not config or not config.is_active:
        return "Maytapi inactivo o no configurado."

    # Usar hora local configurada en settings (America/Guayaquil)
    now_local = timezone.localtime(timezone.now())
    current_time = now_local.time().replace(second=0, microsecond=0)
    
    # Comparamos solo HH:MM
    target_time = config.schedule_time.replace(second=0, microsecond=0)
    
    # Simple check: si la hora coincide.
    # OJO: Esto podría ejecutarse varias veces en el mismo minuto si el worker es muy rápido 
    # y la tarea se encola múltiples veces, pero con beat schedule de 60s debería ser seguro.
    # Para mayor seguridad, deberíamos guardar un log de "último envío" en el modelo config.
    
    if current_time.hour == target_time.hour and current_time.minute == target_time.minute:
        logger.info(f"Hora coincidente ({current_time}). Ejecutando envío de cumpleaños.")
        count = check_and_send_birthday_greetings()
        return f"Enviados: {count}"
    
    return f"No es hora todavía. Actual: {current_time}, Programado: {target_time}"


import logging
import requests
from datetime import date
from django.conf import settings
from .models import MaytapiConfig, WhatsAppLog
from apps.customers.models import Customer


from django.utils import timezone

logger = logging.getLogger(__name__)

def normalize_ec_phone(phone):
    """
    Normaliza números de Ecuador para Maytapi.
    Elimina espacios, guiones.
    Si empieza con 09..., reemplaza el 0 por 593.
    """
    if not phone:
        return ""
    
    # Limpiar caracteres no numéricos
    clean_phone = ''.join(filter(str.isdigit, str(phone)))
    
    # Caso: 0991234567 -> 593991234567
    if clean_phone.startswith('09') and len(clean_phone) == 10:
        return '593' + clean_phone[1:]
        
    # Caso: 593099... -> Corregir a 59399... (a veces pasa)
    if clean_phone.startswith('59309'):
        return '593' + clean_phone[4:]

    # Caso: ya tiene 593, dejarlo así
    if clean_phone.startswith('593'):
        return clean_phone

    # Caso: número corto (9 dígitos) sin prefijo, asumir 09... y poner 593
    if len(clean_phone) == 9:
        return '593' + clean_phone
        
    return clean_phone


def check_and_send_birthday_greetings():
    """
    Revisa si hay clientes cumpliendo años hoy y les envía un mensaje vía Maytapi.
    Retorna el número de mensajes enviados.
    """
    config = MaytapiConfig.objects.first()
    if not config or not config.is_active or not config.token or not config.api_url:
        logger.warning("Maytapi no configurado o inactivo. Saltando felicitaciones.")
        return 0

    today = timezone.localtime(timezone.now()).date()
    # Filtrar clientes cuyo cumpleaños es hoy (mes y día coinciden)
    birthday_customers = Customer.objects.filter(
        birth_date__month=today.month,
        birth_date__day=today.day
    )

    if not birthday_customers.exists():
        logger.info("No hay cumpleañeros hoy.")
        return 0

    base_url = config.api_url.rstrip('/')
    # Asumimos que necesitamos el phone_id. Si no, usamos fallback.
    target_url = f"{base_url}/{config.phone_id}/sendMessage" if config.phone_id else f"{base_url}/sendMessage"
    
    headers = {
        'x-maytapi-key': config.token,
        'Content-Type': 'application/json'
    }

    count = 0
    for customer in birthday_customers:
        if not customer.phone:
            continue
            
        # Mensaje personalizado usando template
        template = config.birthday_message_template
        # Fallback simple si el template está vacío
        if not template:
             template = "¡Feliz cumpleaños {name}! 🎉 En Luxe queremos celebrar contigo."
             
        message_text = template.replace("{name}", customer.first_name or "Cliente")

        payload = {
            "to_number": normalize_ec_phone(customer.phone), # Asegurar formato internacional
            "type": "text",
            "message": message_text
        }

        try:
            logger.info(f"Enviando felicitación a {customer.first_name} ({customer.phone})")
            response = requests.post(target_url, json=payload, headers=headers)
            
            status_text = 'sent' if response.status_code in [200, 201, 202] else 'failed'
            
            # Guardar Log
            WhatsAppLog.objects.create(
                phone_number=customer.phone,
                message=message_text,
                message_type='BIRTHDAY',
                status=status_text,
                response_data=response.text
            )

            if response.status_code in [200, 201, 202]:
                count += 1
            else:
                logger.error(f"Fallo envío a {customer.phone}: {response.text}")

        except Exception as e:
            logger.error(f"Error enviando mensaje a cliente {customer.id}: {e}")
            WhatsAppLog.objects.create(
                phone_number=customer.phone,
                message=message_text,
                message_type='BIRTHDAY',
                status='error',
                response_data=str(e)
            )

    logger.info(f"Felicitaciones enviadas hoy: {count}")
    return count

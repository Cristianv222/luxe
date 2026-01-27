
import requests
import json

# Url base interna (desde dentro del contenedor luxe-service, apunta a localhost:8000)
# Pero como ejecutamos script con docker exec, estamos en el contenedor.
# luxe-service corre en gunicorn/uvicorn puerto 8000.
URL = "http://localhost:8000/luxe/api/integrations/maytapi/config/"

# Necesitamos autenticarnos.
# Para simplificar, usaremos un token o login, pero como es debug rápido,
# podemos modificar temporalmente la vista para AllowAny O usar el script python directo.
# Mejor validamos via Python shell invocando el Serializador directamente,
# para evitar problemas de auth en el script de prueba.

import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luxe_service.settings')
django.setup()

from apps.integrations.serializers import MaytapiConfigSerializer
from apps.integrations.models import MaytapiConfig

print("--- Testing Serializer ---")
config = MaytapiConfig.objects.first()
serializer = MaytapiConfigSerializer(config)
print("Serialized Data Keys:", serializer.data.keys())

data = {
    "product_id": config.product_id,
    "token": config.token,
    "schedule_time": "15:00",
    "birthday_message_template": "New Template Test",
    "is_active": True
}

print("\n--- Testing Serializer Update ---")
serializer_update = MaytapiConfigSerializer(config, data=data, partial=True)
if serializer_update.is_valid():
    print("Serializer is Valid.")
    serializer_update.save()
    print("Saved Data:", serializer_update.data)
else:
    print("Serializer Errors:", serializer_update.errors)

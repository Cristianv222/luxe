
import os
import django
import sys
from django.db import connection

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luxe_service.settings')
django.setup()

from apps.integrations.models import MaytapiConfig

print("--- Checking Database Columns ---")
with connection.cursor() as cursor:
    cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'integrations_maytapiconfig'")
    columns = [row[0] for row in cursor.fetchall()]
    print(f"Columns: {columns}")
    
    if 'schedule_time' in columns and 'birthday_message_template' in columns:
        print("✅ New columns exist in DB.")
    else:
        print("❌ New columns MISSING in DB.")

print("\n--- Testing Model Update ---")
try:
    config = MaytapiConfig.objects.first()
    if not config:
        config = MaytapiConfig.objects.create()
    
    print(f"Current Template: {config.birthday_message_template}")
    print(f"Current Time: {config.schedule_time}")
    
    config.birthday_message_template = "Test Message Updated"
    config.schedule_time = "10:30"
    config.save()
    
    config.refresh_from_db()
    print(f"Updated Template: {config.birthday_message_template}")
    print(f"Updated Time: {config.schedule_time}")
    print("✅ Model update successful.")
except Exception as e:
    print(f"❌ Model update failed: {e}")

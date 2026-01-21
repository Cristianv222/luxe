import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luxe_service.settings')
django.setup()

from django.db import connection

cursor = connection.cursor()
cursor.execute("""
    SELECT column_name, is_nullable, data_type 
    FROM information_schema.columns 
    WHERE table_name='orders_order' AND is_nullable='NO' 
    ORDER BY column_name;
""")

print("NOT NULL columns in orders_order:")
for row in cursor.fetchall():
    print(f"  - {row[0]} ({row[2]})")

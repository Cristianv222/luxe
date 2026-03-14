from django.test import Client
from django.contrib.auth import get_user_model
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luxe_service.settings')
django.setup()

User = get_user_model()
admin_user = User.objects.filter(is_superuser=True).first()
if not admin_user:
    admin_user = User.objects.first()

c = Client()
c.force_login(admin_user)

response = c.post('/luxe/api/customers/admin/sync-stats/')
print('Status:', response.status_code)
print('Data:', response.content)

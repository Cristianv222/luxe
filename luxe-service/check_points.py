import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luxe_service.settings')
django.setup()

from apps.customers.models import Customer
for c in Customer.objects.filter(total_spent__gt=100):
   print(c.first_name, c.total_spent, c.loyalty_account.points_balance)

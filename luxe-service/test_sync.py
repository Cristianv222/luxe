import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luxe_service.settings')
django.setup()

from apps.customers.models import Customer

for c in Customer.objects.all():
    bal = c.loyalty_account.points_balance if hasattr(c, 'loyalty_account') else None
    print(f"Customer: {c.first_name}, Spent: {c.total_spent}, Points DB: {bal}")

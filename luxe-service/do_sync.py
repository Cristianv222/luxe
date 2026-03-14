import requests
import json

base_url = "http://localhost:8000"

# 1. Login to get JWT (assuming superuser exists)
# Let's find an admin user in DB
import os
import sys
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luxe_service.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()
admin = User.objects.filter(is_superuser=True).first()
if not admin:
    admin = User.objects.first()

from rest_framework_simplejwt.tokens import RefreshToken
refresh = RefreshToken.for_user(admin)
access_token = str(refresh.access_token)

# 2. Call the endpoint
headers = {"Authorization": f"Bearer {access_token}"}
response = requests.post(f"{base_url}/luxe/api/customers/admin/sync-stats/", headers=headers)

print("Status Code:", response.status_code)
print("Response Body:", response.json())

# 3. Check customer points
from apps.customers.models import Customer
c = Customer.objects.filter(total_spent__gt=100).first()
print(f"Customer {c.first_name} points after sync: {c.loyalty_account.points_balance}")

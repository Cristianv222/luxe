import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luxe_service.settings')
django.setup()

from apps.loyalty.models import EarningRule, EarningRuleType

def check():
    print("Rule Types:")
    for rt in EarningRuleType.objects.all():
        print(f"ID: {rt.id}, Name: {rt.name}, Code: {rt.code}")
    
    print("\nEarning Rules:")
    for r in EarningRule.objects.all():
        print(f"ID: {r.id}, Name: {r.name}, Type: {r.rule_type.code if r.rule_type else 'None'}, Active: {r.is_active}")

if __name__ == '__main__':
    check()

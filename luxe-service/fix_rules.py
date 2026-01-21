import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luxe_service.settings')
django.setup()

from apps.loyalty.models import EarningRule, EarningRuleType

def fix_orphaned_rules():
    print("Checking for rules without type...")
    orphans = EarningRule.objects.filter(rule_type__isnull=True)
    count = orphans.count()
    print(f"Found {count} orphaned rules.")
    
    if count > 0:
        # Default to PER_AMOUNT
        per_amount = EarningRuleType.objects.get(code='PER_AMOUNT')
        updated = orphans.update(rule_type=per_amount)
        print(f"Updated {updated} rules to PER_AMOUNT type.")
    
    # Verify active rules
    active = EarningRule.objects.filter(is_active=True).count()
    print(f"Total active rules: {active}")

if __name__ == '__main__':
    fix_orphaned_rules()

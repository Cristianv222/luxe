import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luxe_service.settings')
django.setup()

from apps.loyalty.models import EarningRule, EarningRuleType, LoyaltyProgramConfig

def fix():
    # 1. Ensure Config is Active
    config = LoyaltyProgramConfig.objects.first()
    if config:
        config.is_active = True
        config.save()
        print(f"Config {config.name} set to ACTIVE.")
    
    # 2. Ensure Types exist
    per_amount, _ = EarningRuleType.objects.get_or_create(code='PER_AMOUNT', defaults={'name': 'Por Monto', 'is_active': True})
    fixed, _ = EarningRuleType.objects.get_or_create(code='FIXED_MIN_ORDER', defaults={'name': 'Monto Fijo', 'is_active': True})
    print("Standard types PER_AMOUNT and FIXED_MIN_ORDER ensured.")

    # 3. Fix existing rules that might have wrong type codes
    rules = EarningRule.objects.all()
    for rule in rules:
        if rule.rule_type:
            code = rule.rule_type.code
            if code not in ['PER_AMOUNT', 'FIXED_MIN_ORDER']:
                print(f"Rule {rule.name} has weird code {code}. Resetting type to PER_AMOUNT.")
                rule.rule_type = per_amount
                rule.save()
        else:
            print(f"Rule {rule.name} has NO type. Setting to PER_AMOUNT.")
            rule.rule_type = per_amount
            rule.save()

if __name__ == '__main__':
    fix()

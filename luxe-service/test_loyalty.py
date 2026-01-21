import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luxe_service.settings')
django.setup()

from apps.loyalty.models import EarningRule, LoyaltyProgramConfig, EarningRuleType
from apps.loyalty.services import LoyaltyService

def test():
    config = LoyaltyProgramConfig.objects.first()
    print(f"Config: {config.name if config else 'None'}, Active: {config.is_active if config else 'N/A'}")
    
    active_rules = EarningRule.objects.filter(is_active=True)
    print(f"Active Rules Count: {active_rules.count()}")
    for rule in active_rules:
        print(f"- Rule: {rule.name}, Type: {rule.rule_type.code if rule.rule_type else 'None'}, Min: {rule.min_order_value}, Points: {rule.points_to_award}")
        
    amount = 50.0
    points = LoyaltyService.calculate_points_to_earn(amount)
    print(f"Points for ${amount}: {points}")

if __name__ == '__main__':
    test()

import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luxe_service.settings')
django.setup()

from apps.loyalty.models import EarningRule, EarningRuleType, LoyaltyProgramConfig

def seed():
    print("Seeding Loyalty Data...")
    
    # 1. Config
    if not LoyaltyProgramConfig.objects.exists():
        LoyaltyProgramConfig.objects.create(name="Programa de Fidelidad Luxe")
        print("Created default config")
        
    # 2. Rule Types
    per_amount, _ = EarningRuleType.objects.get_or_create(
        code='PER_AMOUNT',
        defaults={
            'name': 'Por Monto de Compra',
            'description': 'Gana X puntos por cada $Y gastados',
            'is_active': True
        }
    )
    
    fixed, _ = EarningRuleType.objects.get_or_create(
        code='FIXED_MIN_ORDER',
        defaults={
            'name': 'Fijo por Compra Mínima',
            'description': 'Gana X puntos si la compra supera $Y',
            'is_active': True
        }
    )
    print("Ensured Rule Types exist")
    
    # 3. Default Rule: 1 point per $10
    if not EarningRule.objects.exists():
        EarningRule.objects.create(
            name='Puntos Base (1 por cada $10)',
            rule_type=per_amount,
            min_order_value=0,
            amount_step=10.00,
            points_to_award=1,
            is_active=True
        )
        print("Created default rule: 1 point per $10")
    else:
        print("Rules already exist, skipping creation")

if __name__ == '__main__':
    seed()

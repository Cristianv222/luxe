from django.db import transaction
from django.core.exceptions import ObjectDoesNotExist
from .models import EarningRule, LoyaltyAccount, PointTransaction, LoyaltyProgramConfig

class LoyaltyService:
    @staticmethod
    def calculate_points_to_earn(amount):
        """
        Calcula los puntos que se ganarían por un monto dado,
        basado en las reglas activas.
        """
        config = LoyaltyProgramConfig.objects.first()
        if config and not config.is_active:
            return 0

        # Basic validation
        try:
            amount = float(amount)
        except (ValueError, TypeError):
            return 0
            
        points_to_earn = 0
        active_rules = EarningRule.objects.filter(is_active=True)
        
        # Logic change: 
        # For FIXED_MIN_ORDER: Only award the rule with the highest min_order_value satisfied.
        # For PER_AMOUNT: Additive (usually base points). 
        # If user intended PER_AMOUNT to also be exclusive with FIXED, that's complex, 
        # but the example given was clearly about tiered fixed rewards (5vs30).
        
        fixed_rules_matched = []
        
        for rule in active_rules:
            if amount >= float(rule.min_order_value):
                # Check for None just in case
                if not rule.rule_type:
                    continue
                    
                code = rule.rule_type.code
                
                if code == 'FIXED_MIN_ORDER':
                    fixed_rules_matched.append(rule)
                elif code == 'PER_AMOUNT':
                    step = float(rule.amount_step) if rule.amount_step else 1.0
                    if step > 0:
                        multiplier = int(amount / step)
                        points_to_earn += (multiplier * rule.points_to_award)

        # Process Fixed Rules: Pick only the one with highest min_order_value
        if fixed_rules_matched:
            # Sort by min_order_value descending
            fixed_rules_matched.sort(key=lambda r: r.min_order_value, reverse=True)
            best_rule = fixed_rules_matched[0]
            points_to_earn += best_rule.points_to_award
        
        return points_to_earn

    @staticmethod
    def award_points_for_order(order):
        """
        Otorga puntos a un usuario cuando una orden es pagada.
        """
        if not order.customer:
            return  # No customer linked
            
        # Check if points already awarded for this order
        if PointTransaction.objects.filter(related_order_id=str(order.id), transaction_type='EARN').exists():
            return

        points_to_earn = LoyaltyService.calculate_points_to_earn(order.total)
        
        if points_to_earn <= 0:
            return

        with transaction.atomic():
            # Get or Create Loyalty Account linked to Customer
            account, created = LoyaltyAccount.objects.get_or_create(customer=order.customer)
            
            # Update balance
            account.points_balance += points_to_earn
            account.total_points_earned += points_to_earn
            account.save()
            
            # Record transaction
            PointTransaction.objects.create(
                account=account,
                transaction_type='EARN',
                points=points_to_earn,
                description=f"Ganancia por Orden #{order.order_number}",
                related_order_id=str(order.id)
            )

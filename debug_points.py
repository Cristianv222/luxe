from apps.loyalty.services import LoyaltyService
from apps.loyalty.models import EarningRule
from decimal import Decimal

print("Active Rules:")
for r in EarningRule.objects.filter(is_active=True):
    code = r.rule_type.code if r.rule_type else "None"
    print(f"ID: {r.id}, Name: {r.name}, Code: '{code}', Min: {r.min_order_value}, Step: {r.amount_step}, Pts: {r.points_to_award}")

amount = 3.00
print(f"\nCalculating for {amount}...")
points_to_earn = 0
active_rules = EarningRule.objects.filter(is_active=True)
fixed_rules_matched = []

for rule in active_rules:
    val = float(rule.min_order_value)
    print(f"Checking Rule {rule.name}: {amount} >= {val}?")
    if amount >= val:
        if not rule.rule_type:
            print("  No rule type")
            continue
            
        code = rule.rule_type.code
        print(f"  Code: '{code}'")
        
        if code == 'FIXED_MIN_ORDER':
            print("  Matched FIXED")
            fixed_rules_matched.append(rule)
        elif code == 'PER_AMOUNT':
            step = float(rule.amount_step) if rule.amount_step else 1.0
            print(f"  Matched PER_AMOUNT. Step: {step}")
            if step > 0:
                multiplier = int(amount / step)
                added = (multiplier * rule.points_to_award)
                print(f"    Adding {added}")
                points_to_earn += added
        else:
             print("  Code did not match IFs")

if fixed_rules_matched:
    fixed_rules_matched.sort(key=lambda r: r.min_order_value, reverse=True)
    best_rule = fixed_rules_matched[0]
    print(f"  Best Fixed Rule: {best_rule.name} (+{best_rule.points_to_award})")
    points_to_earn += best_rule.points_to_award

print(f"Total: {points_to_earn}")

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luxe_service.settings')
django.setup()

from apps.orders.models import Order
from apps.loyalty.services import LoyaltyService
from apps.loyalty.models import PointTransaction

def test_award():
    # 1. Clear previous transactions to re-test if needed (optional)
    # PointTransaction.objects.all().delete()
    
    # 2. Find orders that SHOULD have points but don't
    orders = Order.objects.filter(payment_status='paid', customer__isnull=False)
    print(f"Found {orders.count()} paid orders with customers.")
    
    for order in orders:
        print(f"\n--- Processing Order {order.order_number} (Total: {order.total}) ---")
        LoyaltyService.award_points_for_order(order)
        
        # Verify
        tx = PointTransaction.objects.filter(related_order_id=str(order.id)).first()
        if tx:
            print(f"SUCCESS: Awarded {tx.points} points.")
        else:
            print("FAILED: No points awarded.")

if __name__ == '__main__':
    test_award()

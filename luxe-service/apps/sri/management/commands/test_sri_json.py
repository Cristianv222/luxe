from django.core.management.base import BaseCommand
from apps.orders.models import Order
from apps.sri.services import SRIIntegrationService
import json

class Command(BaseCommand):
    help = 'Test SRI JSON generation for a specific order'

    def add_arguments(self, parser):
        parser.add_argument('order_number', type=str, help='Order number to test')

    def handle(self, *args, **options):
        order_number = options['order_number']
        try:
            order = Order.objects.get(order_number=order_number)
            self.stdout.write(f"Testing SRI JSON for order: {order.order_number}")
            
            # Use a mock or inspect internal method if we don't want to actually send
            # However, emit_invoice DOES send.
            # We will Monkey Patch the requests.post to avoid actual sending and just print the payload
            
            import requests
            from unittest.mock import MagicMock
            
            # Capture the payload
            captured_payload = {}
            
            def mock_post(url, json=None, **kwargs):
                nonlocal captured_payload
                captured_payload = json
                mock_response = MagicMock()
                mock_response.status_code = 200
                mock_response.json.return_value = {
                    'success': True,
                    'invoice': {'status': 'MOCK_TEST', 'number': '000-000-000000000'}
                }
                return mock_response
            
            # Monkey patch
            original_post = requests.post
            requests.post = mock_post
            
            try:
                SRIIntegrationService.emit_invoice(order)
                
                self.stdout.write(self.style.SUCCESS('✅ Successfully generated payload:'))
                self.stdout.write(json.dumps(captured_payload, indent=2, ensure_ascii=False))
                
                # Check critical fields
                items = captured_payload.get('items', [])
                if items:
                    self.stdout.write(f"\nItems count: {len(items)}")
                    self.stdout.write(f"First item price: {items[0]['unit_price']}")
                    self.stdout.write(f"First item taxes: {items[0]['taxes']}")
                
                payments = captured_payload.get('payments', [])
                if payments:
                    self.stdout.write(f"\nPayments: {json.dumps(payments, indent=2)}")
                else:
                    self.stdout.write(self.style.WARNING("\n⚠️ No 'payments' field found in payload!"))
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error generation: {str(e)}"))
            finally:
                # Restore
                requests.post = original_post
                
        except Order.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Order {order_number} not found"))
